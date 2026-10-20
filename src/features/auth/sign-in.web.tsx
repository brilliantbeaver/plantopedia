import { SignIn as ClerkSignIn } from "@clerk/expo/web";

export function SignIn() {
  // Keep Clerk mounted when OAuth returns to /login#/sso-callback, including
  // signup transfer and additional verification. A modal alone cannot resume
  // after a full-page redirect, and the default Account Portal is not hosted.
  return <ClerkSignIn routing="hash" withSignUp />;
}
