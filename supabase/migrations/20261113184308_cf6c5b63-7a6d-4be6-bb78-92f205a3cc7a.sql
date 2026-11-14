CREATE OR REPLACE FUNCTION public.generate_deck(p_household_id uuid, p_week_start date)
RETURNS TABLE(id uuid, recipe_id uuid, "position" integer, est_cost_per_portion numeric, deal_count integer, source text,
  title text, description text, image_url text, prep_minutes integer, base_servings integer, diet_tags text[], allergens text[])
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $fn$
DECLARE v_hh households%ROWTYPE; v_allergens text[]; v_dislikes text[]; v_need_veg boolean; v_need_vegan boolean;
BEGIN
  IF p_household_id IS NULL OR p_week_start IS NULL OR NOT is_member(p_household_id) THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_household_id::text || p_week_start::text, 0));

  IF NOT EXISTS (SELECT 1 FROM deck_items d WHERE d.household_id = p_household_id AND d.week_start = p_week_start) THEN
    SELECT * INTO v_hh FROM households h WHERE h.id = p_household_id;
    SELECT coalesce(array_agg(DISTINCT lower(a)), '{}') INTO v_allergens FROM household_members m, unnest(m.allergies) a WHERE m.household_id = p_household_id;
    -- member allergy keys -> recipe allergen labels
    v_allergens := v_allergens || ARRAY(SELECT lower(CASE k WHEN 'gluten' THEN 'Gluten' WHEN 'crustaceans' THEN 'Krebstiere' WHEN 'eggs' THEN 'Eier' WHEN 'fish' THEN 'Fisch'
      WHEN 'peanuts' THEN 'Erdnüsse' WHEN 'soy' THEN 'Soja' WHEN 'milk' THEN 'Milch/Laktose' WHEN 'nuts' THEN 'Schalenfrüchte' WHEN 'celery' THEN 'Sellerie'
      WHEN 'mustard' THEN 'Senf' WHEN 'sesame' THEN 'Sesam' WHEN 'sulphites' THEN 'Sulfite' WHEN 'lupin' THEN 'Lupinen' WHEN 'molluscs' THEN 'Weichtiere' ELSE k END) FROM unnest(v_allergens) k);
    SELECT coalesce(array_agg(DISTINCT lower(trim(x))) FILTER (WHERE trim(x) <> ''), '{}') INTO v_dislikes FROM household_members m, unnest(m.dislikes) x WHERE m.household_id = p_household_id;
    SELECT bool_or(m.diet IN ('vegetarisch','vegan')), bool_or(m.diet = 'vegan') INTO v_need_veg, v_need_vegan FROM household_members m WHERE m.household_id = p_household_id;

    CREATE TEMP TABLE _cand ON COMMIT DROP AS
    WITH cands AS (
      SELECT r.* FROM recipes r
      WHERE r.active
        AND NOT EXISTS (SELECT 1 FROM unnest(r.allergens) a WHERE lower(a) = ANY (v_allergens))
        AND (NOT coalesce(v_need_vegan,false) OR 'vegan' = ANY (r.diet_tags))
        AND (NOT coalesce(v_need_veg,false) OR r.diet_tags && ARRAY['vegetarisch','vegan'])
        AND r.prep_minutes IS NOT NULL AND r.prep_minutes <= v_hh.max_cook_minutes
        AND NOT EXISTS (SELECT 1 FROM recipe_ingredients ri, unnest(v_dislikes) dl WHERE ri.recipe_id = r.id
              AND (lower(coalesce(ri.display_name,'')) LIKE '%' || dl || '%' OR lower(ri.ingredient_key) LIKE '%' || dl || '%'))
        AND NOT EXISTS (SELECT 1 FROM meal_plan_entries mp WHERE mp.household_id = p_household_id AND mp.recipe_id = r.id AND mp.week_start = p_week_start - 7)
    ), ing AS (
      SELECT ri.recipe_id, ri.quantity,
        (SELECT min(dd.deal_price / nullif(dd.package_quantity,0) * ri.quantity) FROM deals dd
          WHERE dd.ingredient_key = ri.ingredient_key AND dd.store = ANY (v_hh.stores)
            AND dd.valid_from <= p_week_start + 6 AND dd.valid_to >= p_week_start) AS deal_cost,
        (SELECT min(ip.price / nullif(ip.per_quantity,0) * ri.quantity) FROM ingredient_prices ip
          WHERE ip.ingredient_key = ri.ingredient_key AND ip.store = ANY (v_hh.stores)) AS reg_cost
      FROM recipe_ingredients ri JOIN cands c ON c.id = ri.recipe_id WHERE NOT ri.is_pantry
    )
    SELECT c.id AS rid,
      round(coalesce((SELECT sum(coalesce(i.deal_cost, i.reg_cost, 0)) FROM ing i WHERE i.recipe_id = c.id), 0) / greatest(c.base_servings,1), 2) AS cost,
      (SELECT count(*) FROM ing i WHERE i.recipe_id = c.id AND i.deal_cost IS NOT NULL)::int AS deals,
      EXISTS (SELECT 1 FROM swipes s WHERE s.household_id = p_household_id AND s.recipe_id = c.id AND s.week_start >= p_week_start - 56 AND s.week_start < p_week_start
              GROUP BY s.week_start
              HAVING count(DISTINCT s.member_id) FILTER (WHERE s.vote IN ('like','super')) >= (SELECT count(*) FROM household_members m WHERE m.household_id = p_household_id AND NOT m.is_kid)
            ) AS fav,
      NOT EXISTS (SELECT 1 FROM deck_items d WHERE d.household_id = p_household_id AND d.recipe_id = c.id) AS is_new,
      NULL::text AS src
    FROM cands c;

    UPDATE _cand SET src = 'deal' WHERE rid IN (SELECT rid FROM _cand WHERE deals >= 1 ORDER BY deals DESC, cost, rid LIMIT 12);
    UPDATE _cand SET src = 'favorite' WHERE rid IN (SELECT rid FROM _cand WHERE src IS NULL AND fav ORDER BY random() LIMIT 4);
    UPDATE _cand SET src = 'new' WHERE rid IN (SELECT rid FROM _cand WHERE src IS NULL AND is_new ORDER BY random() LIMIT 4);
    UPDATE _cand SET src = CASE WHEN deals >= 1 THEN 'deal' WHEN fav THEN 'favorite' ELSE 'new' END
      WHERE rid IN (SELECT rid FROM _cand WHERE src IS NULL ORDER BY cost, rid LIMIT greatest(0, 20 - (SELECT count(*) FROM _cand WHERE src IS NOT NULL))::int);

    INSERT INTO deck_items(household_id, week_start, recipe_id, position, est_cost_per_portion, deal_count, source)
    SELECT p_household_id, p_week_start, rid, (row_number() OVER (ORDER BY random()))::int, cost, deals, src FROM _cand WHERE src IS NOT NULL;
  END IF;

  RETURN QUERY SELECT d.id, d.recipe_id, d.position, d.est_cost_per_portion, d.deal_count, d.source,
    r.title, r.description, r.image_url, r.prep_minutes, r.base_servings, r.diet_tags, r.allergens
  FROM deck_items d JOIN recipes r ON r.id = d.recipe_id
  WHERE d.household_id = p_household_id AND d.week_start = p_week_start ORDER BY d.position;
END $fn$;
REVOKE ALL ON FUNCTION public.generate_deck(uuid, date) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.generate_deck(uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_week_start() TO authenticated;