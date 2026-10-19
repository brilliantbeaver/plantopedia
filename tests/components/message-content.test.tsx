import { fireEvent, render, screen } from "@testing-library/react-native";
import { Linking } from "react-native";
import type { Message } from "@plantopedia/contracts";
import { MessageContent } from "../../src/components/MessageContent";
import { PreferencesProvider } from "../../src/theme/preferences";

const mockPhoto = jest.fn();
jest.mock("../../src/components/PrivatePhoto", () => ({
  PrivatePhoto: (props: unknown) => {
    mockPhoto(props);
    return null;
  },
}));
const photoId = "61b4a118-84e5-4236-bb5f-9ce53b0319f8";
const message: Message = {
  id: "message_a",
  conversationId: "conversation_a",
  schemaVersion: 1,
  revision: 1,
  createdAt: "2026-10-18T20:00:00Z",
  updatedAt: "2026-10-18T20:00:00Z",
  role: "assistant",
  text: `Your photo is consistent with a hydrangea (photo **${photoId}**). Exact timing depends on the variety.`,
  sources: [
    {
      id: "source_a",
      title: "Hydrangea reference",
      url: "https://example.com/hydrangea",
      retrievedAt: "2026-10-18T20:00:00Z",
      excerpt: "Hydrangea flowering and pollinators.",
    },
  ],
  evidence: [
    { plantId: "plant_a", observationId: null, photoId },
    { plantId: "plant_a", observationId: "observation_a", photoId },
    { plantId: "plant_a", observationId: "observation_b", photoId: null },
  ],
  transport: "text",
  delivery: "complete",
};
beforeEach(() => jest.clearAllMocks());
function show(value = message) {
  const open = jest.fn();
  render(
    <PreferencesProvider>
      <MessageContent message={value} onOpenPlant={open} />
    </PreferencesProvider>,
  );
  return open;
}

test("old assistant photo IDs become readable labels while reference details and images stay collapsed", () => {
  show();
  expect(
    screen.getByText(
      "Your photo is consistent with a hydrangea (Photo 1). Exact timing depends on the variety.",
    ),
  ).toBeOnTheScreen();
  expect(screen.queryByText(new RegExp(photoId))).toBeNull();
  expect(screen.queryByText("Hydrangea reference")).toBeNull();
  expect(
    screen.getByRole("button", {
      name: "Photos & sources · 2",
      expanded: false,
    }),
  ).toBeOnTheScreen();
  expect(mockPhoto).not.toHaveBeenCalled();
});

test("cited web sources are visible and clickable beside the answer without opening a disclosure", () => {
  const link = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
  show();
  expect(screen.getByText("[1] example.com")).toBeOnTheScreen();
  fireEvent.press(screen.getByRole("link", { name: "Hydrangea reference" }));
  expect(link).toHaveBeenCalledWith("https://example.com/hydrangea");
  expect(mockPhoto).not.toHaveBeenCalled();
  link.mockRestore();
});

test("disclosure groups duplicate evidence, opens the exact plant, and reveals IDs only at the technical level", () => {
  const open = show();
  fireEvent.press(screen.getByRole("button", { name: "Photos & sources · 2" }));
  expect(
    screen.getByRole("button", {
      name: "Photos & sources · 2",
      expanded: true,
    }),
  ).toBeOnTheScreen();
  expect(mockPhoto).toHaveBeenLastCalledWith({ plantId: "plant_a", photoId });
  expect(screen.getAllByRole("button", { name: "View plant" })).toHaveLength(1);
  expect(
    screen.getByRole("button", { name: "Hydrangea reference" }),
  ).toBeOnTheScreen();
  expect(screen.queryByText(photoId)).toBeNull();
  fireEvent.press(screen.getByRole("button", { name: "View plant" }));
  expect(open).toHaveBeenCalledWith("plant_a");
  fireEvent.press(
    screen.getByRole("button", { name: "Technical details", expanded: false }),
  );
  expect(screen.getByText(photoId).props.selectable).toBe(true);
  expect(screen.getByText("plant_a")).toBeOnTheScreen();
  fireEvent.press(screen.getByRole("button", { name: "Photos & sources · 2" }));
  expect(screen.queryByText(photoId)).toBeNull();
  fireEvent.press(screen.getByRole("button", { name: "Photos & sources · 2" }));
  expect(
    screen.getByRole("button", { name: "Technical details", expanded: false }),
  ).toBeOnTheScreen();
  expect(screen.queryByText(photoId)).toBeNull();
});

test("web sources remain reachable and unsafe schemes cannot be opened", () => {
  const link = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
  show({
    ...message,
    sources: [
      ...message.sources,
      {
        ...message.sources[0]!,
        id: "bad",
        title: "Unsafe reference",
        url: "javascript:alert(1)",
      },
    ],
  });
  expect(screen.queryByRole("link", { name: "Unsafe reference" })).toBeNull();
  fireEvent.press(screen.getByRole("button", { name: "Photos & sources · 3" }));
  fireEvent.press(screen.getByRole("button", { name: "Hydrangea reference" }));
  expect(link).toHaveBeenCalledWith("https://example.com/hydrangea");
  fireEvent.press(screen.getByRole("button", { name: "Unsafe reference" }));
  expect(link).toHaveBeenCalledTimes(1);
  link.mockRestore();
});

test("user-authored text and unlinked IDs are preserved rather than silently rewritten", () => {
  show({ ...message, role: "user", text: `Check photo ${photoId}` });
  expect(screen.getByText(`Check photo ${photoId}`)).toBeOnTheScreen();
});

test("answers without evidence have no empty disclosure or guessed photo references", () => {
  show({ ...message, evidence: [], sources: [], text: `Reference ${photoId}` });
  expect(screen.getByText(`Reference ${photoId}`)).toBeOnTheScreen();
  expect(screen.queryByRole("button")).toBeNull();
});
