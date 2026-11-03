# Stabilization Navigator (feature branch)
Mobile-first `stabilization.html` connects Drop Zone's **I NEED STABILIZATION** button to guided pathways for insurance, medical care, food, housing, benefits, and other resources. `admin.html` is a phone-friendly resource editor.

## What works without a backend
- Public guided health-insurance walkthrough, state selection, Medi-Cal explanation for California, and official enrollment links.
- Medical emergency notice, illness/injury pathways, external search, 211, and Pantry Goblin.
- No user account required for public navigation.
- Location permission is optional. The public navigator does not send location to EMTizzle AI.

## Enable your private editor (required for shared resource listings)
1. Select a Supabase project you control.
2. Run `supabase/stabilization.sql` in its SQL editor. Review the SQL first.
3. In Authentication > Users, create your personal editor account. Enable MFA and disable open signups if appropriate.
4. From the SQL editor only, insert your Auth user UUID into `public.dz_admins`. Do not put the UUID in GitHub or the browser.
5. Put the project's **public URL** and **publishable key** in `resource-config.js`. **Never use the secret/service_role key**.
6. Deploy the updated static site. Visit `admin.html` on your phone, sign in, add a resource, then publish it.
7. Confirm that anonymous visitors see only published resources and cannot insert, update, or delete records. Confirm an ordinary signed-in non-admin user cannot edit.
8. Verify your health-resource details and office hours with official sources before publishing.

## Known limitations
- No backend is configured or deployed by this pull request. The resource board will say it is being connected until configured.
- Search is a user-initiated external web/maps search, not a built-in verified provider API. Results may be wrong or outdated.
- City/ZIP filtering currently performs a text match; a ZIP will not match unless included in the address field. No geospatial ranking.
- The state-specific insurance path is California-focused; other states link to official Medicaid and HealthCare.gov guidance.
- Phone and clinic details are not pre-seeded because they must be verified.
- External CDN scripts require connectivity; pin/self-host the Supabase client before production if offline resilience is needed.
- No protected health information should be collected or stored in the resource manager.

## Safety
Medical content is informational, not diagnosis. For emergencies call 911. Emergency-department screening/stabilization obligations do not guarantee zero bills.

## Expanded navigator (November 3)
- Three-step health coverage walkthrough: current insurance status, kind of help, and next action. The wizard intentionally avoids collecting names, income, medical history, or SSNs.
- State-aware official resource cards: BenefitsCal and California DHCS for California, Medicaid.gov and HealthCare.gov for other states; 211 and HRSA health centers for relevant needs.
- Five-step stabilization mission checklist stored in browser localStorage, with an explicit reset button and copy-to-clipboard plan. Do not use the checklist on a shared device if privacy is a concern.
- These official resources are starting points, not a substitute for eligibility screening or personalized medical advice.

## Prelaunch manual QA
1. Open on a small Android screen. Confirm navigation from the existing I NEED STABILIZATION button.
2. Test California and at least one other state, then test all ten categories.
3. Complete the insurance wizard with every option; check back and restart.
4. Confirm checklist persists on refresh and resets, and copy works only when browser permission allows.
5. Verify public resource cards cannot render injected HTML from resource descriptions.
6. Test a non-admin account against all write operations. Confirm published-only anonymous reads.
7. Test when offline and when Supabase is unconfigured; ensure the official resource links remain usable when connectivity returns.
8. Confirm all externally listed office hours, eligibility, and phone numbers before marking anything field verified.
