# Login workflow and profile history

Guests can search the bundled field guide by text and open species information. Every guest screen has exactly one **Sign in** button, in a glass invitation explaining why to sign in. Search results offer one contextual sign-in action; species pages offer the same single **Sign in** action in the context of the selected plant. A no-match message appears directly below the search area; the one sign-in card explains both saved searches and photo identification. No secondary scan sign-in action or modal interrupts a search.

Garden, scan, sightings, care tracking, rewards and chat require a session. Account-only tabs appear after sign-in; direct links show the same invitation before private queries, local drafts, or camera permissions mount. Google and email controls appear immediately. **Continue exploring** returns to browsing. Web sign-in and account creation resume the search, species, or feature the user chose, using an allowlisted internal return path.

Green and pollen-tinted glass surfaces use the existing appearance system, native iOS glass where supported, and translucent web surfaces. Reduced-transparency/high-contrast settings get opaque surfaces. Touch controls retain their existing minimum sizes, labels and visible keyboard focus. The guest home deliberately omits Pollen, quests, device plants and “Recent discoveries,” including data left by an older version.

## Backend ownership

- `/v1/me/search-history` reads, records and clears the ten most recent searches. Completed catalog searches save independently of opening a result, including zero-result searches. Private garden searches record their scope as well.
- `/v1/me/garden` stores garden activity, catalog saves, sightings, region, consent and progress. Optimistic revisions prevent a second tab/device from overwriting newer data; clients rebase conflicting transforms.
- Both use `users/<verified Clerk uid>/profile/...` in the existing Firestore repository. Client-supplied owner IDs are rejected. Missing/invalid tokens fail with 401; deleting/deleted accounts cannot write. Account deletion removes these records.
- `/v1/identify/:mode` requires authentication. The former `/public/identify/:mode` route cannot reach a provider. Identification receipts are scoped to the verified profile, including replay protection. Existing provider-retention/enablement settings still apply.
- Guest browsing performs no private reads, history writes, reward writes, image submission or device-garden creation. Old guest data is not assigned to a newly signed-in account.

Local originals and unfinished capture drafts remain device-specific. Plant records/photos and conversations continue to use the existing authenticated backend. Saved sighting metadata can be opened from the profile without its original device draft; this change does not add cloud storage for original sighting photos.

## Adversarial UX and implementation review

This session reviewed the flow using the design-critique and accessibility checklists and checked the underlying ownership boundaries. Findings were corrected before deployment:

| Challenge | Resulting behavior |
| --- | --- |
| Guest search appears to create a personal garden | Separate guest screen; no personal queries or cached guest garden render. |
| Too many competing invitations | One contextual Sign in button per guest screen; removed the duplicate header control, redundant scan promotion, guest account tabs and feature-benefit list. |
| Sign-in discards the search or chosen plant | Safe internal return target retained by web sign-in, signup and cancellation; arriving route parameters refresh search fields/results. |
| Login hides email/create-account behind another tap | Native email controls open immediately; web Clerk form mounts directly. |
| Guest opens a protected deep link or calls the image relay | UI gates mount before private work; backend independently requires a verified token. |
| Only clicked searches are saved | Completed text searches save separately, including no-match queries. |
| Another device overwrites history, or a slow save undoes Clear | Revision-checked garden writes and serialized search-history mutations. |
| Backend failure silently claims data was saved | Garden writes reject; search shows a specific save failure and Retry control. |
| Account deletion races an image-provider response | Both successful and failed response finalization recheck the account before writing. |

Automated checks cover guest browsing/gates, login return validation, sign-in/signup callbacks, profile isolation, restart persistence, failed writes, concurrent updates, history clearing and deletion. Local Safari verification exercised guest home → text search → login, visible Google/email controls, and returning to the search. A real Google authentication round trip, physical-device camera/voice and assistive-technology acceptance are separate checks; component tests do not establish those results.

## Production verification

Promoted READY deployment `dpl_AYKBnmSS62q3Gjsy6UwmdJHZEt6X` to [Plantopedia](https://plantopedia-nine.vercel.app). The production alias resolves to that deployment. All 26 candidate routes and 184 exported files passed verification; the public HTML and entry bundles match the tested build. Health/readiness return 200; private history, garden and image requests without an app session return 401. The post-promotion runtime query returned zero error/fatal entries with no excluded intervals.

Automated validation: 169 component, 216 backend, 97 unit and 72 script tests (554 total), type checking, lint, and the iOS/Android/web client-secret guard. Source came from a frozen working-tree snapshot; no commit or push was created. See [release evidence](evidence/authentication/release-verification.json).
