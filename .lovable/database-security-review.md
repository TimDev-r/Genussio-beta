# Genussio database security review

The approved schema and revised profile/household/reservation policies were applied. A follow-up permissions-only migration was necessary because the connected database automatically granted ALL privileges to anon and authenticated on new tables and sequences. It revokes those inherited privileges and grants only the reviewed operations; in particular, app users cannot TRUNCATE tables, bypassing RLS.

## Reviewed linter notices

- `beta_codes` has RLS enabled with no policies intentionally: the brief forbids all direct app access. Both anon and authenticated have no grants.
- `is_member(uuid)` and `is_admin()` are intentionally SECURITY DEFINER and executable by authenticated users: policies require them to bypass recursive membership/admin reads. Both use fixed search_path, scope identity to auth.uid(), return only a boolean, perform no writes, and deny anonymous execution. Revoking authenticated execution would break the requested policies. These notices do not identify an escalation path in these functions.
- `current_week_start()` was explicitly requested as SECURITY DEFINER. It uses fixed search_path and returns only a Vienna-local date, with no data access or writes; anonymous execution is denied.
- The existing integration-owned `rls_auto_enable()` event-trigger function had anonymous/authenticated-execution notices before this work. It was not changed. Those pre-existing notices are separate from the newly added helpers.

## Verification

Live catalog read-back confirms 18 RLS-enabled tables, 18 update-timestamp triggers, the revised policies, and Realtime on swipes, meal_plan_entries and shopping_list_items. Isolated PostgreSQL tests replay the exact tool-generated migrations with Supabase-like broad default privileges and exercise actual role-scoped operations for adults, kids, outsiders, and admins. Tests do not write to the connected Supabase database.

## Sign-in and onboarding additions

The creation and joining RPCs are intentionally SECURITY DEFINER and callable only by authenticated users. They authorize exclusively via auth.uid(), use a fixed search_path, and never accept a caller-supplied user identity. Creation locks the beta-code row before counting a use; all code and household/member changes are atomic. A unique partial index prevents one account from joining multiple households, including concurrent attempts. Joining an existing household is idempotent. The invite-name RPC reveals only the household name for an exact valid invitation code and requires sign-in. These authenticated-execution linter notices are expected for the requested privileged workflow, not a reason to revoke required access. The follow-up quick security scan found no warning/error-level findings; existing catalog read-access and password-protection informational findings remain.

35 isolated database tests and 21 frontend profile/logic/routing/language tests pass. Actual authenticated browser checks cannot be performed for this externally managed Supabase project without an available session; public sign-in screens and invite-return/protected redirects are checked separately. Existing dependency advisories were detected; none originate in the added QR dependency.