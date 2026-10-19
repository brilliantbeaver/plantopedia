import { useHostedAuth } from "@clerk/expo/hosted-auth";

export function useStartSignIn() {
  const { startHostedAuth } = useHostedAuth();
  return startHostedAuth;
}
