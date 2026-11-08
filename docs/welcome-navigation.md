# Welcome-first navigation

Visitors who are not signed in see the existing Google/email welcome form at `/`. The page keeps the botanical glass design and its single optional “Continue exploring” control.

`/explore` contains guest text search and one contextual Sign in button. Keeping it as a separate destination preserves useful guest access while making authentication the clear front door. Removing exploration would make guests search for another way to try the app.

Signed-in visitors opening `/` go directly to their existing dashboard at `/explore`. The Explore tab uses that same URL. The welcome form lives outside the tab navigator so it unmounts when visitors leave it.

`/login` remains available for contextual authentication. A selected search or species is retained through sign-in and cancellation. Without a selected public result, Continue exploring opens `/explore`, which avoids a loop back to the welcome form. Successful authentication from the homepage or guest explorer goes to the dashboard; protected deep links retain their specific return target.

The root page does not mount private queries for guests. Existing authenticated backend ownership and guest search privacy remain unchanged.

Adversarial checks cover first arrival, guest entry, direct `/explore` loading, one sign-in invitation, authentication return targets, cancellation without a welcome loop, signed-in root navigation, and rejection of external return URLs. The Vercel route allowlist explicitly serves `/explore` on direct loads and refreshes.

## Production verification

Promoted READY revision `dpl_5KkPHZcWuAFZYZH784pRSZ2X8ZTs` to [Plantopedia](https://plantopedia-nine.vercel.app/). Native Safari confirmed the welcome form at the public root and the Continue exploring transition to `/explore`, with one visible Sign in control. Contextual login cancellation also preserves the search in local Safari. All 27 routes and 184 exported files passed deployment comparison. Public root, explore, login and search HTML and bundles match the tested build; health/readiness return 200 and private endpoints reject unsigned requests. The runtime query returned zero error/fatal entries.

Validation: 179 component tests, 97 unit tests, 72 script tests, type checking, lint, client-secret checks and tutorial archive integrity checks. See [release evidence](evidence/welcome/release-verification.json).
