-- Genussio prompt 9: weekly check-in and admin dashboard numbers
-- Run once in Supabase → SQL Editor, AFTER the prompt 8 file. Safe to run again.
--
--   weekly_checkin_status   which week to ask about, whether to ask the price question
--   submit_weekly_checkin   saves one 'woche' feedback row per person and week (or a skip)
--   admin_signup_groups     beta codes and utm campaigns for the filter
--   admin_dashboard         all dashboard numbers as one JSON (admins only)

BEGIN;

-- Weekly answers are JSON text; general feedback is free text. Only parse the weekly ones.
CREATE OR REPLACE FUNCTION public._fb_json(p_kind text, p_answer text)
RETURNS jsonb LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN p_kind = 'woche' THEN p_answer::jsonb END;
$$;

-- One weekly answer per person and week, enforced by the database
CREATE UNIQUE INDEX IF NOT EXISTS feedback_one_checkin_per_week
  ON public.feedback (user_id, ((answer::jsonb ->> 'week_start')))
  WHERE kind = 'woche';

-- From Sunday on we ask about the current week, Monday to Saturday about last week.
CREATE OR REPLACE FUNCTION public._checkin_week()
RETURNS date LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT CASE WHEN extract(isodow FROM (now() AT TIME ZONE 'Europe/Vienna')) = 7
              THEN current_week_start() ELSE current_week_start() - 7 END;
$$;

CREATE OR REPLACE FUNCTION public.weekly_checkin_status()
RETURNS TABLE(due boolean, week_start date, ask_price boolean, household_id uuid)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
DECLARE v_hh uuid; v_week date := _checkin_week();
BEGIN
  SELECT m.household_id INTO v_hh FROM household_members m WHERE m.user_id = auth.uid() LIMIT 1;
  IF v_hh IS NULL THEN
    RETURN QUERY SELECT false, v_week, false, NULL::uuid; RETURN;
  END IF;
  RETURN QUERY SELECT
    EXISTS (SELECT 1 FROM meal_plan_entries e WHERE e.household_id = v_hh AND e.week_start = v_week)
      AND NOT EXISTS (SELECT 1 FROM feedback f WHERE f.user_id = auth.uid() AND f.kind = 'woche'
                        AND _fb_json(f.kind, f.answer) ->> 'week_start' = v_week::text),
    v_week,
    EXISTS (SELECT 1 FROM meal_plan_entries e WHERE e.household_id = v_hh AND e.week_start < v_week),
    v_hh;
END $fn$;

CREATE OR REPLACE FUNCTION public.submit_weekly_checkin(
  p_days_cooked int, p_savings text, p_would_pay text, p_skipped boolean DEFAULT false)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE s record;
BEGIN
  SELECT * INTO s FROM weekly_checkin_status();
  IF s.household_id IS NULL THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501'; END IF;
  IF NOT coalesce(p_skipped, false) THEN
    IF p_days_cooked IS NULL OR p_days_cooked NOT BETWEEN 0 AND 7 THEN RAISE EXCEPTION 'invalid days'; END IF;
    IF p_savings IS NULL OR p_savings NOT IN ('nichts','bis10','10bis20','20bis40','mehr40') THEN
      RAISE EXCEPTION 'invalid savings'; END IF;
    IF p_would_pay IS NOT NULL AND p_would_pay NOT IN ('ja','vielleicht','nein') THEN
      RAISE EXCEPTION 'invalid answer'; END IF;
  END IF;
  INSERT INTO feedback(user_id, household_id, kind, rating, answer)
  VALUES (auth.uid(), s.household_id, 'woche', NULL,
    jsonb_strip_nulls(jsonb_build_object(
      'week_start', s.week_start::text,
      'skipped', CASE WHEN coalesce(p_skipped, false) THEN true END,
      'days_cooked', CASE WHEN NOT coalesce(p_skipped, false) THEN p_days_cooked END,
      'savings', CASE WHEN NOT coalesce(p_skipped, false) THEN p_savings END,
      'would_pay', CASE WHEN NOT coalesce(p_skipped, false) AND s.ask_price THEN p_would_pay END
    ))::text)
  ON CONFLICT DO NOTHING;
END $fn$;

-- ── Admin ────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_signup_groups()
RETURNS TABLE(kind text, value text, people int)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501'; END IF;
  RETURN QUERY
  SELECT 'beta'::text, p.beta_code, count(*)::int FROM profiles p WHERE p.beta_code IS NOT NULL GROUP BY p.beta_code
  UNION ALL
  SELECT 'utm'::text, p.utm_campaign, count(*)::int FROM profiles p WHERE p.utm_campaign IS NOT NULL GROUP BY p.utm_campaign
  ORDER BY 1, 2;
END $fn$;

-- p_group: 'all' | 'beta' (any beta code) | 'utm' (any campaign) | 'beta:CODE' | 'utm:CAMPAIGN'
CREATE OR REPLACE FUNCTION public.admin_dashboard(p_from date, p_to date, p_group text DEFAULT 'all')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE v jsonb; v_today date := (now() AT TIME ZONE 'Europe/Vienna')::date;
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501'; END IF;

  CREATE TEMP TABLE IF NOT EXISTS _people(id uuid, created_at timestamptz, grp text) ON COMMIT DROP;
  CREATE TEMP TABLE IF NOT EXISTS _hh(id uuid, name text, created_at timestamptz, grp text, members int,
    deck_done boolean, planned boolean, plans int, list_opened boolean, planned_dinners int, cooked int,
    reserved text, last_activity timestamptz) ON COMMIT DROP;
  TRUNCATE _people; TRUNCATE _hh;

  INSERT INTO _people
  SELECT p.id, p.created_at,
         CASE WHEN p.beta_code IS NOT NULL THEN 'Beta-Code ' || p.beta_code
              WHEN p.utm_campaign IS NOT NULL THEN 'Anzeige ' || p.utm_campaign
              ELSE 'Direkt' END
  FROM profiles p
  WHERE (p_from IS NULL OR p.created_at >= p_from)
    AND (p_to IS NULL OR p.created_at < p_to + 1)
    AND CASE
      WHEN coalesce(p_group, 'all') = 'all' THEN true
      WHEN p_group = 'beta' THEN p.beta_code IS NOT NULL
      WHEN p_group = 'utm' THEN p.utm_campaign IS NOT NULL
      WHEN p_group LIKE 'beta:%' THEN p.beta_code = substr(p_group, 6)
      WHEN p_group LIKE 'utm:%' THEN p.utm_campaign = substr(p_group, 5)
      ELSE true END;

  INSERT INTO _hh
  SELECT h.id, h.name, h.created_at, pe.grp,
    (SELECT count(*) FROM household_members m WHERE m.household_id = h.id)::int,
    -- some member voted on every card of some week's deck
    EXISTS (SELECT 1 FROM (SELECT d.week_start, count(*) n FROM deck_items d WHERE d.household_id = h.id GROUP BY 1) dk
            WHERE EXISTS (SELECT 1 FROM swipes s JOIN deck_items d2 ON d2.household_id = s.household_id
                            AND d2.week_start = s.week_start AND d2.recipe_id = s.recipe_id
                          WHERE s.household_id = h.id AND s.week_start = dk.week_start
                          GROUP BY s.member_id HAVING count(*) >= dk.n)),
    EXISTS (SELECT 1 FROM meal_plan_entries e WHERE e.household_id = h.id),
    (SELECT count(DISTINCT e.week_start) FROM meal_plan_entries e WHERE e.household_id = h.id)::int,
    EXISTS (SELECT 1 FROM events ev WHERE ev.household_id = h.id AND ev.name = 'list_opened'),
    (SELECT count(*) FROM meal_plan_entries e WHERE e.household_id = h.id AND e.recipe_id IS NOT NULL
       AND NOT e.is_leftover_day AND e.plan_date <= v_today)::int,
    (SELECT count(*) FROM meal_plan_entries e WHERE e.household_id = h.id AND e.cooked_at IS NOT NULL)::int,
    (SELECT r.status FROM reservations r WHERE r.household_id = h.id
       ORDER BY CASE r.status WHEN 'bezahlt' THEN 1 WHEN 'erstattet' THEN 2 WHEN 'vorgemerkt' THEN 3 ELSE 4 END
       LIMIT 1),
    greatest(
      (SELECT max(ev.created_at) FROM events ev WHERE ev.household_id = h.id),
      (SELECT max(s.updated_at) FROM swipes s WHERE s.household_id = h.id),
      (SELECT max(l.updated_at) FROM shopping_list_items l WHERE l.household_id = h.id),
      h.created_at)
  FROM households h
  JOIN _people pe ON pe.id = h.created_by;

  SELECT jsonb_build_object(
    'kpis', jsonb_build_object(
      'signups', (SELECT count(*) FROM _people),
      'households', (SELECT count(*) FROM _hh),
      'multi_member_share', (SELECT round(avg((members >= 2)::int) * 100) FROM _hh),
      'deck_finished', (SELECT count(*) FROM _hh WHERE deck_done),
      'planned', (SELECT count(*) FROM _hh WHERE planned),
      'cooked_share', (SELECT round(sum(cooked)::numeric * 100 / nullif(sum(planned_dinners), 0)) FROM _hh),
      'cooked', (SELECT coalesce(sum(cooked), 0) FROM _hh),
      'planned_dinners', (SELECT coalesce(sum(planned_dinners), 0) FROM _hh),
      'retention', (
        SELECT jsonb_agg(jsonb_build_object('week', w, 'eligible', eligible, 'active', active) ORDER BY w)
        FROM (
          SELECT w,
            count(*) FILTER (WHERE h.created_at + (w - 1) * interval '7 days' <= now()) AS eligible,
            count(*) FILTER (WHERE EXISTS (
              SELECT 1 FROM (
                SELECT ev.created_at AS at FROM events ev WHERE ev.household_id = h.id
                UNION ALL SELECT s.created_at FROM swipes s WHERE s.household_id = h.id
              ) a WHERE a.at >= h.created_at + (w - 1) * interval '7 days'
                    AND a.at <  h.created_at + w * interval '7 days')) AS active
          FROM _hh h, generate_series(2, 4) w
          GROUP BY w
        ) r),
      'checkin', (
        SELECT jsonb_build_object(
          'answers', count(*),
          'avg_days_cooked', round(avg((_fb_json(f.kind, f.answer) ->> 'days_cooked')::numeric), 1),
          'savings', coalesce((SELECT jsonb_object_agg(sv, n) FROM (
              SELECT _fb_json(f2.kind, f2.answer) ->> 'savings' sv, count(*) n FROM feedback f2
              JOIN _hh h2 ON h2.id = f2.household_id
              WHERE f2.kind = 'woche' AND _fb_json(f2.kind, f2.answer) ->> 'savings' IS NOT NULL GROUP BY 1) x), '{}'::jsonb),
          'price_answers', count(_fb_json(f.kind, f.answer) ->> 'would_pay'),
          'price_yes_share', round(avg(((_fb_json(f.kind, f.answer) ->> 'would_pay') = 'ja')::int) * 100))
        FROM feedback f JOIN _hh h ON h.id = f.household_id
        WHERE f.kind = 'woche' AND NOT coalesce((_fb_json(f.kind, f.answer) ->> 'skipped')::boolean, false)),
      'reservations_clicked', (SELECT count(*) FROM _hh WHERE reserved IS NOT NULL),
      'reservations_paid', (SELECT count(*) FROM _hh WHERE reserved = 'bezahlt')
    ),
    'funnel', jsonb_build_array(
      jsonb_build_object('step', 'signed_up', 'count', (SELECT count(*) FROM _people)),
      jsonb_build_object('step', 'household', 'count', (SELECT count(*) FROM _hh)),
      jsonb_build_object('step', 'two_members', 'count', (SELECT count(*) FROM _hh WHERE members >= 2)),
      jsonb_build_object('step', 'deck_finished', 'count', (SELECT count(*) FROM _hh WHERE deck_done)),
      jsonb_build_object('step', 'plan_created', 'count', (SELECT count(*) FROM _hh WHERE planned)),
      jsonb_build_object('step', 'list_opened', 'count', (SELECT count(*) FROM _hh WHERE list_opened)),
      jsonb_build_object('step', 'cooked', 'count', (SELECT count(*) FROM _hh WHERE cooked > 0)),
      jsonb_build_object('step', 'reserved', 'count', (SELECT count(*) FROM _hh WHERE reserved IS NOT NULL))
    ),
    'households', coalesce((SELECT jsonb_agg(jsonb_build_object(
        'id', id, 'name', name, 'members', members, 'group', grp, 'created_at', created_at,
        'last_activity', last_activity, 'plans', plans, 'cooked', cooked, 'reservation', reserved)
        ORDER BY created_at DESC) FROM _hh), '[]'::jsonb),
    'feedback', coalesce((SELECT jsonb_agg(x ORDER BY x->>'created_at' DESC) FROM (
        SELECT jsonb_build_object('id', f.id, 'kind', f.kind, 'rating', f.rating, 'answer', f.answer,
          'created_at', f.created_at, 'household', h.name) x
        FROM feedback f LEFT JOIN households h ON h.id = f.household_id
        WHERE (f.household_id IS NULL OR f.household_id IN (SELECT id FROM _hh) OR coalesce(p_group,'all') = 'all')
          AND NOT (f.kind = 'woche' AND coalesce((_fb_json(f.kind, f.answer) ->> 'skipped')::boolean, false))
        ORDER BY f.created_at DESC LIMIT 20) y), '[]'::jsonb)
  ) INTO v;
  RETURN v;
END $fn$;

REVOKE ALL ON FUNCTION public._checkin_week() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._fb_json(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.weekly_checkin_status() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.submit_weekly_checkin(int, text, text, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_signup_groups() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_dashboard(date, date, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.weekly_checkin_status(), public.submit_weekly_checkin(int, text, text, boolean),
  public.admin_signup_groups(), public.admin_dashboard(date, date, text) TO authenticated;

COMMIT;
