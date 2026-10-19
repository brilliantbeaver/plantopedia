import { useClerk } from "@clerk/expo";

export function useStartSignIn() {
  const clerk = useClerk();
  // Hosted auth requires a native URL scheme; browsers use Clerk's web UI.
  return async () => {
    clerk.openSignIn({ withSignUp: true });
  };
}
