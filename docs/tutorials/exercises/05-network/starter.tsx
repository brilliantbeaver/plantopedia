/* eslint-disable @typescript-eslint/no-unused-vars -- Starter bindings are intentionally reserved for the learner to implement. */
import { Text, View } from "react-native";
import { useSessionApi } from "@/services/session";
export default function Workshop() {
  const { api, owner } = useSessionApi();
  // TODO: useQuery with [owner, "plants"] and api.plants. Show pending, error,
  // empty and data states separately. Keep existing data during refresh failures.
  return <View style={{ padding: 24 }}><Text>Load the current owner’s plants.</Text></View>;
}
