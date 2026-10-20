import { Redirect } from "expo-router";

// AuthGate mounts the web sign-in component here while signed out. Once Clerk
// activates the session, leave the authentication route for the collection.
export default function Login() {
  return <Redirect href="/plants" />;
}
