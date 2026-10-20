import { Redirect } from "expo-router";

// The browser session consumes Clerk's callback. If the OS also delivers the
// deep link to Expo Router, return to AuthGate while Clerk completes activation.
export default function SsoCallback() {
  return <Redirect href="/" />;
}
