// A browser on the development computer can reach its own loopback API.
export function phoneApiUnreachable(_apiUrl: string) {
  return false;
}
