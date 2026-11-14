BEGIN;

CREATE FUNCTION public.touch_updated_at() RETURNS trigger
LANGUAGE plpgsql SET search_path = public
AS $$ BEGIN NEW.updated_at := now(); RETURN NEW; END; $$;

CREATE FUNCTION public.is_member(hh uuid) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$ BEGIN RETURN EXISTS (
  SELECT 1 FROM public.household_members
  WHERE household_id = hh AND user_id = auth.uid()
); END; $$;

CREATE FUNCTION public.is_admin() RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$ BEGIN RETURN EXISTS (
  SELECT 1 FROM public.admins WHERE user_id = auth.uid()
); END; $$;

CREATE FUNCTION public.current_week_start() RETURNS date
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT date_trunc('week', now() AT TIME ZONE 'Europe/Vienna')::date; $$;

REVOKE ALL ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_member(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.current_week_start() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_member(uuid), public.is_admin(), public.current_week_start()
  TO authenticated, service_role;

CREATE TABLE public.admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.admins TO authenticated;
GRANT ALL ON public.admins TO service_role;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
CREATE POLICY admins_own ON public.admins FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE TRIGGER admins_updated_at BEFORE UPDATE ON public.admins
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  is_early_member boolean NOT NULL DEFAULT true,
  signup_source text,
  beta_code text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  locale text NOT NULL DEFAULT 'de-AT' CHECK (locale IN ('de-AT','de-DE','en','it','es')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY profiles_read ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_admin());
CREATE POLICY profiles_insert ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());
CREATE POLICY profiles_update ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.beta_codes (
  code text PRIMARY KEY,
  label text,
  source text,
  max_uses int CHECK (max_uses IS NULL OR max_uses >= 0),
  uses int NOT NULL DEFAULT 0 CHECK (uses >= 0),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.beta_codes FROM anon, authenticated;
GRANT ALL ON public.beta_codes TO service_role;
ALTER TABLE public.beta_codes ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER beta_codes_updated_at BEFORE UPDATE ON public.beta_codes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.households (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  invite_code text NOT NULL UNIQUE DEFAULT upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)) CHECK (length(invite_code) = 8),
  stores text[] NOT NULL DEFAULT ARRAY['spar','billa','hofer','lidl']::text[],
  weekly_budget numeric,
  max_cook_minutes int NOT NULL DEFAULT 45,
  dinners_per_week int NOT NULL DEFAULT 5,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE, DELETE ON public.households TO authenticated;
GRANT ALL ON public.households TO service_role;
ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;
CREATE POLICY households_read ON public.households FOR SELECT TO authenticated
  USING (public.is_member(id));
CREATE POLICY households_update ON public.households FOR UPDATE TO authenticated
  USING (public.is_member(id)) WITH CHECK (public.is_member(id));
CREATE POLICY households_delete ON public.households FOR DELETE TO authenticated
  USING (created_by = auth.uid());
CREATE TRIGGER households_updated_at BEFORE UPDATE ON public.households
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.household_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  user_id uuid,
  display_name text,
  is_kid boolean NOT NULL DEFAULT false,
  diet text NOT NULL DEFAULT 'alles' CHECK (diet IN ('alles','vegetarisch','vegan')),
  allergies text[] NOT NULL DEFAULT '{}'::text[],
  dislikes text[] NOT NULL DEFAULT '{}'::text[],
  UNIQUE (household_id, user_id),
  UNIQUE (household_id, id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.household_members TO authenticated;
GRANT ALL ON public.household_members TO service_role;
ALTER TABLE public.household_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY household_members_read ON public.household_members FOR SELECT TO authenticated
  USING (public.is_member(household_id));
CREATE POLICY household_members_add_kid ON public.household_members FOR INSERT TO authenticated
  WITH CHECK (public.is_member(household_id) AND user_id IS NULL AND is_kid);
CREATE POLICY household_members_update ON public.household_members FOR UPDATE TO authenticated
  USING (public.is_member(household_id) AND (user_id = auth.uid() OR (user_id IS NULL AND is_kid)))
  WITH CHECK (public.is_member(household_id) AND (user_id = auth.uid() OR (user_id IS NULL AND is_kid)));
CREATE POLICY household_members_delete ON public.household_members FOR DELETE TO authenticated
  USING (public.is_member(household_id) AND (user_id = auth.uid() OR (user_id IS NULL AND is_kid)));
CREATE TRIGGER household_members_updated_at BEFORE UPDATE ON public.household_members
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE FUNCTION public.protect_member_identity() RETURNS trigger
LANGUAGE plpgsql SET search_path = public
AS $$ BEGIN
  IF current_user IN ('anon', 'authenticated') AND (
    NEW.household_id IS DISTINCT FROM OLD.household_id OR
    NEW.user_id IS DISTINCT FROM OLD.user_id OR
    NEW.is_kid IS DISTINCT FROM OLD.is_kid
  ) THEN RAISE EXCEPTION 'Member identity cannot be reassigned' USING ERRCODE = '42501'; END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.protect_member_identity() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER household_members_protect_identity BEFORE UPDATE ON public.household_members
  FOR EACH ROW EXECUTE FUNCTION public.protect_member_identity();

CREATE TABLE public.recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text,
  description text,
  image_url text,
  prep_minutes int,
  base_servings int NOT NULL DEFAULT 4,
  diet_tags text[] NOT NULL DEFAULT '{}'::text[],
  allergens text[] NOT NULL DEFAULT '{}'::text[],
  main_ingredient text,
  steps jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(steps) = 'array'),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.recipes TO authenticated;
GRANT ALL ON public.recipes TO service_role;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY recipes_read ON public.recipes FOR SELECT TO authenticated USING (true);
CREATE TRIGGER recipes_updated_at BEFORE UPDATE ON public.recipes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.recipe_ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  ingredient_key text NOT NULL,
  display_name text,
  quantity numeric,
  unit text,
  aisle text CHECK (aisle IN ('Obst & Gemüse','Fleisch & Fisch','Milchprodukte','Brot & Gebäck','Trockenwaren','Tiefkühl','Gewürze & Öl','Sonstiges')),
  is_pantry boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.recipe_ingredients TO authenticated;
GRANT ALL ON public.recipe_ingredients TO service_role;
ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;
CREATE POLICY recipe_ingredients_read ON public.recipe_ingredients FOR SELECT TO authenticated USING (true);
CREATE TRIGGER recipe_ingredients_updated_at BEFORE UPDATE ON public.recipe_ingredients
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.ingredient_prices (
  ingredient_key text NOT NULL,
  store text NOT NULL,
  price numeric,
  per_quantity numeric,
  unit text,
  PRIMARY KEY (ingredient_key, store),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ingredient_prices TO authenticated;
GRANT ALL ON public.ingredient_prices TO service_role;
ALTER TABLE public.ingredient_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY ingredient_prices_read ON public.ingredient_prices FOR SELECT TO authenticated USING (true);
CREATE TRIGGER ingredient_prices_updated_at BEFORE UPDATE ON public.ingredient_prices
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store text,
  ingredient_key text,
  product_name text,
  deal_price numeric,
  regular_price numeric,
  package_quantity numeric,
  unit text,
  valid_from date,
  valid_to date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.deals TO authenticated;
GRANT ALL ON public.deals TO service_role;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
CREATE POLICY deals_read ON public.deals FOR SELECT TO authenticated USING (true);
CREATE TRIGGER deals_updated_at BEFORE UPDATE ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.deck_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  recipe_id uuid NOT NULL REFERENCES public.recipes(id),
  position int,
  est_cost_per_portion numeric,
  deal_count int,
  source text CHECK (source IN ('deal','favorite','new')),
  UNIQUE (household_id, week_start, recipe_id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deck_items TO authenticated;
GRANT ALL ON public.deck_items TO service_role;
ALTER TABLE public.deck_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY deck_items_members ON public.deck_items FOR ALL TO authenticated
  USING (public.is_member(household_id)) WITH CHECK (public.is_member(household_id));
CREATE TRIGGER deck_items_updated_at BEFORE UPDATE ON public.deck_items
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.swipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  member_id uuid NOT NULL,
  recipe_id uuid NOT NULL REFERENCES public.recipes(id),
  week_start date NOT NULL,
  vote text NOT NULL CHECK (vote IN ('like','nope','super')),
  UNIQUE (member_id, recipe_id, week_start),
  FOREIGN KEY (household_id, member_id) REFERENCES public.household_members(household_id, id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.swipes TO authenticated;
GRANT ALL ON public.swipes TO service_role;
ALTER TABLE public.swipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY swipes_read ON public.swipes FOR SELECT TO authenticated
  USING (public.is_member(household_id));
CREATE POLICY swipes_write ON public.swipes FOR ALL TO authenticated
  USING (public.is_member(household_id) AND EXISTS (
    SELECT 1 FROM public.household_members m WHERE m.id = member_id
      AND m.household_id = swipes.household_id
      AND (m.user_id = auth.uid() OR (m.user_id IS NULL AND m.is_kid))
  ))
  WITH CHECK (public.is_member(household_id) AND EXISTS (
    SELECT 1 FROM public.household_members m WHERE m.id = member_id
      AND m.household_id = swipes.household_id
      AND (m.user_id = auth.uid() OR (m.user_id IS NULL AND m.is_kid))
  ));
CREATE TRIGGER swipes_updated_at BEFORE UPDATE ON public.swipes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.meal_plan_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  plan_date date,
  recipe_id uuid REFERENCES public.recipes(id),
  servings int,
  is_leftover_day boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meal_plan_entries TO authenticated;
GRANT ALL ON public.meal_plan_entries TO service_role;
ALTER TABLE public.meal_plan_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY meal_plan_entries_members ON public.meal_plan_entries FOR ALL TO authenticated
  USING (public.is_member(household_id)) WITH CHECK (public.is_member(household_id));
CREATE TRIGGER meal_plan_entries_updated_at BEFORE UPDATE ON public.meal_plan_entries
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.shopping_list_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  store text,
  ingredient_key text,
  display_name text,
  quantity_text text,
  aisle text CHECK (aisle IN ('Obst & Gemüse','Fleisch & Fisch','Milchprodukte','Brot & Gebäck','Trockenwaren','Tiefkühl','Gewürze & Öl','Sonstiges')),
  is_deal boolean NOT NULL DEFAULT false,
  deal_price numeric,
  est_price numeric,
  checked boolean NOT NULL DEFAULT false,
  checked_by uuid,
  is_custom boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shopping_list_items TO authenticated;
GRANT ALL ON public.shopping_list_items TO service_role;
ALTER TABLE public.shopping_list_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY shopping_list_items_members ON public.shopping_list_items FOR ALL TO authenticated
  USING (public.is_member(household_id)) WITH CHECK (public.is_member(household_id));
CREATE TRIGGER shopping_list_items_updated_at BEFORE UPDATE ON public.shopping_list_items
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL,
  household_id uuid REFERENCES public.households(id) ON DELETE SET NULL,
  name text,
  props jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY events_insert ON public.events FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND (household_id IS NULL OR public.is_member(household_id)));
CREATE POLICY events_admin_read ON public.events FOR SELECT TO authenticated USING (public.is_admin());
CREATE TRIGGER events_updated_at BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  household_id uuid REFERENCES public.households(id) ON DELETE SET NULL,
  kind text CHECK (kind IN ('allgemein','woche')),
  rating int,
  answer text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.feedback TO authenticated;
GRANT ALL ON public.feedback TO service_role;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY feedback_insert ON public.feedback FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND (household_id IS NULL OR public.is_member(household_id)));
CREATE POLICY feedback_admin_read ON public.feedback FOR SELECT TO authenticated USING (public.is_admin());
CREATE TRIGGER feedback_updated_at BEFORE UPDATE ON public.feedback
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

GRANT USAGE ON SEQUENCE public.events_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.events_id_seq TO service_role;

CREATE TABLE public.reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  email text,
  status text NOT NULL DEFAULT 'geklickt' CHECK (status IN ('geklickt','bezahlt','erstattet')),
  stripe_reference text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reservations TO authenticated;
GRANT ALL ON public.reservations TO service_role;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
CREATE POLICY reservations_read ON public.reservations FOR SELECT TO authenticated
  USING (public.is_member(household_id) OR public.is_admin());
CREATE POLICY reservations_insert ON public.reservations FOR INSERT TO authenticated
  WITH CHECK (public.is_member(household_id) AND user_id = auth.uid() AND status = 'geklickt');
CREATE POLICY reservations_update ON public.reservations FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY reservations_delete ON public.reservations FOR DELETE TO authenticated
  USING (public.is_admin());
CREATE TRIGGER reservations_updated_at BEFORE UPDATE ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.recipe_translations (
  recipe_id uuid NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  locale text NOT NULL CHECK (locale IN ('de-DE','en','it','es')),
  title text,
  description text,
  steps jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(steps) = 'array'),
  PRIMARY KEY (recipe_id, locale),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.recipe_translations TO authenticated;
GRANT ALL ON public.recipe_translations TO service_role;
ALTER TABLE public.recipe_translations ENABLE ROW LEVEL SECURITY;
CREATE POLICY recipe_translations_read ON public.recipe_translations FOR SELECT TO authenticated USING (true);
CREATE TRIGGER recipe_translations_updated_at BEFORE UPDATE ON public.recipe_translations
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.ingredient_translations (
  ingredient_key text NOT NULL,
  locale text NOT NULL CHECK (locale IN ('de-DE','en','it','es')),
  display_name text,
  PRIMARY KEY (ingredient_key, locale),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ingredient_translations TO authenticated;
GRANT ALL ON public.ingredient_translations TO service_role;
ALTER TABLE public.ingredient_translations ENABLE ROW LEVEL SECURITY;
CREATE POLICY ingredient_translations_read ON public.ingredient_translations FOR SELECT TO authenticated USING (true);
CREATE TRIGGER ingredient_translations_updated_at BEFORE UPDATE ON public.ingredient_translations
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX deals_store_validity_idx ON public.deals (store, valid_from, valid_to);
CREATE INDEX recipe_ingredients_key_idx ON public.recipe_ingredients (ingredient_key);
CREATE INDEX recipe_ingredients_recipe_idx ON public.recipe_ingredients (recipe_id);
CREATE INDEX swipes_household_week_idx ON public.swipes (household_id, week_start);
CREATE INDEX household_members_user_household_idx ON public.household_members (user_id, household_id);
CREATE INDEX meal_plan_entries_household_week_idx ON public.meal_plan_entries (household_id, week_start);
CREATE INDEX shopping_list_items_household_week_idx ON public.shopping_list_items (household_id, week_start);
CREATE INDEX reservations_household_idx ON public.reservations (household_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.swipes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.meal_plan_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE public.shopping_list_items;

COMMIT;