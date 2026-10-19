import type { Message } from "@plantopedia/contracts";

export function messageReferences(message: Message, photoLabel: string) {
  const photos = [
    ...new Map(
      message.evidence
        .filter((item) => item.photoId !== null)
        .map((item) => [`${item.plantId}/${item.photoId}`, item] as const),
    ).values(),
  ].map((item, index) => ({
    plantId: item.plantId,
    photoId: item.photoId!,
    label: `${photoLabel} ${index + 1}`,
  }));
  const plants = [...new Set(message.evidence.map((item) => item.plantId))];
  const sources = [
    ...new Map(message.sources.map((item) => [item.url, item])).values(),
  ];
  let text = message.text;
  if (message.role === "assistant") {
    // Older stored replies printed IDs, sometimes inside Markdown emphasis.
    // Replace only known photo references, preserving the stored text and IDs.
    for (const photo of photos) {
      // Contract IDs contain only letters, digits, underscores and hyphens.
      const decorated = "(?:[*]{2}|__|`)?" + photo.photoId + "(?:[*]{2}|__|`)?";
      text = text.replace(
        new RegExp(
          `(?<![A-Za-z0-9_-])photo(?:[ ]+id)?[ ]*[:#]?[ ]*${decorated}(?![A-Za-z0-9_-])`,
          "gi",
        ),
        () => photo.label,
      );
      text = text.replace(
        new RegExp(`(?<![A-Za-z0-9_/-])${decorated}(?![A-Za-z0-9_-])`, "g"),
        () => photo.label,
      );
    }
  }
  return { text, photos, plants, sources };
}
