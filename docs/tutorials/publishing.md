# Publishing the course on Vercel

The Expo web export is generated in `server/public`. Vercel does not publish `docs` automatically. After a successful Expo export, `scripts/build-vercel-web.mjs` calls `publishTutorials`. The publisher assembles a bounded course tree in `server/public/tutorials`. The existing Build Output API packager copies it into `server/.vercel/output/static/tutorials` alongside the app. Generated files remain ignored by Git.

The publisher includes the HTML reader, assets, ZIP downloads, notebooks, exercise workspace, and review evidence. It excludes course build tools and lesson authoring data. It rejects hidden/private paths, traversal, symlinks, and unexpected source locations. It checks every ancestor of a source path, escapes source text into inert HTML, and prepares the full tree before replacing an earlier publication. This boundary is not a general secret scanner for prose or ZIP contents. Continue running the course artifact verification when rebuilding downloads.

Repository links in the hosted guide point to bounded, readable source snapshots from the deployment. A missing companion file receives an explicitly labeled unavailable page; `publication.json` lists these paths. The local course and ZIP contents keep their portable repository links. Downloaded notebooks run in a local Python/Jupyter environment, not on Vercel.

The course was authored against the inspected development checkout, including companion features that are not yet merged. In particular, guest sessions expose `kind` and `GuestSessionProvider` there, while main's session provider currently requires authentication. Lessons 05 and 06 and guest-dependent exercises need that companion session implementation. The lazy database function used in lesson 08 and the species route are also absent on main. Use the independent browser and Python models now; adapt or wait for the matching app features before using dependent TSX in main. Course verification records apply to the authored development checkout, not to an assertion that main implements all the taught features.

Routing applies tutorial security and revalidation headers before the redirect or index rewrite. `/tutorials` returns a permanent 308 redirect to `/tutorials/`; `/tutorials/` serves the course index. Unknown files fall through to Vercel's filesystem 404 rather than receiving the Expo application. Tutorial paths do not enter the API function. Unversioned course files revalidate. The CSP permits local scripts and diagrams plus the inline styles used by interactive controls; it prohibits object embedding and framing.

The implementation follows Vercel's documented [static output directory](https://vercel.com/docs/build-output-api/primitives) and [ordered route configuration](https://vercel.com/docs/build-output-api/configuration). It preserves the existing Expo, Express, and Build Output API deployment.

## Check and release a change

From the repository root, run:

```sh
node --test tests/scripts/publish-tutorials.test.mjs tests/scripts/vercel-output.test.mjs
npm run build:vercel
node scripts/check-tutorial-deployment.mjs https://plantopedia-nine.vercel.app/tutorials/
```

The build requires the project's existing public Clerk build settings. Keep private values in Vercel; do not copy a local `.env` into the public course. The HTTP check compares every published course file to the local build, checks JavaScript/SVG MIME types and security/cache headers, and verifies the redirect and private/missing 404 paths. Run it against a deployment from the same source revision. Browser acceptance checks interactions and console errors separately.

First build a staged production deployment with `vercel deploy --prod --skip-domain`. Inspect its build and test its tutorial and existing app routes before promotion with `vercel promote <deployment-url>`. Preserve the previous production deployment URL for rollback. Confirm the public tutorial and downloads after promotion. Future main-branch builds run the same publisher automatically.

For deployment work, install the Vercel CLI with `npm i -g vercel`, or use an explicitly selected `npx vercel` invocation when a global installation is unavailable.
