CREATE UNIQUE INDEX household_members_one_household_per_user
  ON public.household_members(user_id) WHERE user_id IS NOT NULL;

CREATE FUNCTION public.create_household(
  p_name text, p_beta_code text, p_stores text[], p_weekly_budget numeric,
  p_dinners_per_week int, p_max_cook_minutes int
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_uid uuid := auth.uid(); v_code public.beta_codes%ROWTYPE; v_id uuid; v_name text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Bitte melde dich zuerst an.' USING ERRCODE = '42501'; END IF;
  IF EXISTS (SELECT 1 FROM household_members WHERE user_id = v_uid) THEN
    RAISE EXCEPTION 'Du bist schon in einem Haushalt.' USING ERRCODE = 'P0001'; END IF;
  IF coalesce(trim(p_name), '') = '' THEN RAISE EXCEPTION 'Bitte gib einen Namen für den Haushalt ein.' USING ERRCODE = 'P0001'; END IF;
  IF p_stores IS NULL OR cardinality(p_stores) = 0 OR NOT p_stores <@ ARRAY['spar','billa','hofer','lidl'] THEN
    RAISE EXCEPTION 'Bitte wähle mindestens einen Supermarkt.' USING ERRCODE = 'P0001'; END IF;
  IF p_dinners_per_week NOT BETWEEN 3 AND 7 THEN RAISE EXCEPTION 'Bitte wähle 3 bis 7 Abendessen pro Woche.' USING ERRCODE = 'P0001'; END IF;
  IF p_max_cook_minutes NOT IN (20, 30, 45, 60) THEN RAISE EXCEPTION 'Bitte wähle eine gültige Kochzeit.' USING ERRCODE = 'P0001'; END IF;
  IF p_weekly_budget IS NOT NULL AND p_weekly_budget NOT BETWEEN 30 AND 200 THEN
    RAISE EXCEPTION 'Das Budget muss zwischen 30 und 200 Euro liegen.' USING ERRCODE = 'P0001'; END IF;

  SELECT * INTO v_code FROM beta_codes WHERE upper(code) = upper(trim(p_beta_code)) FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Diesen Beta-Code gibt es leider nicht.' USING ERRCODE = 'P0001'; END IF;
  IF NOT v_code.active THEN RAISE EXCEPTION 'Dieser Beta-Code ist nicht mehr aktiv.' USING ERRCODE = 'P0001'; END IF;
  IF v_code.max_uses IS NOT NULL AND v_code.uses >= v_code.max_uses THEN
    RAISE EXCEPTION 'Dieser Beta-Code wurde schon zu oft verwendet.' USING ERRCODE = 'P0001'; END IF;
  UPDATE beta_codes SET uses = uses + 1 WHERE code = v_code.code;

  INSERT INTO households(name, stores, weekly_budget, dinners_per_week, max_cook_minutes, created_by)
  VALUES (trim(p_name), p_stores, p_weekly_budget, p_dinners_per_week, p_max_cook_minutes, v_uid)
  RETURNING id INTO v_id;
  SELECT display_name INTO v_name FROM profiles WHERE id = v_uid;
  INSERT INTO household_members(household_id, user_id, display_name) VALUES (v_id, v_uid, v_name);
  RETURN v_id;
END; $$;

CREATE FUNCTION public.join_household(p_invite_code text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_uid uuid := auth.uid(); v_id uuid; v_name text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Bitte melde dich zuerst an.' USING ERRCODE = '42501'; END IF;
  SELECT id INTO v_id FROM households WHERE invite_code = upper(trim(p_invite_code));
  IF NOT FOUND THEN RAISE EXCEPTION 'Diese Einladung gibt es leider nicht.' USING ERRCODE = 'P0001'; END IF;
  IF EXISTS (SELECT 1 FROM household_members WHERE user_id = v_uid AND household_id = v_id) THEN RETURN v_id; END IF;
  IF EXISTS (SELECT 1 FROM household_members WHERE user_id = v_uid) THEN
    RAISE EXCEPTION 'Du bist schon in einem Haushalt.' USING ERRCODE = 'P0001'; END IF;
  SELECT display_name INTO v_name FROM profiles WHERE id = v_uid;
  INSERT INTO household_members(household_id, user_id, display_name) VALUES (v_id, v_uid, v_name);
  RETURN v_id;
END; $$;

CREATE FUNCTION public.invite_household_name(p_invite_code text) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT coalesce(name, '') FROM households WHERE auth.uid() IS NOT NULL AND invite_code = upper(trim(p_invite_code)); $$;

REVOKE ALL ON FUNCTION public.create_household(text, text, text[], numeric, int, int) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.join_household(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.invite_household_name(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_household(text, text, text[], numeric, int, int), public.join_household(text), public.invite_household_name(text) TO authenticated, service_role;