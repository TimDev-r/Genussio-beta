# Selected security findings review

Reviewed only the eight findings selected on November 12, 2026. Live policies were read back without changing database or application behavior.

Six shared catalog read warnings were marked not applicable using the finding-management tool: offers, recipes, ingredients, prices and their translations are deliberately shared among signed-in users, as explicitly requested. All six tables retain admin-only mutation policies. These were false positives, not vulnerabilities fixed through code changes.

Public recipe-image read access is also explicitly requested and narrowly limited to recipe-images. Upload, edit and removal require admin authorization. Ignoring this critical-rated warning requires the user's approval; it remains active until approved. The bucket remains blocked by workspace public-bucket settings, unchanged by this review.

Leaked-password protection remains active and unfixed. The connected external Supabase Auth setting must be enabled by a project administrator in Authentication settings; Supabase requires Pro or above. The app's passwordless sign-in UI does not establish that password endpoints are disabled, so this finding was not ignored. No available tool here changes the external project's leaked-password setting.

No other findings were fixed or ignored. Security guidance: https://docs.lovable.dev/features/security
## Resolution (2026-11-12)
- lov_db_auth_leaked_password_protection_v1: ignored as not applicable — Genussio is passwordless (email link, 6-digit code, Google only); no user ever sets a password.
- lov_db_storage_objects_owner_unbound_v1_a44e60c54780b81f: ignored as intended — recipe images are public by design; upload/change remains admin-only. User approved.
