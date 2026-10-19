import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react-native";
import { Modal } from "react-native";
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
jest.mock("../../src/features/identification/IdentificationPanel", () => ({
  IdentificationPanel: () => null,
}));
jest.mock("../../src/theme/GlassSurface", () =>
  jest.requireActual("../../src/theme/GlassSurface.tsx"),
);
jest.mock("../../src/theme/use-reduced-motion", () => ({
  useReducedMotion: () => true,
}));
beforeEach(() => {
  jest.clearAllMocks();
  mockApi.observe.mockReset();
  mockApi.startConversation.mockReset();
  mockApi.request.mockReset();
  mockApi.plant.mockResolvedValue({
    plant: {
      id: "plant_a",
      nickname: "Patio rose",
      ownership: "owned",
      coverPhotoId: "photo_a",
      place: "",
    },
    photos: [{ id: "photo_a" }, { id: "photo_b" }],
    observations: [],
    selections: [],
    identifications: [],
  });
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
