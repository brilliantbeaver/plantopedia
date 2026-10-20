import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react-native";
import { Modal } from "react-native";
import { PlantDetail, type Identification } from "@plantopedia/contracts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PreferencesProvider } from "../../src/theme/preferences";
import PlantProfile from "../../src/app/plants/[plantId]";
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockApi = {
  plant: jest.fn(),
  observe: jest.fn(),
  startConversation: jest.fn(),
  request: jest.fn(),
  identify: jest.fn(),
};
const mockLocal = {
  cache: jest.fn(async () => {}),
  cached: jest.fn(),
  purge: jest.fn(async () => {}),
  reconcileDeleted: jest.fn(),
};
let mockId = 0;
jest.mock("expo-crypto", () => ({ randomUUID: () => `attempt_${++mockId}` }));
jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ plantId: "plant_a" }),
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));
jest.mock("../../src/services/session", () => ({
  useSessionApi: () => ({ owner: "user_a", api: mockApi }),
}));
jest.mock("../../src/services/local", () => ({
  get local() {
    return mockLocal;
  },
}));
jest.mock("../../src/components/PrivatePhoto", () => ({
  PrivatePhoto: () => null,
}));
jest.mock("../../src/theme/GlassSurface", () =>
  jest.requireActual("../../src/theme/GlassSurface.tsx"),
);
jest.mock("../../src/theme/use-reduced-motion", () => ({
  useReducedMotion: () => true,
}));
const stamp = {
  schemaVersion: 1,
  revision: 1,
  createdAt: "2026-10-19T10:00:00.000Z",
  updatedAt: "2026-10-19T10:00:00.000Z",
};
function fixture() {
  return PlantDetail.parse({
    plant: {
      ...stamp,
      id: "plant_a",
      nickname: "Patio rose",
      ownership: "owned",
      coverPhotoId: "photo_a",
      place: "",
      lifecycle: "saved",
      verification: "uncertain",
      scientificName: null,
      commonName: null,
      identificationId: null,
    },
    photos: ["photo_a", "photo_b"].map((id) => ({
      ...stamp,
      id,
      plantId: "plant_a",
      observationId: "observation_a",
      mime: "image/jpeg",
      width: 800,
      height: 600,
      bytes: 1000,
      hash: id,
      capturedAt: stamp.createdAt,
    })),
    observations: [],
    selections: [],
    identifications: [],
  });
}
beforeEach(() => {
  jest.clearAllMocks();
  mockApi.observe.mockReset();
  mockApi.startConversation.mockReset();
  mockApi.request.mockReset();
  mockApi.identify.mockReset();
  mockApi.plant.mockResolvedValue(fixture());
});
function show() {
  const query = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { gcTime: 0 },
    },
  });
  const view = render(
    <PreferencesProvider>
      <QueryClientProvider client={query}>
        <PlantProfile />
      </QueryClientProvider>
    </PreferencesProvider>,
  );
  return () => {
    view.unmount();
    query.clear();
  };
}

test("a saved camera photo reaches identification and selection without ES2023 array methods or cache mutation", async () => {
  expect(Array.prototype.toSorted).toBeUndefined();
  let detail = fixture();
  detail.observations = ["Older note", "Newer note"].map((text, index) => ({
    ...stamp,
    schemaVersion: 1,
    id: `observation_${index}`,
    plantId: "plant_a",
    text,
    kind: "user_observation",
    capturedAt: `2026-10-${18 + index}T10:00:00.000Z`,
  }));
  Object.freeze(detail.observations);
  Object.freeze(detail.identifications);
  Object.freeze(detail.selections);
  const result: Identification = {
    ...stamp,
    schemaVersion: 1,
    id: "identification_a",
    plantId: "plant_a",
    photoIds: ["photo_a"],
    provider: "plantnet",
    providerVersion: "fixture",
    status: "ready",
    needsMoreEvidence: false,
    language: "en",
    candidates: [
      {
        scientificName: "Rosa canina",
        commonNames: ["Dog rose"],
        score: 0.2,
        authorship: "",
        taxonId: null,
      },
      {
        scientificName: "Rosa gallica",
        commonNames: ["French rose"],
        score: 0.9,
        authorship: "",
        taxonId: null,
      },
    ],
  };
  Object.freeze(result.candidates);
  mockApi.plant.mockResolvedValue(detail);
  mockApi.identify.mockImplementation(async () => {
    detail = { ...detail, identifications: [result] };
    Object.freeze(detail.identifications);
    mockApi.plant.mockResolvedValue(detail);
    return result;
  });
  mockApi.request.mockImplementation(async () => {
    detail = {
      ...detail,
      plant: {
        ...detail.plant,
        revision: 2,
        identificationId: result.id,
        scientificName: "Rosa gallica",
        commonName: "French rose",
        verification: "user_confirmed",
      },
    };
    mockApi.plant.mockResolvedValue(detail);
    return detail.plant;
  });
  const close = show();
  await screen.findByText("Patio rose");
  expect(
    screen
      .getAllByText(/^(Older|Newer) note$/)
      .map((node) => node.props.children),
  ).toEqual(["Newer note", "Older note"]);
  expect(detail.observations.map((item) => item.text)).toEqual([
    "Older note",
    "Newer note",
  ]);
  fireEvent.press(screen.getByRole("button", { name: "Identify from photos" }));
  expect(screen.getByRole("checkbox", { name: "Photo 1" })).toBeChecked();
  fireEvent.press(screen.getByRole("button", { name: "Find matches" }));
  const choice = await screen.findByRole("button", {
    name: "Use this match: Rosa gallica",
  });
  expect(mockApi.identify).toHaveBeenCalledWith(
    "plant_a",
    { photoIds: ["photo_a"], organs: ["auto"], locale: "en" },
    expect.any(String),
  );
  fireEvent.press(choice);
  await screen.findByRole("button", { name: "Edit identification" });
  expect(mockApi.request.mock.calls[0]?.[2].body).toMatchObject({
    identificationId: result.id,
    candidateIndex: 1,
  });
  expect(result.candidates.map((item) => item.scientificName)).toEqual([
    "Rosa canina",
    "Rosa gallica",
  ]);
  close();
});
test("asking about a selected photo reports failure and then opens that photo's conversation", async () => {
  mockApi.startConversation
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValue({ id: "chat_a" });
  const close = show();
  await screen.findByText("Patio rose");
  fireEvent.press(screen.getByRole("button", { name: /View photo 2/ }));
  fireEvent.press(screen.getByRole("button", { name: "Ask" }));
  await screen.findByText("Could not complete this action. Please try again.");
  expect(mockPush).not.toHaveBeenCalled();
  fireEvent.press(screen.getByRole("button", { name: "Ask" }));
  await waitFor(() =>
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/ask",
      params: { conversationId: "chat_a" },
    }),
  );
  expect(mockApi.startConversation.mock.calls[1]?.[0]).toMatchObject({
    plantId: "plant_a",
    photoId: "photo_b",
  });
  close();
});
test("the observation disclosure retains the note and idempotency key after a lost acknowledgment", async () => {
  mockApi.observe
    .mockRejectedValueOnce(new Error("lost reply"))
    .mockResolvedValue({});
  const close = show();
  await screen.findByText("Patio rose");
  fireEvent.press(screen.getByRole("button", { name: "Add observation" }));
  fireEvent.changeText(
    screen.getByPlaceholderText("What did you notice?"),
    "A pink bud opened",
  );
  fireEvent.press(screen.getByRole("button", { name: "Save observation" }));
  await screen.findByText("Could not complete this action. Please try again.");
  expect(
    screen.getByPlaceholderText("What did you notice?"),
  ).toHaveDisplayValue("A pink bud opened");
  fireEvent.press(screen.getByRole("button", { name: "Save observation" }));
  await waitFor(() => expect(mockApi.observe).toHaveBeenCalledTimes(2));
  expect(mockApi.observe.mock.calls[1]).toEqual(mockApi.observe.mock.calls[0]);
  await waitFor(() =>
    expect(screen.queryByPlaceholderText("What did you notice?")).toBeNull(),
  );
  close();
});
test("plant deletion is discoverable in More options and executes only after confirmation", async () => {
  mockApi.request.mockResolvedValue({ deleted: true });
  const close = show();
  await screen.findByText("Patio rose");
  expect(screen.queryByRole("button", { name: "Delete" })).toBeNull();
  fireEvent.press(screen.getByRole("button", { name: "More options" }));
  fireEvent.press(screen.getByRole("button", { name: "Delete" }));
  expect(mockApi.request).not.toHaveBeenCalled();
  fireEvent.press(screen.getByRole("button", { name: "Cancel" }));
  expect(mockApi.request).not.toHaveBeenCalled();
  fireEvent.press(screen.getByRole("button", { name: "Delete" }));
  fireEvent.press(
    within(screen.UNSAFE_getByType(Modal)).getByRole("button", {
      name: "Delete",
    }),
  );
  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/plants"));
  expect(mockApi.request).toHaveBeenCalledTimes(1);
  expect(mockLocal.purge).toHaveBeenCalledWith("user_a", "plant_a");
  close();
});
