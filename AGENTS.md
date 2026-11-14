<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules
- i18n: per-render i18next instance created in `__root.tsx` from the root loader's locale (cookie, else Accept-Language) so SSR and client render the same language; never change the shared singleton's language.
- Marketing attribution (beta code, UTM) lives in localStorage via `src/lib/attribution.ts` until sign-up stores it.
- Signed-in app and onboarding live under the client-only `_authenticated` gate; `/app` keeps its bottom tabs and household membership routing, while invite links remain public.
- Household reads and ordinary edits use authenticated server functions with caller-scoped RLS; creation, joining and invite-name lookup use authenticated database RPCs because they require atomic membership/code changes.
- Register a single root auth subscriber; profile creation is insert-if-absent, and bearer attachment is separate function middleware to authenticate protected server calls.
- Database permissions must explicitly revoke inherited anon/authenticated privileges before granting intended actions; the connected Supabase has broad default grants, including TRUNCATE which bypasses RLS.
- Household/admin policies use caller-scoped SECURITY DEFINER helpers with fixed search_path to avoid recursive membership reads; never accept a caller-supplied user ID for authorization.
- SQL access-rule tests run all tool-generated migrations in isolated local PostgreSQL via `python3 src/test/database-rls.test.py`; never seed test identities or rows into the connected project.
- Content imports validate on both client and authenticated server; recipe replacement uses an admin-checked SECURITY INVOKER RPC with a title lock so ingredients and translations commit atomically.
- Catalog display uses shared field-level locale fallbacks; sample content belongs in literal migration inserts, never page-load seeding.
- Deck, matching and "Mehr Karten" SQL (deck_candidates, generate_deck, add_cards, get_matches, refresh_deck and its triggers) was written by hand outside Lovable: `supabase/manual/20261114_prompt6_matching.sql`, applied via the Supabase SQL Editor. `deck_candidates` is the single source of the deck filter and cost rules; change it there, not in each function.
- Weekly plan and shopping list SQL (create_plan, build_shopping_list, the meal_plan_entries triggers that rebuild the list after every plan change) is in `supabase/manual/20261114_prompt7_plan_list.sql`, also applied by hand. Change the plan through meal_plan_entries and let the triggers rebuild the list; never write list items for recipes directly.
- `meal_plan_entries.cooked_at` comes from `supabase/manual/20261114_prompt8_cooked.sql` (applied by hand, not yet in the generated types). Cook mode lives in `src/components/CookMode.tsx`, the recipe page in `src/components/RecipeView.tsx`.
