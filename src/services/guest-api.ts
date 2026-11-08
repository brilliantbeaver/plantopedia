import { apiClient } from "./api";

export const GUEST_OWNER = "guest_local";

// Guests can browse the bundled text catalog. Every private operation goes
// through the same token check as the cloud client; there is no device garden.
export function guestApi() {
  return apiClient(async () => null);
}
