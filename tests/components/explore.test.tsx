import {
  fireEvent,
  act,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Explore from "../../src/app/(tabs)/index";
import Plants from "../../src/app/(tabs)/plants";
import { PreferencesProvider } from "../../src/theme/preferences";

const mockPlants = jest.fn();
const mockSearch = jest.fn();
const mockPush = jest.fn();
const mockReadHistory = jest.fn();
const mockWriteHistory = jest.fn();
let mockOwner = "user_new";
jest.mock("../../src/services/collection-history", () => ({
  collectionHistory: {
    read: (...args: unknown[]) => mockReadHistory(...args),
    write: (...args: unknown[]) => mockWriteHistory(...args),
  },
}));
jest.mock("../../src/services/session", () => ({
  useSessionApi: () => ({
    api: { plants: mockPlants, request: mockSearch },
    owner: mockOwner,
  }),
}));
jest.mock("expo-router", () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock("../../src/components/PlantCard", () => ({
  PlantCard: ({ plant }: { plant: { nickname: string } }) => {
    const { Text } = jest.requireActual("react-native");
    return <Text>{plant.nickname}</Text>;
  },
}));

function showHome(
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  }),
  page = <Explore />,
) {
  const view = render(
    <PreferencesProvider>
      <QueryClientProvider client={client}>{page}</QueryClientProvider>
    </PreferencesProvider>,
  );
  return { view, client };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockPlants.mockReset();
  mockSearch.mockReset();
  mockReadHistory.mockReset();
  mockWriteHistory.mockReset();
  mockOwner = "user_new";
  mockReadHistory.mockResolvedValue(null);
  mockWriteHistory.mockResolvedValue(undefined);
});

test("an empty collection welcomes the user and starts the photo flow", async () => {
  mockPlants.mockResolvedValue({ items: [] });
  showHome();
  await screen.findByText("Meet your first plant.");
  expect(screen.getByText("Your collection starts here")).toBeOnTheScreen();
  expect(screen.queryByText("Recent discoveries")).toBeNull();
  expect(screen.queryByText(/draft is retained/)).toBeNull();
  fireEvent.press(screen.getByRole("button", { name: "Add your first plant" }));
  expect(mockPush).toHaveBeenCalledWith("/scan");
});

test("a background lookup never blocks the welcoming start or claims the collection is empty", async () => {
  mockPlants.mockReturnValue(new Promise(() => {}));
  showHome();
  await screen.findByText("Discover the plants around you.");
  expect(screen.queryByText("Loading your plants…")).toBeNull();
  expect(
    screen.getByRole("button", { name: "Start with a photo" }),
  ).toBeOnTheScreen();
  expect(screen.queryByText("Meet your first plant.")).toBeNull();
  expect(screen.queryByText("Your collection starts here")).toBeNull();
  expect(screen.queryByText("Recent discoveries")).toBeNull();
});

test("a first visit with a failed background lookup keeps the photo invitation and has no collection error", async () => {
  mockPlants.mockRejectedValue(new Error("API unreachable"));
  const { client } = showHome();
  await waitFor(() =>
    expect(client.getQueryState(["user_new", "plants"])?.status).toBe("error"),
  );
  await screen.findByText("A good place to start");
  expect(screen.queryByText("We couldn’t load your plants.")).toBeNull();
  expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
  expect(screen.queryByText("Recent discoveries")).toBeNull();
  expect(screen.queryByText("Meet your first plant.")).toBeNull();
  fireEvent.press(screen.getByRole("button", { name: "Start with a photo" }));
  expect(mockPush).toHaveBeenCalledWith("/scan");
  expect(mockWriteHistory).not.toHaveBeenCalled();
});

test("a returning user without loaded records gets collection recovery rather than first-plant messaging", async () => {
  mockReadHistory.mockResolvedValue(true);
  mockPlants.mockRejectedValueOnce(new Error("API unreachable"));
  let finish!: (value: { items: [] }) => void;
  mockPlants.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  showHome();
  await screen.findByText(
    "Your collection is temporarily unavailable. Refresh to reconnect.",
  );
  expect(screen.queryByText(/draft is retained/)).toBeNull();
  expect(screen.queryByText("Your collection starts here")).toBeNull();
  fireEvent.press(screen.getByRole("button", { name: "Photograph a plant" }));
  expect(mockPush).toHaveBeenCalledWith("/scan");
  fireEvent.press(screen.getByRole("button", { name: "Refresh collection" }));
  await waitFor(() => expect(mockPlants).toHaveBeenCalledTimes(2));
  await screen.findByText("Loading your plants…");
  expect(
    screen.queryByRole("button", { name: "Refresh collection" }),
  ).toBeNull();
  await act(async () => finish({ items: [] }));
  await screen.findByText("Your collection starts here");
  expect(
    screen.queryByText(
      "Your collection is temporarily unavailable. Refresh to reconnect.",
    ),
  ).toBeNull();
});

test("returning users see recent discoveries", async () => {
  mockPlants.mockResolvedValue({
    items: [{ id: "plant_1", nickname: "My fern" }],
  });
  showHome();
  await screen.findByText("My fern");
  expect(screen.getByText("Recent discoveries")).toBeOnTheScreen();
  expect(
    screen.getByText("Reopen a discovery and continue its story."),
  ).toBeOnTheScreen();
  expect(screen.queryByText("Meet your first plant.")).toBeNull();
  await waitFor(() =>
    expect(mockWriteHistory).toHaveBeenCalledWith("user_new", true),
  );
});

test("a failed refresh keeps previously loaded plants and explains their status", async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  client.setQueryData(["user_new", "plants"], {
    items: [{ id: "plant_1", nickname: "My fern" }],
  });
  mockPlants.mockRejectedValue(new Error("API unreachable"));
  showHome(client);
  await screen.findByText("Showing your last loaded discoveries.");
  expect(screen.getByText("My fern")).toBeOnTheScreen();
  expect(screen.getByText("Recent discoveries")).toBeOnTheScreen();
  expect(screen.queryByText("Your collection starts here")).toBeNull();
});

test("the empty My plants screen offers a direct path to add a plant", async () => {
  mockPlants.mockResolvedValue({ items: [] });
  showHome(undefined, <Plants />);
  await screen.findByText("Your collection starts here");
  fireEvent.press(screen.getByRole("button", { name: "Add your first plant" }));
  expect(mockPush).toHaveBeenCalledWith("/scan");
});

test("an empty search suggests changing the search rather than implying an empty collection", async () => {
  mockPlants.mockResolvedValue({ items: [] });
  mockSearch.mockResolvedValue({ items: [], limited: false });
  showHome(undefined, <Plants />);
  await screen.findByText("Your collection starts here");
  fireEvent.changeText(
    screen.getByPlaceholderText("Search your plants and observations"),
    "fern",
  );
  fireEvent.press(screen.getByRole("button", { name: "Search" }));
  await screen.findByText(
    "No plants match your search. Try a different name or observation.",
  );
  expect(screen.queryByText("Your collection starts here")).toBeNull();
});

test("switching accounts does not carry collection recovery into a new user's welcome", async () => {
  mockOwner = "user_returning";
  mockReadHistory.mockImplementation(async (owner: string) =>
    owner === "user_returning" ? true : null,
  );
  mockPlants.mockRejectedValue(new Error("API unreachable"));
  const { view, client } = showHome();
  await screen.findByText(
    "Your collection is temporarily unavailable. Refresh to reconnect.",
  );
  mockOwner = "user_new";
  view.rerender(
    <PreferencesProvider>
      <QueryClientProvider client={client}>
        <Explore />
      </QueryClientProvider>
    </PreferencesProvider>,
  );
  await waitFor(() =>
    expect(client.getQueryState(["user_new", "plants"])?.status).toBe("error"),
  );
  expect(screen.getByText("Discover the plants around you.")).toBeOnTheScreen();
  expect(
    screen.queryByText(
      "Your collection is temporarily unavailable. Refresh to reconnect.",
    ),
  ).toBeNull();
});

test.each(["empty", "unavailable"])(
  "%s local history retains the welcoming start",
  async (history) => {
    if (history === "empty") mockReadHistory.mockResolvedValue(false);
    else mockReadHistory.mockRejectedValue(new Error("storage unavailable"));
    mockPlants.mockRejectedValue(new Error("API unreachable"));
    const { client } = showHome();
    await waitFor(() =>
      expect(client.getQueryState(["user_new", "plants"])?.status).toBe(
        "error",
      ),
    );
    expect(
      screen.getByRole("button", { name: "Start with a photo" }),
    ).toBeOnTheScreen();
    expect(screen.queryByText("We couldn’t load your plants.")).toBeNull();
  },
);

test("opening My plants explicitly provides retry when the requested collection is unavailable", async () => {
  mockPlants.mockRejectedValue(new Error("API unreachable"));
  showHome(undefined, <Plants />);
  await screen.findByText("We couldn’t load your plants.");
  expect(screen.getByRole("button", { name: "Try again" })).toBeOnTheScreen();
  expect(screen.queryByText("Your collection starts here")).toBeNull();
});
