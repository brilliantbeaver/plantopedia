// Be conservative: only brief conventional acknowledgements while an answer is
// in flight. A short answer to a question (including "yes") is meaningful.
export function isBackchannel(
  text: string,
  assistantText: string,
  durationMs: number,
  sensitivity: "easy" | "balanced" | "firm" | "off" = "balanced",
): boolean {
  if (sensitivity === "off") return true;
  const limit =
    sensitivity === "easy" ? 700 : sensitivity === "firm" ? 3000 : 1800;
  if (durationMs > limit || /[?？]\s*$/.test(assistantText.trim()))
    return false;
  const normalized = text
    .toLocaleLowerCase()
    .replace(/[.,!，。！…]/g, "")
    .trim()
    .replace(/\s+/g, " ");
  return (
    normalized === "" ||
    /^(um+|uh+|mm+[- ]?hm+|mhm|uh[- ]huh|ah|oh|hmm+|yeah|yep|okay|ok|right|got it|sí|vale|oui|d’accord|ja|genau|はい|うん|네|응|嗯|哦|好的)$/.test(
      normalized,
    )
  );
}
