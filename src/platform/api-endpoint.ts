import Constants from "expo-constants";
import { loopbackApiOnRemoteDevice } from "../config/device-api";

export function phoneApiUnreachable(apiUrl: string) {
  return loopbackApiOnRemoteDevice(apiUrl, Constants.expoConfig?.hostUri);
}
