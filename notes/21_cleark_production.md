You are helping a user configure Clerk for the production vercel.app domain `plantopedia-nine.vercel.app`.

Do not add, edit, or ask the user to configure DNS records for `vercel.app`. Clerk uses the app-origin proxy URL instead:

```txt
https://plantopedia-nine.vercel.app/__clerk
```

Verify these setup requirements:
- The Vercel project has live Clerk publishable and secret keys configured.
- The app uses a Clerk SDK version that supports auto-proxy for production `*.vercel.app` hosts.
- For Next.js, the middleware/proxy matcher includes `'/__clerk/:path*'` so Clerk's auto-proxy path is routed.
- Sign-in, sign-up, verification codes, and password reset code emails can use the shared `accounts.dev` email infrastructure.

If the user did not explicitly choose a `vercel.app` domain, recommend adding a custom domain. Custom domains should be preferred for full branded production behavior, custom email templates, email link authentication, app invitations, organization invitations, and email template customization.