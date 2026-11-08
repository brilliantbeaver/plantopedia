import { Redirect } from "expo-router";
import { useSessionApi } from "../services/session";
import Login from "./login";

export default function Home() {
  const { kind } = useSessionApi();
  return kind === "guest" ? (
    <Login defaultReturnTo="/explore" />
  ) : (
    <Redirect href="/explore" />
  );
}
