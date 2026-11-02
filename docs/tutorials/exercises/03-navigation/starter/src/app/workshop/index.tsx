import { Text, View } from "react-native";
import { specimens } from "../../features/tutorial-navigation-data";
export default function WorkshopIndex() {
  // TODO: render a Link for each record using its stable id in plantId.
  return <View style={{ padding: 24 }}>{specimens.map(plant => <Text key={plant.id}>{plant.nickname}</Text>)}</View>;
}
