/* eslint-disable @typescript-eslint/no-unused-vars -- Starter bindings are intentionally reserved for the learner to implement. */
import { Text, View } from "react-native";
type PlantSummary = { id: string; nickname: string; place: string };
function PlantCard({ plant, onOpen }: { plant: PlantSummary; onOpen: () => void }) {
  // TODO: use a Pressable, name its purpose, and invoke onOpen on a press.
  // TODO: preserve a readable text column when the nickname becomes long.
  return <View><Text>{plant.nickname}</Text></View>;
}
export default function Workshop() {
  const plant = { id: "rosemary-1", nickname: "Kitchen rosemary", place: "East window" };
  return <PlantCard plant={plant} onOpen={() => console.info("Open plant", plant.id)} />;
}
