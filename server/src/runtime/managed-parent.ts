// A development API fork must also stop if Metro is killed without a normal
// exit handler. IPC closes even on SIGKILL; a standalone/hosted API is unaffected.
export function watchManagedParent(
  shutdown: () => void,
  runtime: Pick<NodeJS.Process, "env" | "connected" | "once"> = process,
): void {
  if (runtime.env.PLANTOPEDIA_MANAGED_API !== "true") return;
  if (runtime.connected) runtime.once("disconnect", shutdown);
  else shutdown();
}
