# Roadmap

- [x] Add admin-only content imports and image-upload controls with access-rule tests.
- [x] Add 15 translated recipes, 120 four-store prices, and 12 current-week sample deals through a seed migration.
- [x] Verify import validation, translation fallbacks, seed completeness, and admin database access in isolated tests.
- [ ] Create the public recipe-images bucket; blocked by workspace public-bucket policy (owner must enable it in Privacy & Security).
- [ ] Verify signed-in admin imports and actual uploads end-to-end; blocked by externally managed Supabase session and public-bucket policy.

- [x] Prepare the full Genussio database migration for review.
- [x] Apply the requested profile, household, and reservation access changes and show only those sections.
- [x] Execute the revised migration, restrict inherited grants, and verify its access rules.
- [x] Implement email-link/code and Google sign-in, profile attribution, and return-to-invite routing.
- [x] Implement secure household creation/joining and one-household rules with database tests.
- [x] Build onboarding, invitations, QR/share, and editable household/member settings in all languages.
- [ ] Verify real email/Google account linking and signed-in household UI; blocked by externally managed Supabase session and unverified callback/email-template settings. Public browser checks and isolated database tests completed; setup requirements documented.
- [x] Build the weekly swipe deck (generate_deck) and show it with the week label on the Swipen tab.
- [ ] Build Swipen tab: member picker, swipe card stack with gestures, undo, progress, finished state, more-cards.
- [ ] Add get_matches, add_cards, shared deck-candidate helper, refresh_deck top-up, favorite-from-past-matches.
- [ ] Build Matches tab with realtime celebration and plan-call-to-action.
- [ ] Track swipe_started, deck_completed, match_created, more_cards_requested, deck_adjusted events.
