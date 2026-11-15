-- Genussio prompt 10: launch-price reservation and account deletion
-- Run once in Supabase → SQL Editor, AFTER the prompt 9 file. Safe to run again.
--
--   reservations.status      + 'vorgemerkt' (reserved for free)
--   save_reservation         one reservation per household; never downgrades a paid one
--   admin_set_reservation    admins mark a household as bezahlt / erstattet by hand
--   delete_my_account        deletes the signed-in user; the household goes with the last adult

BEGIN;

ALTER TABLE public.reservations DROP CONSTRAINT IF EXISTS reservations_status_check;
ALTER TABLE public.reservations ADD CONSTRAINT reservations_status_check
  CHECK (status IN ('geklickt', 'vorgemerkt', 'bezahlt', 'erstattet'));

-- The app writes reservations only through save_reservation now.
DROP POLICY IF EXISTS reservations_insert ON public.reservations;
REVOKE INSERT, UPDATE, DELETE ON public.reservations FROM authenticated;

CREATE OR REPLACE FUNCTION public.save_reservation(p_status text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE v_hh uuid; v_email text; v_row reservations%ROWTYPE;
BEGIN
  IF p_status NOT IN ('geklickt', 'vorgemerkt') THEN RAISE EXCEPTION 'invalid status'; END IF;
  SELECT m.household_id INTO v_hh FROM household_members m WHERE m.user_id = auth.uid() LIMIT 1;
  IF v_hh IS NULL THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501'; END IF;
  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();

  SELECT * INTO v_row FROM reservations WHERE household_id = v_hh ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO reservations(household_id, user_id, email, status) VALUES (v_hh, auth.uid(), v_email, p_status);
    RETURN p_status;
  END IF;
  -- Paid or refunded is final here; 'geklickt' (wants to pay) wins over 'vorgemerkt'.
  IF v_row.status IN ('bezahlt', 'erstattet') THEN RETURN v_row.status; END IF;
  IF v_row.status = 'geklickt' AND p_status = 'vorgemerkt' THEN RETURN v_row.status; END IF;
  UPDATE reservations SET status = p_status, user_id = auth.uid(), email = coalesce(v_email, email)
  WHERE id = v_row.id;
  RETURN p_status;
END $fn$;

CREATE OR REPLACE FUNCTION public.admin_set_reservation(p_household_id uuid, p_status text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE v_id uuid;
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501'; END IF;
  IF p_status IS NOT NULL AND p_status NOT IN ('geklickt', 'vorgemerkt', 'bezahlt', 'erstattet') THEN
    RAISE EXCEPTION 'invalid status'; END IF;
  SELECT id INTO v_id FROM reservations WHERE household_id = p_household_id ORDER BY created_at DESC LIMIT 1;
  IF p_status IS NULL THEN
    DELETE FROM reservations WHERE household_id = p_household_id;
  ELSIF v_id IS NULL THEN
    INSERT INTO reservations(household_id, user_id, email, status)
    SELECT p_household_id, h.created_by, u.email, p_status
    FROM households h LEFT JOIN auth.users u ON u.id = h.created_by WHERE h.id = p_household_id;
  ELSE
    UPDATE reservations SET status = p_status WHERE id = v_id;
  END IF;
END $fn$;

-- Deletes the caller's account. Paid reservations are kept (bookkeeping duty, 7 years),
-- without the link to the deleted user.
CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE v_uid uuid := auth.uid(); v_hh uuid; v_adults_left int;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501'; END IF;
  SELECT household_id INTO v_hh FROM household_members WHERE user_id = v_uid LIMIT 1;

  IF v_hh IS NOT NULL THEN
    SELECT count(*) INTO v_adults_left FROM household_members
    WHERE household_id = v_hh AND user_id IS NOT NULL AND user_id <> v_uid;
    IF v_adults_left = 0 THEN
      -- last adult: the whole household goes (kids, deck, swipes, plan, list cascade)
      UPDATE reservations SET household_id = NULL WHERE household_id = v_hh AND status IN ('bezahlt', 'erstattet');
      DELETE FROM reservations WHERE household_id = v_hh;
      DELETE FROM households WHERE id = v_hh;
    ELSE
      DELETE FROM household_members WHERE household_id = v_hh AND user_id = v_uid;
      UPDATE households SET created_by = NULL WHERE id = v_hh AND created_by = v_uid;
    END IF;
  END IF;

  DELETE FROM reservations WHERE user_id = v_uid AND status NOT IN ('bezahlt', 'erstattet');
  DELETE FROM events WHERE user_id = v_uid;
  DELETE FROM feedback WHERE user_id = v_uid;
  DELETE FROM admins WHERE user_id = v_uid;
  DELETE FROM auth.users WHERE id = v_uid;   -- profile cascades
END $fn$;

-- Paid reservations must survive their household for bookkeeping
ALTER TABLE public.reservations ALTER COLUMN household_id DROP NOT NULL;

REVOKE ALL ON FUNCTION public.save_reservation(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_set_reservation(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.delete_my_account() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_reservation(text), public.admin_set_reservation(uuid, text),
  public.delete_my_account() TO authenticated;

COMMIT;
