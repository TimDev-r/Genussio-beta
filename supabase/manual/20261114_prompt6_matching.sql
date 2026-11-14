-- Genussio prompt 6: matching, "Mehr Karten", favorites, deck refresh fix
-- Run once in Supabase → SQL Editor (replaces the step 5b SQL; safe to run again).
-- Kept outside supabase/migrations on purpose: that folder belongs to Lovable.
--
-- What's in here
--   household_allergen_labels  allergy keys of all members (milk, nuts …) → recipe labels
--   deck_candidates            the one filter + cost rule set used by every deck function
--   generate_deck              same as before, now built on deck_candidates;
--                              'favorite' = matched in one of the last 8 weeks
--   add_cards                  "Mehr Karten": adds up to N fitting cards
--   get_matches                matched recipes of a week (only cards still in the deck)
--   refresh_deck               settings changed → rebuild, or drop unfit cards and refill
--                              (fixes step 5b: allergy keys are now mapped to labels)

BEGIN;

ALTER TABLE public.households ADD COLUMN IF NOT EXISTS deck_adjusted_at timestamptz;

-- ── Allergies: member keys → lower-case recipe labels ────────────────────────
CREATE OR REPLACE FUNCTION public.household_allergen_labels(p_household_id uuid)
RETURNS text[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH k AS (
    SELECT DISTINCT lower(a) AS a
    FROM household_members m, unnest(m.allergies) a
    WHERE m.household_id = p_household_id
  )
  SELECT coalesce(array_agg(DISTINCT x), '{}')
  FROM k, LATERAL (VALUES (k.a), (lower(CASE k.a
    WHEN 'gluten' THEN 'Gluten' WHEN 'crustaceans' THEN 'Krebstiere' WHEN 'eggs' THEN 'Eier'
    WHEN 'fish' THEN 'Fisch' WHEN 'peanuts' THEN 'Erdnüsse' WHEN 'soy' THEN 'Soja'
    WHEN 'milk' THEN 'Milch/Laktose' WHEN 'nuts' THEN 'Schalenfrüchte' WHEN 'celery' THEN 'Sellerie'
    WHEN 'mustard' THEN 'Senf' WHEN 'sesame' THEN 'Sesam' WHEN 'sulphites' THEN 'Sulfite'
    WHEN 'lupin' THEN 'Lupinen' WHEN 'molluscs' THEN 'Weichtiere' ELSE k.a END))) v(x);
$$;

-- ── Matches (internal, no permission check) ──────────────────────────────────
CREATE OR REPLACE FUNCTION public._match_rows(p_household_id uuid, p_week_start date)
RETURNS TABLE(recipe_id uuid, like_count int, super_count int, voter_count int, likers text[])
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH n AS (
    SELECT count(*)::int AS members FROM household_members WHERE household_id = p_household_id
  ), v AS (
    SELECT s.recipe_id,
      count(*)::int AS voters,
      (count(*) FILTER (WHERE s.vote IN ('like','super')))::int AS likes,
      (count(*) FILTER (WHERE s.vote = 'super'))::int AS supers,
      array_agg(coalesce(nullif(m.display_name, ''), p.display_name, '?') ORDER BY m.created_at)
        FILTER (WHERE s.vote IN ('like','super')) AS names
    FROM swipes s
    JOIN household_members m ON m.id = s.member_id
    LEFT JOIN profiles p ON p.id = m.user_id
    WHERE s.household_id = p_household_id AND s.week_start = p_week_start
      AND EXISTS (SELECT 1 FROM deck_items d
                  WHERE d.household_id = p_household_id AND d.week_start = p_week_start
                    AND d.recipe_id = s.recipe_id)
    GROUP BY s.recipe_id
  )
  SELECT v.recipe_id, v.likes, v.supers, v.voters, v.names
  FROM v, n
  WHERE (n.members <= 1 AND v.likes >= 1)
     OR (n.members = 2 AND v.likes >= 2)
     OR (n.members >= 3 AND v.likes >= 2 AND v.likes * 2 > v.voters);
$$;

-- ── Candidates: the single source of the deck rules ──────────────────────────
CREATE OR REPLACE FUNCTION public.deck_candidates(p_household_id uuid, p_week_start date)
RETURNS TABLE(rid uuid, cost numeric, deals int, fav boolean, is_new boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
DECLARE v_hh households%ROWTYPE; v_allergens text[]; v_dislikes text[]; v_need_veg boolean; v_need_vegan boolean;
BEGIN
  SELECT * INTO v_hh FROM households h WHERE h.id = p_household_id;
  IF NOT FOUND THEN RETURN; END IF;
  v_allergens := household_allergen_labels(p_household_id);
  SELECT coalesce(array_agg(DISTINCT lower(trim(x))) FILTER (WHERE trim(x) <> ''), '{}') INTO v_dislikes
    FROM household_members m, unnest(m.dislikes) x WHERE m.household_id = p_household_id;
  SELECT bool_or(m.diet IN ('vegetarisch','vegan')), bool_or(m.diet = 'vegan') INTO v_need_veg, v_need_vegan
    FROM household_members m WHERE m.household_id = p_household_id;

  RETURN QUERY
  WITH cands AS (
    SELECT r.* FROM recipes r
    WHERE r.active
      AND NOT EXISTS (SELECT 1 FROM unnest(r.allergens) a WHERE lower(a) = ANY (v_allergens))
      AND (NOT coalesce(v_need_vegan,false) OR 'vegan' = ANY (r.diet_tags))
      AND (NOT coalesce(v_need_veg,false) OR r.diet_tags && ARRAY['vegetarisch','vegan'])
      AND r.prep_minutes IS NOT NULL AND r.prep_minutes <= v_hh.max_cook_minutes
      AND NOT EXISTS (SELECT 1 FROM recipe_ingredients ri, unnest(v_dislikes) dl WHERE ri.recipe_id = r.id
            AND (lower(coalesce(ri.display_name,'')) LIKE '%' || dl || '%' OR lower(ri.ingredient_key) LIKE '%' || dl || '%'))
      AND NOT EXISTS (SELECT 1 FROM meal_plan_entries mp WHERE mp.household_id = p_household_id
            AND mp.recipe_id = r.id AND mp.week_start = p_week_start - 7)
  ), ing AS (
    SELECT ri.recipe_id,
      (SELECT min(dd.deal_price / nullif(dd.package_quantity,0) * ri.quantity) FROM deals dd
        WHERE dd.ingredient_key = ri.ingredient_key AND dd.store = ANY (v_hh.stores)
          AND dd.valid_from <= p_week_start + 6 AND dd.valid_to >= p_week_start) AS deal_cost,
      (SELECT min(ip.price / nullif(ip.per_quantity,0) * ri.quantity) FROM ingredient_prices ip
        WHERE ip.ingredient_key = ri.ingredient_key AND ip.store = ANY (v_hh.stores)) AS reg_cost
    FROM recipe_ingredients ri JOIN cands c ON c.id = ri.recipe_id WHERE NOT ri.is_pantry
  ), favs AS (
    SELECT DISTINCT mr.recipe_id
    FROM generate_series(1, 8) w, LATERAL _match_rows(p_household_id, p_week_start - 7 * w) mr
  )
  SELECT c.id,
    round(coalesce((SELECT sum(coalesce(i.deal_cost, i.reg_cost, 0)) FROM ing i WHERE i.recipe_id = c.id), 0)
          / greatest(c.base_servings, 1), 2),
    (SELECT count(*) FROM ing i WHERE i.recipe_id = c.id AND i.deal_cost IS NOT NULL)::int,
    EXISTS (SELECT 1 FROM favs f WHERE f.recipe_id = c.id),
    NOT EXISTS (SELECT 1 FROM deck_items d WHERE d.household_id = p_household_id AND d.recipe_id = c.id)
  FROM cands c;
END $fn$;

-- ── Build a fresh deck (internal) ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public._build_deck(p_household_id uuid, p_week_start date)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_household_id::text || p_week_start::text, 0));
  IF EXISTS (SELECT 1 FROM deck_items d WHERE d.household_id = p_household_id AND d.week_start = p_week_start) THEN
    RETURN;
  END IF;
  DROP TABLE IF EXISTS _cand;
  CREATE TEMP TABLE _cand ON COMMIT DROP AS
    SELECT c.rid, c.cost, c.deals, c.fav, c.is_new, NULL::text AS src FROM deck_candidates(p_household_id, p_week_start) c;

  UPDATE _cand SET src = 'deal' WHERE rid IN (SELECT rid FROM _cand WHERE deals >= 1 ORDER BY deals DESC, cost, rid LIMIT 12);
  UPDATE _cand SET src = 'favorite' WHERE rid IN (SELECT rid FROM _cand WHERE src IS NULL AND fav ORDER BY random() LIMIT 4);
  UPDATE _cand SET src = 'new' WHERE rid IN (SELECT rid FROM _cand WHERE src IS NULL AND is_new ORDER BY random() LIMIT 4);
  UPDATE _cand SET src = CASE WHEN deals >= 1 THEN 'deal' WHEN fav THEN 'favorite' ELSE 'new' END
    WHERE rid IN (SELECT rid FROM _cand WHERE src IS NULL ORDER BY cost, rid
                  LIMIT greatest(0, 20 - (SELECT count(*) FROM _cand WHERE src IS NOT NULL))::int);

  INSERT INTO deck_items(household_id, week_start, recipe_id, position, est_cost_per_portion, deal_count, source)
  SELECT p_household_id, p_week_start, rid, (row_number() OVER (ORDER BY random()))::int, cost, deals, src
  FROM _cand WHERE src IS NOT NULL;
  DROP TABLE IF EXISTS _cand;
END $fn$;

-- ── Add more cards (internal) ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public._add_cards(p_household_id uuid, p_week_start date, p_count int)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE v_max int; v_added int;
BEGIN
  IF coalesce(p_count, 0) <= 0 THEN RETURN 0; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_household_id::text || p_week_start::text, 0));
  SELECT coalesce(max(position), 0) INTO v_max FROM deck_items
    WHERE household_id = p_household_id AND week_start = p_week_start;
  INSERT INTO deck_items(household_id, week_start, recipe_id, position, est_cost_per_portion, deal_count, source)
  SELECT p_household_id, p_week_start, c.rid, v_max + (row_number() OVER (ORDER BY c.deals >= 1 DESC, c.fav DESC, c.cost, c.rid))::int,
         c.cost, c.deals, CASE WHEN c.deals >= 1 THEN 'deal' WHEN c.fav THEN 'favorite' ELSE 'new' END
  FROM deck_candidates(p_household_id, p_week_start) c
  WHERE NOT EXISTS (SELECT 1 FROM deck_items d WHERE d.household_id = p_household_id
                      AND d.week_start = p_week_start AND d.recipe_id = c.rid)
  ORDER BY c.deals >= 1 DESC, c.fav DESC, c.cost, c.rid
  LIMIT p_count;
  GET DIAGNOSTICS v_added = ROW_COUNT;
  RETURN v_added;
END $fn$;

-- ── Public: generate_deck (same signature and result as before) ──────────────
CREATE OR REPLACE FUNCTION public.generate_deck(p_household_id uuid, p_week_start date)
RETURNS TABLE(id uuid, recipe_id uuid, "position" integer, est_cost_per_portion numeric, deal_count integer, source text,
  title text, description text, image_url text, prep_minutes integer, base_servings integer, diet_tags text[], allergens text[])
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $fn$
BEGIN
  IF p_household_id IS NULL OR p_week_start IS NULL OR NOT is_member(p_household_id) THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501'; END IF;
  PERFORM _build_deck(p_household_id, p_week_start);
  RETURN QUERY SELECT d.id, d.recipe_id, d.position, d.est_cost_per_portion, d.deal_count, d.source,
    r.title, r.description, r.image_url, r.prep_minutes, r.base_servings, r.diet_tags, r.allergens
  FROM deck_items d JOIN recipes r ON r.id = d.recipe_id
  WHERE d.household_id = p_household_id AND d.week_start = p_week_start ORDER BY d.position;
END $fn$;

-- ── Public: add_cards ("Mehr Karten") ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.add_cards(p_household_id uuid, p_week_start date, p_count int DEFAULT 10)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  IF p_household_id IS NULL OR p_week_start IS NULL OR NOT is_member(p_household_id) THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501'; END IF;
  RETURN _add_cards(p_household_id, p_week_start, least(greatest(coalesce(p_count, 10), 0), 20));
END $fn$;

-- ── Public: get_matches ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_matches(p_household_id uuid, p_week_start date)
RETURNS TABLE(recipe_id uuid, like_count int, super_count int, likers text[], is_favorite boolean,
  title text, description text, image_url text, prep_minutes int, est_cost_per_portion numeric, deal_count int)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  IF p_household_id IS NULL OR p_week_start IS NULL OR NOT is_member(p_household_id) THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501'; END IF;
  RETURN QUERY
  SELECT m.recipe_id, m.like_count, m.super_count, m.likers, m.super_count > 0,
         r.title, r.description, r.image_url, r.prep_minutes, d.est_cost_per_portion, d.deal_count
  FROM _match_rows(p_household_id, p_week_start) m
  JOIN recipes r ON r.id = m.recipe_id
  JOIN deck_items d ON d.household_id = p_household_id AND d.week_start = p_week_start AND d.recipe_id = m.recipe_id
  ORDER BY m.super_count DESC, d.deal_count DESC, d.est_cost_per_portion NULLS LAST;
END $fn$;

-- ── refresh_deck: settings changed ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.refresh_deck(p_household_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE v_week date := current_week_start(); v_left int;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM deck_items WHERE household_id = p_household_id AND week_start = v_week) THEN
    RETURN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM swipes WHERE household_id = p_household_id AND week_start = v_week) THEN
    -- nobody swiped yet → rebuild from scratch
    DELETE FROM deck_items WHERE household_id = p_household_id AND week_start = v_week;
    BEGIN
      PERFORM _build_deck(p_household_id, v_week);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'refresh_deck: rebuild failed for %: %', p_household_id, SQLERRM;
    END;
  ELSE
    -- swipes exist → keep them, drop every card/plan entry that no longer fits, refill
    CREATE TEMP TABLE IF NOT EXISTS _fit(rid uuid) ON COMMIT DROP;
    TRUNCATE _fit;
    INSERT INTO _fit SELECT c.rid FROM deck_candidates(p_household_id, v_week) c;

    DELETE FROM deck_items d
    WHERE d.household_id = p_household_id AND d.week_start = v_week
      AND NOT EXISTS (SELECT 1 FROM _fit f WHERE f.rid = d.recipe_id);
    DELETE FROM meal_plan_entries e
    WHERE e.household_id = p_household_id AND e.week_start = v_week AND e.recipe_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM _fit f WHERE f.rid = e.recipe_id);

    SELECT count(*) INTO v_left FROM deck_items WHERE household_id = p_household_id AND week_start = v_week;
    BEGIN
      PERFORM _add_cards(p_household_id, v_week, greatest(0, 20 - v_left));
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'refresh_deck: refill failed for %: %', p_household_id, SQLERRM;
    END;
  END IF;

  UPDATE households SET deck_adjusted_at = now() WHERE id = p_household_id;
END $fn$;

-- Triggers (same as step 5b)
CREATE OR REPLACE FUNCTION public.members_changed_refresh_deck()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM refresh_deck(OLD.household_id);
    RETURN OLD;
  END IF;
  IF TG_OP = 'INSERT'
     OR NEW.diet IS DISTINCT FROM OLD.diet
     OR NEW.allergies IS DISTINCT FROM OLD.allergies
     OR NEW.dislikes IS DISTINCT FROM OLD.dislikes THEN
    PERFORM refresh_deck(NEW.household_id);
  END IF;
  RETURN NEW;
END $fn$;

CREATE OR REPLACE FUNCTION public.household_changed_refresh_deck()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  IF NEW.stores IS DISTINCT FROM OLD.stores OR NEW.max_cook_minutes IS DISTINCT FROM OLD.max_cook_minutes THEN
    PERFORM refresh_deck(NEW.id);
  END IF;
  RETURN NEW;
END $fn$;

DROP TRIGGER IF EXISTS household_members_refresh_deck ON public.household_members;
CREATE TRIGGER household_members_refresh_deck
  AFTER INSERT OR UPDATE OR DELETE ON public.household_members
  FOR EACH ROW EXECUTE FUNCTION public.members_changed_refresh_deck();
DROP TRIGGER IF EXISTS households_refresh_deck ON public.households;
CREATE TRIGGER households_refresh_deck
  AFTER UPDATE OF stores, max_cook_minutes ON public.households
  FOR EACH ROW EXECUTE FUNCTION public.household_changed_refresh_deck();

-- ── Permissions: internal helpers are not callable from the app ──────────────
REVOKE ALL ON FUNCTION public.household_allergen_labels(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._match_rows(uuid, date) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.deck_candidates(uuid, date) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._build_deck(uuid, date) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._add_cards(uuid, date, int) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refresh_deck(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.members_changed_refresh_deck() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.household_changed_refresh_deck() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.generate_deck(uuid, date) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.add_cards(uuid, date, int) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_matches(uuid, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_deck(uuid, date), public.add_cards(uuid, date, int),
  public.get_matches(uuid, date) TO authenticated;

-- Realtime for the deck so other phones see added/removed cards
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
                 WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'deck_items') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.deck_items;
  END IF;
END $$;

COMMIT;
