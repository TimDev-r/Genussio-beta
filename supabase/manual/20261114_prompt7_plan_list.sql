-- Genussio prompt 7: weekly plan and shared shopping list
-- Run once in Supabase → SQL Editor, AFTER 20261114_prompt6_matching.sql. Safe to run again.
--
-- What's in here
--   shopping_list_items      + quantity, unit, is_pantry columns (the app formats "1,2 kg")
--   create_plan              matches → dinners on consecutive days from a start date
--   build_shopping_list      plan → one list per store, deals first, keeps ticks and custom items
--   plan triggers            every plan change rebuilds the list automatically
--   refresh_deck             a planned dinner that no longer fits the settings now leaves an
--                            empty day ("Tauschen") instead of disappearing

BEGIN;

ALTER TABLE public.shopping_list_items
  ADD COLUMN IF NOT EXISTS quantity numeric,
  ADD COLUMN IF NOT EXISTS unit text,
  ADD COLUMN IF NOT EXISTS is_pantry boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS meal_plan_entries_plan_date_idx
  ON public.meal_plan_entries (household_id, week_start, plan_date);

-- ── Shopping list (internal) ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public._build_shopping_list(p_household_id uuid, p_week_start date)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE v_stores text[]; v_from date; v_to date; v_main text;
BEGIN
  SELECT stores INTO v_stores FROM households WHERE id = p_household_id;
  IF NOT FOUND THEN RETURN; END IF;  -- household is being deleted
  PERFORM pg_advisory_xact_lock(hashtextextended('list' || p_household_id::text || p_week_start::text, 0));

  SELECT coalesce(min(plan_date), p_week_start), coalesce(max(plan_date), p_week_start + 6)
    INTO v_from, v_to
    FROM meal_plan_entries WHERE household_id = p_household_id AND week_start = p_week_start;

  DROP TABLE IF EXISTS _need;
  CREATE TEMP TABLE _need ON COMMIT DROP AS
  SELECT ri.ingredient_key,
         coalesce(ri.unit, '') AS unit,
         ri.is_pantry,
         min(ri.display_name) AS display_name,
         min(ri.aisle) AS aisle,
         round(sum(ri.quantity * coalesce(e.servings, r.base_servings)::numeric / greatest(r.base_servings, 1)), 1) AS quantity,
         NULL::text AS store, false AS is_deal, NULL::numeric AS deal_price, NULL::numeric AS est_price
  FROM meal_plan_entries e
  JOIN recipes r ON r.id = e.recipe_id
  JOIN recipe_ingredients ri ON ri.recipe_id = r.id
  WHERE e.household_id = p_household_id AND e.week_start = p_week_start
    AND e.recipe_id IS NOT NULL AND NOT e.is_leftover_day
  GROUP BY ri.ingredient_key, coalesce(ri.unit, ''), ri.is_pantry;

  -- Deals: cheapest valid deal at one of the household's stores while the plan runs
  WITH best AS (
    SELECT DISTINCT ON (n.ingredient_key) n.ingredient_key, dd.store, dd.deal_price, dd.package_quantity
    FROM _need n
    JOIN deals dd ON dd.ingredient_key = n.ingredient_key AND dd.store = ANY (v_stores)
      AND dd.valid_from <= v_to AND dd.valid_to >= v_from AND dd.deal_price IS NOT NULL
    WHERE NOT n.is_pantry
    ORDER BY n.ingredient_key, dd.deal_price / nullif(dd.package_quantity, 0) NULLS LAST, dd.store
  )
  UPDATE _need n SET store = b.store, is_deal = true, deal_price = b.deal_price,
    est_price = round(greatest(ceil(n.quantity / nullif(b.package_quantity, 0)), 1) * b.deal_price, 2)
  FROM best b
  WHERE b.ingredient_key = n.ingredient_key AND NOT n.is_pantry;

  -- Main store: the chosen store with the most deals in this plan (else the first chosen store)
  SELECT coalesce(
    (SELECT store FROM _need WHERE is_deal GROUP BY store ORDER BY count(*) DESC, store LIMIT 1),
    v_stores[1]) INTO v_main;

  UPDATE _need n SET store = v_main,
    est_price = (SELECT round(ip.price / nullif(ip.per_quantity, 0) * n.quantity, 2)
                 FROM ingredient_prices ip
                 WHERE ip.ingredient_key = n.ingredient_key
                 ORDER BY ip.store = v_main DESC, ip.price / nullif(ip.per_quantity, 0)
                 LIMIT 1)
  WHERE NOT n.is_pantry AND NOT n.is_deal;

  -- Merge into the existing list: keep ticks and custom items
  UPDATE shopping_list_items s SET
    store = n.store, display_name = n.display_name, aisle = n.aisle, quantity = n.quantity,
    quantity_text = trim(to_char(n.quantity, 'FM999999990.##') || ' ' || n.unit),
    is_deal = n.is_deal, deal_price = n.deal_price, est_price = n.est_price
  FROM _need n
  WHERE s.household_id = p_household_id AND s.week_start = p_week_start AND NOT s.is_custom
    AND s.ingredient_key = n.ingredient_key AND coalesce(s.unit, '') = n.unit AND s.is_pantry = n.is_pantry;

  DELETE FROM shopping_list_items s
  WHERE s.household_id = p_household_id AND s.week_start = p_week_start AND NOT s.is_custom
    AND NOT EXISTS (SELECT 1 FROM _need n WHERE s.ingredient_key = n.ingredient_key
                      AND coalesce(s.unit, '') = n.unit AND s.is_pantry = n.is_pantry);

  INSERT INTO shopping_list_items(household_id, week_start, store, ingredient_key, display_name,
    quantity, unit, quantity_text, aisle, is_deal, deal_price, est_price, is_pantry, is_custom)
  SELECT p_household_id, p_week_start, CASE WHEN n.is_pantry THEN NULL ELSE n.store END, n.ingredient_key,
    n.display_name, n.quantity, nullif(n.unit, ''),
    trim(to_char(n.quantity, 'FM999999990.##') || ' ' || n.unit),
    n.aisle, n.is_deal, n.deal_price, n.est_price, n.is_pantry, false
  FROM _need n
  WHERE NOT EXISTS (SELECT 1 FROM shopping_list_items s
                    WHERE s.household_id = p_household_id AND s.week_start = p_week_start AND NOT s.is_custom
                      AND s.ingredient_key = n.ingredient_key AND coalesce(s.unit, '') = n.unit
                      AND s.is_pantry = n.is_pantry);
  DROP TABLE IF EXISTS _need;
END $fn$;

CREATE OR REPLACE FUNCTION public.build_shopping_list(p_household_id uuid, p_week_start date)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  IF p_household_id IS NULL OR p_week_start IS NULL OR NOT is_member(p_household_id) THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501'; END IF;
  PERFORM _build_shopping_list(p_household_id, p_week_start);
END $fn$;

-- ── create_plan ──────────────────────────────────────────────────────────────
-- Picks dinners_per_week matches: super-likes first, then most deals, then cheapest.
-- Fills consecutive days from p_start_date, never the same main ingredient two days in a row,
-- long recipes (> 40 min) preferably on Saturday/Sunday. Raises 'plan_exists' unless p_replace.
CREATE OR REPLACE FUNCTION public.create_plan(p_household_id uuid, p_week_start date, p_start_date date,
  p_replace boolean DEFAULT false)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_n int; v_servings int; v_day date; v_prev text; v_pick record; v_count int := 0; v_weekend boolean;
BEGIN
  IF p_household_id IS NULL OR p_week_start IS NULL OR p_start_date IS NULL OR NOT is_member(p_household_id) THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('plan' || p_household_id::text || p_week_start::text, 0));

  IF EXISTS (SELECT 1 FROM meal_plan_entries WHERE household_id = p_household_id AND week_start = p_week_start) THEN
    IF NOT coalesce(p_replace, false) THEN
      RAISE EXCEPTION 'plan_exists' USING ERRCODE = 'P0001';
    END IF;
    -- skip the list rebuild for the delete, so ticks on items that stay are kept
    PERFORM set_config('genussio.skip_list_rebuild', 'on', true);
    DELETE FROM meal_plan_entries WHERE household_id = p_household_id AND week_start = p_week_start;
    PERFORM set_config('genussio.skip_list_rebuild', 'off', true);
  END IF;

  SELECT dinners_per_week INTO v_n FROM households WHERE id = p_household_id;
  SELECT count(*) INTO v_servings FROM household_members WHERE household_id = p_household_id;

  DROP TABLE IF EXISTS _picks;
  CREATE TEMP TABLE _picks ON COMMIT DROP AS
  SELECT m.recipe_id, r.main_ingredient, coalesce(r.prep_minutes, 0) AS prep,
         row_number() OVER (ORDER BY m.super_count > 0 DESC, coalesce(d.deal_count, 0) DESC,
                                     d.est_cost_per_portion NULLS LAST, m.recipe_id) AS rank
  FROM _match_rows(p_household_id, p_week_start) m
  JOIN recipes r ON r.id = m.recipe_id
  LEFT JOIN deck_items d ON d.household_id = p_household_id AND d.week_start = p_week_start AND d.recipe_id = m.recipe_id
  ORDER BY rank
  LIMIT greatest(coalesce(v_n, 5), 1);

  DROP TABLE IF EXISTS _days;
  CREATE TEMP TABLE _days(plan_date date, recipe_id uuid) ON COMMIT DROP;
  v_day := p_start_date;
  WHILE EXISTS (SELECT 1 FROM _picks) LOOP
    v_weekend := extract(isodow FROM v_day) IN (6, 7);
    SELECT * INTO v_pick FROM _picks
    ORDER BY (v_prev IS NOT NULL AND main_ingredient IS NOT DISTINCT FROM v_prev),   -- avoid repeats
             CASE WHEN v_weekend THEN prep <= 40 ELSE prep > 40 END,                -- long ones at the weekend
             rank
    LIMIT 1;
    INSERT INTO _days VALUES (v_day, v_pick.recipe_id);
    DELETE FROM _picks WHERE recipe_id = v_pick.recipe_id;
    v_prev := v_pick.main_ingredient;
    v_day := v_day + 1;
    v_count := v_count + 1;
  END LOOP;
  -- one statement → one list rebuild
  INSERT INTO meal_plan_entries(household_id, week_start, plan_date, recipe_id, servings, is_leftover_day)
  SELECT p_household_id, p_week_start, d.plan_date, d.recipe_id, greatest(v_servings, 1), false FROM _days d;
  DROP TABLE IF EXISTS _picks;
  DROP TABLE IF EXISTS _days;
  RETURN v_count;
END $fn$;

-- ── Plan changes rebuild the list (one rebuild per statement) ────────────────
CREATE OR REPLACE FUNCTION public.plan_changed_rebuild_list()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT DISTINCT household_id, week_start FROM (
      SELECT household_id, week_start FROM changed_new
      UNION ALL SELECT household_id, week_start FROM changed_old
    ) x
  LOOP
    PERFORM _build_shopping_list(r.household_id, r.week_start);
  END LOOP;
  RETURN NULL;
END $fn$;

-- Postgres needs one trigger per event when transition tables are used, so there is one
-- small function per event.
CREATE OR REPLACE FUNCTION public.plan_inserted_rebuild_list()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE r record;
BEGIN
  FOR r IN SELECT DISTINCT household_id, week_start FROM changed_new LOOP
    PERFORM _build_shopping_list(r.household_id, r.week_start);
  END LOOP;
  RETURN NULL;
END $fn$;

CREATE OR REPLACE FUNCTION public.plan_deleted_rebuild_list()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE r record;
BEGIN
  IF current_setting('genussio.skip_list_rebuild', true) = 'on' THEN RETURN NULL; END IF;
  FOR r IN SELECT DISTINCT household_id, week_start FROM changed_old LOOP
    PERFORM _build_shopping_list(r.household_id, r.week_start);
  END LOOP;
  RETURN NULL;
END $fn$;

DROP TRIGGER IF EXISTS meal_plan_entries_list_ins ON public.meal_plan_entries;
DROP TRIGGER IF EXISTS meal_plan_entries_list_upd ON public.meal_plan_entries;
DROP TRIGGER IF EXISTS meal_plan_entries_list_del ON public.meal_plan_entries;
CREATE TRIGGER meal_plan_entries_list_ins AFTER INSERT ON public.meal_plan_entries
  REFERENCING NEW TABLE AS changed_new
  FOR EACH STATEMENT EXECUTE FUNCTION public.plan_inserted_rebuild_list();
CREATE TRIGGER meal_plan_entries_list_upd AFTER UPDATE ON public.meal_plan_entries
  REFERENCING NEW TABLE AS changed_new OLD TABLE AS changed_old
  FOR EACH STATEMENT EXECUTE FUNCTION public.plan_changed_rebuild_list();
CREATE TRIGGER meal_plan_entries_list_del AFTER DELETE ON public.meal_plan_entries
  REFERENCING OLD TABLE AS changed_old
  FOR EACH STATEMENT EXECUTE FUNCTION public.plan_deleted_rebuild_list();

-- Store changes re-route the list too
CREATE OR REPLACE FUNCTION public.household_stores_rebuild_list()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE w date;
BEGIN
  IF NEW.stores IS DISTINCT FROM OLD.stores THEN
    FOR w IN SELECT DISTINCT week_start FROM meal_plan_entries
             WHERE household_id = NEW.id AND week_start >= current_week_start() LOOP
      PERFORM _build_shopping_list(NEW.id, w);
    END LOOP;
  END IF;
  RETURN NEW;
END $fn$;
DROP TRIGGER IF EXISTS households_stores_rebuild_list ON public.households;
CREATE TRIGGER households_stores_rebuild_list
  AFTER UPDATE OF stores ON public.households
  FOR EACH ROW EXECUTE FUNCTION public.household_stores_rebuild_list();

-- ── refresh_deck: keep the day, empty the dinner (shows "Tauschen") ──────────
CREATE OR REPLACE FUNCTION public.refresh_deck(p_household_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE v_week date := current_week_start(); v_left int;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM deck_items WHERE household_id = p_household_id AND week_start = v_week) THEN
    RETURN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM swipes WHERE household_id = p_household_id AND week_start = v_week) THEN
    DELETE FROM deck_items WHERE household_id = p_household_id AND week_start = v_week;
    BEGIN
      PERFORM _build_deck(p_household_id, v_week);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'refresh_deck: rebuild failed for %: %', p_household_id, SQLERRM;
    END;
  ELSE
    CREATE TEMP TABLE IF NOT EXISTS _fit(rid uuid) ON COMMIT DROP;
    TRUNCATE _fit;
    INSERT INTO _fit SELECT c.rid FROM deck_candidates(p_household_id, v_week) c;

    DELETE FROM deck_items d
    WHERE d.household_id = p_household_id AND d.week_start = v_week
      AND NOT EXISTS (SELECT 1 FROM _fit f WHERE f.rid = d.recipe_id);
    UPDATE meal_plan_entries e SET recipe_id = NULL
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

-- ── Permissions ──────────────────────────────────────────────────────────────
REVOKE ALL ON FUNCTION public._build_shopping_list(uuid, date) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.plan_changed_rebuild_list() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.plan_inserted_rebuild_list() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.plan_deleted_rebuild_list() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.household_stores_rebuild_list() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refresh_deck(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.build_shopping_list(uuid, date) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_plan(uuid, date, date, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.build_shopping_list(uuid, date), public.create_plan(uuid, date, date, boolean)
  TO authenticated;

COMMIT;
