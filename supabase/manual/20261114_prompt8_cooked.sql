-- Genussio prompt 8: "Gekocht" on plan days
-- Run once in Supabase → SQL Editor, AFTER the prompt 7 file. Safe to run again.
--
--   meal_plan_entries.cooked_at   set by "Gekocht" / the end of cook mode
--   plan_changed_rebuild_list     only rebuilds the shopping list when something that
--                                 affects it changed (not when a dinner is ticked as cooked)

BEGIN;

ALTER TABLE public.meal_plan_entries ADD COLUMN IF NOT EXISTS cooked_at timestamptz;

CREATE OR REPLACE FUNCTION public.plan_changed_rebuild_list()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT DISTINCT n.household_id, n.week_start
    FROM changed_new n JOIN changed_old o ON o.id = n.id
    WHERE n.recipe_id IS DISTINCT FROM o.recipe_id
       OR n.servings IS DISTINCT FROM o.servings
       OR n.is_leftover_day IS DISTINCT FROM o.is_leftover_day
       OR n.plan_date IS DISTINCT FROM o.plan_date
       OR n.week_start IS DISTINCT FROM o.week_start
       OR n.household_id IS DISTINCT FROM o.household_id
    UNION
    SELECT DISTINCT o.household_id, o.week_start
    FROM changed_new n JOIN changed_old o ON o.id = n.id
    WHERE n.week_start IS DISTINCT FROM o.week_start OR n.household_id IS DISTINCT FROM o.household_id
  LOOP
    PERFORM _build_shopping_list(r.household_id, r.week_start);
  END LOOP;
  RETURN NULL;
END $fn$;
REVOKE ALL ON FUNCTION public.plan_changed_rebuild_list() FROM PUBLIC, anon, authenticated;

COMMIT;
