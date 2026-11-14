# External Supabase sign-in setup

## Confirmed

The hosted public Auth settings report Google and email enabled, signup allowed, and email confirmation required. The app uses passwordless email OTP and Google OAuth, inserts profiles only when missing, and uses Supabase's built-in verified-email identity linking (no client email matching or duplicate account creation).

## Required dashboard checks before release

These settings cannot be changed or fully inspected through the available external-project tools:

- Authentication → URL Configuration: add the exact callback URLs for each origin. Normal sign-in returns to `/login`; invited users return to `/join/INVITECODE` on that origin, a public route. Configure an origin-scoped `/join/*` redirect pattern (never an unrestricted all-origin wildcard). Origins: `https://genussio.at`, `https://www.genussio.at`, `https://pixel-perfect-replay-65247.lovable.app`, `https://id-preview--00afb02c-1909-4754-94b5-2c267bc473f7.lovable.app`.
- Authentication → Email: set OTP length to **6**. Ensure both Magic Link and Confirm Signup templates show `{{ .Token }}` and link to `{{ .ConfirmationURL }}` so first-time and returning users receive both choices. The app sends the person's active language as `data.locale`. If custom auth email templates exist, consume that metadata to select their language; this task did not replace or scaffold the external provider's templates.
- Google provider: confirm its configured Web OAuth client uses `https://shozcwrgguwdekpuibvi.supabase.co/auth/v1/callback` in Google Cloud Console. The provider is enabled, but client validity was not verified. Google handles the same confirmed email as an existing email account through Supabase automatic identity linking; verify this with a real account in both orders.
- Test Google from the published app or preview opened in a new tab, not inside the editor iframe.

## Verification limits

No session can be minted for an externally managed Supabase project. Public UI and redirects were driven in Chromium; database logic was tested in isolated PostgreSQL, not by adding test accounts or households to the connected project. Real email delivery, OTP redemption, Google consent/callback, identity linking, and signed-in household UI read-back remain unverified pending a real user session/provider configuration.