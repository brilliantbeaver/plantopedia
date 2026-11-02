/* eslint-disable @typescript-eslint/no-unused-vars -- Starter bindings are intentionally reserved for the learner to implement. */
import { useState } from "react";
import { Button, Text, View } from "react-native";
const initial = [{ id: "east", nickname: "Rosemary" }, { id: "west", nickname: "Rosemary" }];
export default function Workshop() {
  const [plants, setPlants] = useState(initial);
  function rename() {
    // TODO: update only east using a functional setter and map. Preserve old objects.
  }
  return <View style={{ padding: 24, gap: 16 }}>
    {plants.map(plant => <Text key={plant.id}>{plant.id}: {plant.nickname}</Text>)}
    <Button title="Rename east to Kitchen rosemary" onPress={rename} />
  </View>;
}
