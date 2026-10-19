import { Redirect } from "expo-router";

// Keep old Tasks links useful after moving Settings into its tab.
export default function TasksRedirect() {
  return <Redirect href="/settings" />;
}
