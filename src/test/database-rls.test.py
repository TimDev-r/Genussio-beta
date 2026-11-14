"""Exercise the actual migration against isolated PostgreSQL; never connects to Supabase."""
import os
from pathlib import Path
import pwd
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
U1 = '10000000-0000-0000-0000-000000000001'
U2 = '10000000-0000-0000-0000-000000000002'
ADMIN = '10000000-0000-0000-0000-000000000003'
OUTSIDER = '10000000-0000-0000-0000-000000000004'
H1 = '20000000-0000-0000-0000-000000000001'
H2 = '20000000-0000-0000-0000-000000000002'
M1 = '30000000-0000-0000-0000-000000000001'
M2 = '30000000-0000-0000-0000-000000000002'
KID = '30000000-0000-0000-0000-000000000003'
RECIPE = '40000000-0000-0000-0000-000000000001'
RES = '50000000-0000-0000-0000-000000000001'

class DatabaseRules(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory(prefix='genussio-rls-', dir='/tmp')
        cls.base = Path(cls.tmp.name)
        cls.env = dict(os.environ, PGHOST=str(cls.base), PGPORT='55439', PGUSER='postgres', PGDATABASE='postgres')
        for key in ['PGPASSWORD', 'PGSERVICE', 'PGSERVICEFILE', 'PGSSLMODE', 'PGOPTIONS']:
            cls.env.pop(key, None)
        cls.prefix = []
        if os.geteuid() == 0:
            local_user = pwd.getpwnam('lovable')
            os.chown(cls.base, local_user.pw_uid, local_user.pw_gid)
            cls.prefix = ['setpriv', f'--reuid={local_user.pw_uid}', f'--regid={local_user.pw_gid}', '--clear-groups', '--']
        subprocess.run(cls.prefix + ['initdb', '-D', str(cls.base/'data'), '-U', 'postgres', '-A', 'trust'], env=cls.env, check=True, capture_output=True)
        subprocess.run(cls.prefix + ['pg_ctl', '-D', str(cls.base/'data'), '-l', str(cls.base/'server.log'), '-o', f"-k {cls.base} -p 55439 -c listen_addresses='' -c wal_level=logical", 'start', '-w'], env=cls.env, check=True, capture_output=True)
        cls.sql('''CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
          CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);
          CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
            SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid; $$;
          GRANT USAGE ON SCHEMA auth, public TO anon, authenticated, service_role;
          GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated, service_role;
          ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
          ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
          CREATE PUBLICATION supabase_realtime;''')
        cls.sql('''CREATE SCHEMA storage; CREATE TABLE storage.objects(id uuid default gen_random_uuid(), bucket_id text, name text); ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY; GRANT USAGE ON SCHEMA storage TO anon,authenticated,service_role; GRANT SELECT,INSERT,UPDATE,DELETE ON storage.objects TO anon,authenticated,service_role;''')
        for migration in sorted((ROOT/'supabase/migrations').glob('*.sql')):
            cls.sql(migration.read_text())
        cls.sql(f'''INSERT INTO auth.users VALUES ('{U1}'), ('{U2}'), ('{ADMIN}'), ('{OUTSIDER}');
          INSERT INTO public.admins(user_id) VALUES ('{ADMIN}');
          INSERT INTO public.households(id,created_by) VALUES ('{H1}','{U1}'), ('{H2}','{OUTSIDER}');
          INSERT INTO public.household_members(id,household_id,user_id) VALUES ('{M1}','{H1}','{U1}'), ('{M2}','{H1}','{U2}');
          INSERT INTO public.household_members(id,household_id,is_kid) VALUES ('{KID}','{H1}',true);
          INSERT INTO public.recipes(id) VALUES ('{RECIPE}');
          INSERT INTO public.reservations(id,household_id,user_id) VALUES ('{RES}','{H1}','{U1}');''')

    @classmethod
    def tearDownClass(cls):
        subprocess.run(cls.prefix + ['pg_ctl', '-D', str(cls.base/'data'), 'stop', '-m', 'fast', '-w'], env=cls.env, check=True, capture_output=True)
        cls.tmp.cleanup()

    @classmethod
    def sql(cls, query, user=None, role=None, fail=False):
        if user or role:
            query = f"BEGIN; SET LOCAL ROLE {role or 'authenticated'}; SET LOCAL request.jwt.claim.sub = '{user or ''}';\n{query}\nROLLBACK;"
        result = subprocess.run(['psql', '-X', '-qAt', '-v', 'ON_ERROR_STOP=1'], input=query, text=True, capture_output=True, env=cls.env)
        if fail:
            if result.returncode == 0:
                raise AssertionError('Expected the real database to reject this operation')
            if 'permission denied' not in result.stderr and 'row-level security' not in result.stderr and 'cannot be reassigned' not in result.stderr and 'check constraint' not in result.stderr and 'Forbidden' not in result.stderr:
                raise AssertionError(result.stderr)
        elif result.returncode:
            raise AssertionError(result.stderr)
        return result.stdout.strip()

    def test_all_18_tables_have_rls(self):
        self.assertEqual(self.sql("SELECT count(*) FROM pg_tables WHERE schemaname='public' AND rowsecurity"), '18')
    def test_no_inherited_anon_or_truncate_access(self):
        self.assertEqual(self.sql("SELECT bool_and(NOT has_table_privilege('anon','public.'||tablename,'SELECT') AND NOT has_table_privilege('authenticated','public.'||tablename,'TRUNCATE')) FROM pg_tables WHERE schemaname='public';"), 't')
    def test_profile_own_creation(self):
        self.sql(f"INSERT INTO public.profiles(id) VALUES ('{U1}');", U1)
    def test_profile_other_creation_blocked(self):
        self.sql(f"INSERT INTO public.profiles(id) VALUES ('{U2}');", U1, fail=True)
    def test_profile_own_read_update_other_hidden(self):
        self.sql(f"INSERT INTO public.profiles(id) VALUES ('{U1}'),('{U2}');")
        try:
            self.assertEqual(self.sql("SELECT count(*) FROM public.profiles; UPDATE public.profiles SET display_name='Self' RETURNING id;", U1), f'1\n{U1}')
            self.assertEqual(self.sql("SELECT count(*) FROM public.profiles;", ADMIN), '2')
        finally:
            self.sql(f"DELETE FROM public.profiles WHERE id IN ('{U1}','{U2}');")
    def test_household_members_read_only_own(self):
        self.assertEqual(self.sql("SELECT id FROM public.households;", U1), H1)
    def test_household_members_update(self):
        self.assertEqual(self.sql(f"UPDATE public.households SET name='Updated' WHERE id='{H1}' RETURNING id;", U2), H1)
    def test_household_nonmember_update_blocked(self):
        self.assertEqual(self.sql(f"UPDATE public.households SET name='No' WHERE id='{H1}' RETURNING id;", OUTSIDER), '')
    def test_household_direct_insert_blocked(self):
        self.sql(f"INSERT INTO public.households(created_by) VALUES ('{U1}');", U1, fail=True)
    def test_household_delete_creator_only(self):
        self.assertEqual(self.sql(f"DELETE FROM public.households WHERE id='{H1}' RETURNING id;", U2), '')
        self.assertEqual(self.sql(f"DELETE FROM public.households WHERE id='{H1}' RETURNING id;", U1), H1)
    def test_reservation_member_read(self):
        self.assertEqual(self.sql("SELECT id FROM public.reservations;", U2), RES)
    def test_reservation_outsider_hidden(self):
        self.assertEqual(self.sql("SELECT id FROM public.reservations;", OUTSIDER), '')
    def test_reservation_own_geklickt_insert(self):
        self.sql(f"INSERT INTO public.reservations(household_id,user_id,status) VALUES ('{H1}','{U2}','geklickt');", U2)
    def test_reservation_other_user_insert_blocked(self):
        self.sql(f"INSERT INTO public.reservations(household_id,user_id,status) VALUES ('{H1}','{U2}','geklickt');", U1, fail=True)
    def test_reservation_other_household_insert_blocked(self):
        self.sql(f"INSERT INTO public.reservations(household_id,user_id,status) VALUES ('{H2}','{U1}','geklickt');", U1, fail=True)
    def test_reservation_paid_refunded_insert_blocked(self):
        for status in ['bezahlt','erstattet']:
            self.sql(f"INSERT INTO public.reservations(household_id,user_id,status) VALUES ('{H1}','{U1}','{status}');", U1, fail=True)
    def test_reservation_update_admin_only(self):
        self.assertEqual(self.sql(f"UPDATE public.reservations SET status='bezahlt' WHERE id='{RES}' RETURNING id;", U1), '')
        self.assertEqual(self.sql(f"UPDATE public.reservations SET status='bezahlt' WHERE id='{RES}' RETURNING id;", ADMIN), RES)
    def test_reservation_delete_admin_only(self):
        self.assertEqual(self.sql(f"DELETE FROM public.reservations WHERE id='{RES}' RETURNING id;", U1), '')
        self.assertEqual(self.sql(f"DELETE FROM public.reservations WHERE id='{RES}' RETURNING id;", ADMIN), RES)
    def test_members_own_kid_not_other_adult_edit(self):
        for member in [M1,KID]:
            self.assertEqual(self.sql(f"UPDATE public.household_members SET display_name='Changed' WHERE id='{member}' RETURNING id;", U1), member)
        self.assertEqual(self.sql(f"UPDATE public.household_members SET display_name='No' WHERE id='{M2}' RETURNING id;", U1), '')
    def test_membership_identity_reassignment_blocked(self):
        self.sql(f"UPDATE public.household_members SET user_id='{U1}',is_kid=false WHERE id='{KID}';", U1, fail=True)
    def test_kid_creation_but_account_creation_blocked(self):
        self.sql(f"INSERT INTO public.household_members(household_id,is_kid) VALUES ('{H1}',true);", U1)
        self.sql(f"INSERT INTO public.household_members(household_id,user_id) VALUES ('{H1}','{OUTSIDER}');", U1, fail=True)
    def test_swipes_own_kid_not_other_adult(self):
        for member in [M1,KID]:
            self.sql(f"INSERT INTO public.swipes(household_id,member_id,recipe_id,week_start,vote) VALUES ('{H1}','{member}','{RECIPE}','2026-11-09','like');", U1)
        self.sql(f"INSERT INTO public.swipes(household_id,member_id,recipe_id,week_start,vote) VALUES ('{H1}','{M2}','{RECIPE}','2026-11-09','like');", U1, fail=True)
    def test_beta_codes_no_app_access(self):
        self.sql('SELECT * FROM public.beta_codes;', U1, fail=True)
    def test_catalog_read_only_signed_in(self):
        self.assertEqual(self.sql(f"SELECT id FROM public.recipes WHERE id='{RECIPE}';", U1), RECIPE)
        self.sql('INSERT INTO public.recipes(title) VALUES (\'No\');', U1, fail=True)
        self.sql('SELECT * FROM public.recipes;', role='anon', fail=True)
    def test_events_feedback_own_submit_admin_read(self):
        for table,field,value in [('events','name','test'),('feedback','kind','allgemein')]:
            self.sql(f"INSERT INTO public.{table}(user_id,{field}) VALUES ('{U1}','{value}');", U1)
            self.sql(f"INSERT INTO public.{table}(user_id,{field}) VALUES ('{U2}','{value}');", U1, fail=True)
            self.sql(f"INSERT INTO public.{table}(user_id,{field}) VALUES ('{U1}','{value}');")
            try:
                self.assertEqual(self.sql(f'SELECT count(*) FROM public.{table};', U1), '0')
                self.assertEqual(self.sql(f'SELECT count(*) FROM public.{table};', ADMIN), '1')
            finally:
                self.sql(f"DELETE FROM public.{table} WHERE user_id='{U1}';")
    def test_admin_no_self_assignment(self):
        self.sql(f"INSERT INTO public.admins(user_id) VALUES ('{U1}');", U1, fail=True)
        self.assertEqual(self.sql('SELECT count(*) FROM public.admins;', U1), '0')
    def test_realtime_three_tables(self):
        self.assertEqual(self.sql("SELECT string_agg(tablename,',' ORDER BY tablename) FROM pg_publication_tables WHERE pubname='supabase_realtime';"), 'meal_plan_entries,shopping_list_items,swipes')
    def test_vienna_monday(self):
        self.assertEqual(self.sql("SELECT public.current_week_start() = date_trunc('week',now() AT TIME ZONE 'Europe/Vienna')::date;", U1), 't')
    def test_create_household_atomic_code_and_membership(self):
        self.sql("INSERT INTO beta_codes(code,max_uses) VALUES ('TEST-CREATE',1);")
        try:
            result = self.sql("SELECT create_household('Test','TEST-CREATE',ARRAY['spar'],30,3,20); SELECT uses FROM beta_codes WHERE code='TEST-CREATE';", OUTSIDER, role='service_role')
            self.assertEqual(result.splitlines()[-1], '1')
            self.assertEqual(self.sql("SELECT count(*) FROM household_members WHERE user_id=auth.uid();", OUTSIDER), '0')
        finally:
            self.sql("DELETE FROM beta_codes WHERE code='TEST-CREATE';")
    def test_create_household_authenticated_rpc(self):
        self.sql("INSERT INTO beta_codes(code,max_uses) VALUES ('TEST-RPC',1);")
        try:
            result=self.sql("SELECT create_household('Test','TEST-RPC',ARRAY['spar'],200,7,60); SELECT count(*) FROM household_members WHERE user_id=auth.uid();", OUTSIDER)
            self.assertEqual(result.splitlines()[-1], '1')
        finally: self.sql("DELETE FROM beta_codes WHERE code='TEST-RPC';")
    def test_invalid_inactive_exhausted_beta_codes(self):
        self.sql("INSERT INTO beta_codes(code,active,max_uses,uses) VALUES ('TEST-INACTIVE',false,1,0),('TEST-FULL',true,1,1);")
        try:
            for code in ['TEST-MISSING','TEST-INACTIVE','TEST-FULL']:
                self.assertRaises(AssertionError, self.sql, f"SELECT create_household('Test','{code}',ARRAY['spar'],80,5,45);", OUTSIDER)
        finally: self.sql("DELETE FROM beta_codes WHERE code IN ('TEST-INACTIVE','TEST-FULL');")
    def test_join_requires_no_beta_code_and_only_one_household(self):
        code=self.sql(f"SELECT invite_code FROM households WHERE id='{H1}';")
        self.assertEqual(self.sql(f"SELECT join_household('{code}'); SELECT count(*) FROM household_members WHERE user_id=auth.uid();", OUTSIDER), f'{H1}\n1')
        other=self.sql(f"SELECT invite_code FROM households WHERE id='{H2}';")
        self.assertRaises(AssertionError,self.sql,f"SELECT join_household('{other}');",U1)
    def test_join_same_household_is_idempotent(self):
        code=self.sql(f"SELECT invite_code FROM households WHERE id='{H1}';")
        self.assertEqual(self.sql(f"SELECT join_household('{code}'); SELECT join_household('{code}');",U1),f'{H1}\n{H1}')
    def test_one_household_unique_index(self):
        self.assertRaises(AssertionError,self.sql,f"INSERT INTO household_members(household_id,user_id) VALUES ('{H2}','{U1}');")
    def test_invite_preview_reveals_name_only_with_valid_code(self):
        code=self.sql(f"SELECT invite_code FROM households WHERE id='{H1}';")
        self.assertEqual(self.sql(f"SELECT invite_household_name('{code}') IS NOT NULL; SELECT invite_household_name('INVALID') IS NULL;",OUTSIDER),'t\nt')
        self.sql(f"SELECT invite_household_name('{code}');",role='anon',fail=True)

    def test_admin_catalog_write_all_six_tables(self):
        for table,values,field in [
          ('recipes',"title='Admin'",'title'),
          ('recipe_ingredients',f"recipe_id='{RECIPE}',ingredient_key='test'",'ingredient_key'),
          ('deals',"product_name='Admin'",'product_name'),
          ('ingredient_prices',"ingredient_key='test',store='hofer'",'ingredient_key'),
          ('recipe_translations',f"recipe_id='{RECIPE}',locale='en',title='Admin'",'title'),
          ('ingredient_translations',"ingredient_key='test',locale='en',display_name='Admin'",'display_name')]:
            columns=','.join(v.split('=')[0] for v in values.split(',')); literals=','.join(v.split('=',1)[1] for v in values.split(','))
            self.sql(f"INSERT INTO {table}({columns}) VALUES ({literals}); UPDATE {table} SET {field}='Edited' WHERE {field} IN ('Admin','test'); DELETE FROM {table} WHERE {field}='Edited';",ADMIN)
            self.sql(f"INSERT INTO {table}({columns}) VALUES ({literals});",U1,fail=True)
            self.assertEqual(self.sql(f"UPDATE {table} SET {field}='No' WHERE {field} IN ('Admin','test') RETURNING {field}; DELETE FROM {table} WHERE {field} IN ('Admin','test') RETURNING {field};",U1),'')
    def test_image_upload_admin_only_public_read(self):
        self.sql("INSERT INTO storage.objects(bucket_id,name) VALUES('recipe-images','test.jpg'); UPDATE storage.objects SET name='edited.jpg'; DELETE FROM storage.objects;",ADMIN)
        self.sql("INSERT INTO storage.objects(bucket_id,name) VALUES('recipe-images','test.jpg');",U1,fail=True)
        self.sql("INSERT INTO storage.objects(bucket_id,name) VALUES('recipe-images','test.jpg');")
        try: self.assertEqual(self.sql("SELECT name FROM storage.objects;",role='anon'),'test.jpg')
        finally: self.sql("DELETE FROM storage.objects WHERE name='test.jpg';")
    def test_seed_recipes_translations_prices_deals(self):
        self.assertEqual(self.sql("SELECT count(*) FROM recipes WHERE id::text LIKE '60000000-%' AND prep_minutes BETWEEN 15 AND 60 AND jsonb_array_length(steps)=3;"),'15')
        self.assertEqual(self.sql("SELECT count(*) FROM recipe_translations WHERE recipe_id::text LIKE '60000000-%';"),'60')
        self.assertEqual(self.sql("SELECT count(*) FROM deals WHERE valid_from='2026-11-09' AND valid_to='2026-11-15';"),'12')
        self.assertEqual(self.sql("SELECT count(*) FROM (SELECT DISTINCT ingredient_key FROM recipe_ingredients WHERE recipe_id::text LIKE '60000000-%' AND NOT is_pantry) i WHERE (SELECT count(*) FROM ingredient_prices p WHERE p.ingredient_key=i.ingredient_key)!=4;"),'0')
        self.assertEqual(self.sql("SELECT count(*) FROM recipe_ingredients i WHERE recipe_id::text LIKE '60000000-%' AND (SELECT count(*) FROM ingredient_translations t WHERE t.ingredient_key=i.ingredient_key AND locale IN ('de-DE','en','it','es'))!=4;"),'0')
    def test_recipe_import_atomic_and_admin_guard(self):
        payload='''{"title":"Test import","description":"Test","prep_minutes":20,"base_servings":4,"diet_tags":[],"allergens":[],"main_ingredient":"test","steps":[{"text":"Cook"}],"ingredients":[{"ingredient_key":"test","display_name":"Test","quantity":1,"unit":"g","aisle":"Sonstiges","is_pantry":false}],"translations":{"en":{"title":"English test","description":"Test","steps":[{"text":"Cook"}]}}}'''
        self.sql(f"SELECT import_recipe('{payload}'::jsonb);",U1,fail=True)
        self.assertEqual(self.sql(f"SELECT import_recipe('{payload}'::jsonb); SELECT import_recipe('{payload}'::jsonb); SELECT count(*) FROM recipes WHERE title='Test import'; SELECT count(*) FROM recipe_ingredients WHERE recipe_id=(SELECT id FROM recipes WHERE title='Test import');",ADMIN).splitlines()[-2:],['1','1'])

if __name__ == '__main__':
    unittest.main(verbosity=2)
