DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['recipes','recipe_ingredients','deals','ingredient_prices','recipe_translations','ingredient_translations'] LOOP EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated',t); EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated',t); EXECUTE format('GRANT ALL ON public.%I TO service_role',t); EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (public.is_admin())',t||'_admin_insert',t); EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin())',t||'_admin_update',t); EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (public.is_admin())',t||'_admin_delete',t); END LOOP; END $$;
CREATE POLICY recipe_images_admin_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='recipe-images' AND public.is_admin());
CREATE POLICY recipe_images_admin_update ON storage.objects FOR UPDATE TO authenticated USING (bucket_id='recipe-images' AND public.is_admin()) WITH CHECK (bucket_id='recipe-images' AND public.is_admin());
CREATE POLICY recipe_images_admin_delete ON storage.objects FOR DELETE TO authenticated USING (bucket_id='recipe-images' AND public.is_admin());
CREATE POLICY recipe_images_public_read ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id='recipe-images');
CREATE OR REPLACE FUNCTION public.import_recipe(p_recipe jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE rid uuid; ing jsonb; loc text; tr jsonb;
BEGIN
 IF NOT public.is_admin() THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501'; END IF;
 IF coalesce(trim(p_recipe->>'title'),'')='' OR jsonb_typeof(p_recipe->'ingredients') IS DISTINCT FROM 'array' OR jsonb_array_length(p_recipe->'ingredients')=0 THEN RAISE EXCEPTION 'Invalid recipe'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_recipe->>'title',0));
 SELECT id INTO rid FROM recipes WHERE title=p_recipe->>'title' ORDER BY created_at LIMIT 1 FOR UPDATE;
 IF rid IS NULL THEN INSERT INTO recipes(title) VALUES (p_recipe->>'title') RETURNING id INTO rid; END IF;
 UPDATE recipes SET description=p_recipe->>'description',prep_minutes=(p_recipe->>'prep_minutes')::int,base_servings=(p_recipe->>'base_servings')::int,diet_tags=ARRAY(SELECT jsonb_array_elements_text(p_recipe->'diet_tags')),allergens=ARRAY(SELECT jsonb_array_elements_text(p_recipe->'allergens')),main_ingredient=p_recipe->>'main_ingredient',steps=p_recipe->'steps' WHERE id=rid;
 DELETE FROM recipe_ingredients WHERE recipe_id=rid;
 FOR ing IN SELECT value FROM jsonb_array_elements(p_recipe->'ingredients') LOOP
 INSERT INTO recipe_ingredients(recipe_id,ingredient_key,display_name,quantity,unit,aisle,is_pantry) VALUES(rid,ing->>'ingredient_key',ing->>'display_name',(ing->>'quantity')::numeric,ing->>'unit',ing->>'aisle',coalesce((ing->>'is_pantry')::boolean,false));
 FOR loc,tr IN SELECT key,value FROM jsonb_each(coalesce(ing->'names','{}'::jsonb)) LOOP
 INSERT INTO ingredient_translations(ingredient_key,locale,display_name) VALUES(ing->>'ingredient_key',loc,tr#>>'{}') ON CONFLICT(ingredient_key,locale) DO UPDATE SET display_name=excluded.display_name;
 END LOOP; END LOOP;
 FOR loc,tr IN SELECT key,value FROM jsonb_each(coalesce(p_recipe->'translations','{}'::jsonb)) LOOP
 INSERT INTO recipe_translations(recipe_id,locale,title,description,steps) VALUES(rid,loc,tr->>'title',tr->>'description',tr->'steps') ON CONFLICT(recipe_id,locale) DO UPDATE SET title=excluded.title,description=excluded.description,steps=excluded.steps;
 END LOOP;
 RETURN rid;
END $$;
REVOKE ALL ON FUNCTION public.import_recipe(jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.import_recipe(jsonb) TO authenticated,service_role;