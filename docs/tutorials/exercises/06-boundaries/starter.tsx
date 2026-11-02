/* eslint-disable @typescript-eslint/no-unused-vars -- Starter bindings are intentionally reserved for the learner to implement. */
import { useState } from "react";
import { Button, Text, TextInput, View } from "react-native";
export default function Workshop() {
  const [nickname, setNickname] = useState("");
  const [message, setMessage] = useState("");
  function validate() {
    // TODO: validate a trimmed nickname of 1–120 characters with zod.
    // Do not cast unknown JSON to a trusted type or print authentication tokens.
  }
  return <View style={{ padding: 24, gap: 16 }}>
    <TextInput accessibilityLabel="Nickname" value={nickname} onChangeText={setNickname} />
    <Button title="Check input" onPress={validate} /><Text>{message}</Text>
  </View>;
}
