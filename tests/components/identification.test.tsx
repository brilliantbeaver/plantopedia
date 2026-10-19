import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import {
  PlantDetail,
  type Identification,
  type Plant,
} from "@plantopedia/contracts";
import { PreferencesProvider } from "../../src/theme/preferences";
import { IdentificationPanel } from "../../src/features/identification/IdentificationPanel";

const stamp = {
  schemaVersion: 1 as const,
  revision: 1,
  createdAt: "2026-10-18T10:00:00.000Z",
  updatedAt: "2026-10-18T10:00:00.000Z",
};
const candidates = [
  {
    scientificName: "Hydrangea arborescens",
    commonNames: ["Smooth hydrangea"],
    score: 0.15,
    authorship: "",
    taxonId: null,
  },
  {
    scientificName: "Hydrangea macrophylla",
    commonNames: ["Bigleaf hydrangea"],
    score: 0.914,
    authorship: "",
    taxonId: null,
  },
];
function fixture() {
  return PlantDetail.parse({
    plant: {
      ...stamp,
      id: "plant_a",
      nickname: "My hydrangea",
      ownership: "observed",
      lifecycle: "saved",
      verification: "uncertain",
      scientificName: null,
      commonName: null,
      coverPhotoId: "photo_a",
      place: "",
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
    identifications: [
      {
        ...stamp,
        id: "identification_a",
        plantId: "plant_a",
        photoIds: ["photo_a"],
        candidates,
        provider: "plantnet",
        providerVersion: "fixture",
        status: "ready",
        needsMoreEvidence: false,
        language: "en",
      },
    ],
  });
}
let mockStored = fixture();
let mockSequence = 0;
const mockRequest = jest.fn();
const mockIdentify = jest.fn();
const mockFocus = jest.fn();
jest.mock("expo-crypto", () => ({
  randomUUID: () => `attempt_${++mockSequence}`,
}));
jest.mock("../../src/services/session", () => ({
  useSessionApi: () => ({
    owner: "user_a",
    api: { request: mockRequest, identify: mockIdentify },
  }),
}));
jest.mock("../../src/services/local", () => ({
  local: { cache: jest.fn(async () => {}) },
}));
jest.mock("../../src/components/PrivatePhoto", () => ({
  PrivatePhoto: () => null,
}));
jest.mock("../../src/theme/GlassSurface", () =>
  jest.requireActual("../../src/theme/GlassSurface.tsx"),
);

function Harness() {
  const detail = useQuery({
    queryKey: ["user_a", "plant", "plant_a"],
    queryFn: async () => mockStored,
    initialData: mockStored,
    staleTime: Infinity,
  });
  return (
    <IdentificationPanel
      data={detail.data}
      focusedPhotoId="photo_b"
      onPhotoFocus={mockFocus}
    />
  );
}
function mount() {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: {
            queries: { retry: false, gcTime: 0 },
            mutations: { retry: false, gcTime: 0 },
          },
        })
      }
    >
      <PreferencesProvider>
        <Harness />
      </PreferencesProvider>
    </QueryClientProvider>,
  );
}
beforeEach(() => {
  jest.clearAllMocks();
  mockStored = fixture();
  mockSequence = 0;
  mockRequest
    .mockReset()
    .mockImplementation(async (_route, _schema, { body }) => {
      const evidence = mockStored.identifications.find(
        (item) => item.id === body.identificationId,
      )!;
      const candidate =
        body.candidateIndex === null
          ? undefined
          : evidence.candidates[body.candidateIndex];
      const plant: Plant = {
        ...mockStored.plant,
        scientificName: candidate?.scientificName ?? body.scientificName,
        commonName: candidate?.commonNames[0] ?? null,
        verification: candidate ? "user_confirmed" : "user_corrected",
        identificationId: evidence.id,
        revision: mockStored.plant.revision + 1,
      };
      mockStored = { ...mockStored, plant };
      return plant;
    });
  mockIdentify.mockReset().mockImplementation(async (_plantId, body) => {
    const result: Identification = {
      ...mockStored.identifications[0]!,
      id: "identification_new",
      createdAt: "2026-10-18T12:00:00.000Z",
      photoIds: body.photoIds,
    };
    mockStored = {
      ...mockStored,
      identifications: [...mockStored.identifications, result],
    };
    return result;
  });
});
async function chooseTop() {
  fireEvent.press(
    screen.getByRole("button", {
      name: "Use this match: Hydrangea macrophylla",
    }),
  );
  await screen.findByRole("button", { name: "Edit identification" });
}

test("top-ranked confidence uses percentages and preserves original candidate indices; saving closes suggestions", async () => {
  mount();
  expect(screen.getByText("91.4%")).toBeOnTheScreen();
  expect(screen.getByText("Top match")).toBeOnTheScreen();
  expect(screen.queryByText("Smooth hydrangea")).toBeNull();
  await chooseTop();
  expect(mockRequest.mock.calls[0]?.[2].body).toEqual({
    revision: 1,
    identificationId: "identification_a",
    candidateIndex: 1,
  });
  expect(screen.queryByText("Choose an identification")).toBeNull();
  expect(screen.queryByRole("button", { name: /Use this match/ })).toBeNull();
  expect(screen.getByText("✓ Identification saved")).toBeOnTheScreen();
  expect(screen.getByText(/Your choice · 91.4% Confidence/)).toBeOnTheScreen();
  fireEvent.press(screen.getByRole("button", { name: "View photo 1" }));
  expect(mockFocus).toHaveBeenCalledWith("photo_a");
});

test("a persisted choice stays collapsed after remount and can be changed or cancelled later", async () => {
  const view = mount();
  await chooseTop();
  view.unmount();
  mount();
  expect(screen.queryByText("Choose an identification")).toBeNull();
  fireEvent.press(screen.getByRole("button", { name: "Edit identification" }));
  expect(
    screen.getByRole("button", {
      name: "Current identification: Hydrangea macrophylla",
    }),
  ).toBeDisabled();
  fireEvent.press(screen.getByRole("button", { name: "Cancel" }));
  expect(mockRequest).toHaveBeenCalledTimes(1);
  fireEvent.press(screen.getByRole("button", { name: "Edit identification" }));
  fireEvent.press(
    screen.getByRole("button", { name: "Compare other matches (1)" }),
  );
  fireEvent.press(
    screen.getByRole("button", {
      name: "Use this match: Hydrangea arborescens",
    }),
  );
  await screen.findByRole("button", { name: "Edit identification" });
  expect(mockStored.plant.scientificName).toBe("Hydrangea arborescens");
  expect(screen.getByText(/Your choice · 15% Confidence/)).toBeOnTheScreen();
  expect(mockRequest.mock.calls[1]?.[2].body.revision).toBe(2);
});

test("a manual correction has no invented confidence, even when its name matches a suggestion", async () => {
  mount();
  await chooseTop();
  fireEvent.press(screen.getByRole("button", { name: "Edit identification" }));
  fireEvent.press(screen.getByRole("button", { name: "Enter a name instead" }));
  expect(screen.getByRole("button", { name: "Use this name" })).toBeDisabled();
  fireEvent.changeText(
    screen.getByPlaceholderText("Correct scientific name"),
    "Hydrangea macrophylla",
  );
  fireEvent.press(screen.getByRole("button", { name: "Use this name" }));
  await screen.findByRole("button", { name: "Edit identification" });
  expect(screen.getByText(/Name entered by you/)).toBeOnTheScreen();
  expect(screen.queryByText(/91.4%/)).toBeNull();
  expect(mockStored.plant.verification).toBe("user_corrected");
});

test("selected scores and photo associations come from the chosen run, not the newest run", async () => {
  mockStored.plant = {
    ...mockStored.plant,
    scientificName: "Hydrangea macrophylla",
    commonName: "Bigleaf hydrangea",
    identificationId: "identification_a",
    verification: "user_confirmed",
  };
  mockStored.identifications.push({
    ...mockStored.identifications[0]!,
    id: "newer",
    createdAt: "2026-10-18T12:00:00.000Z",
    photoIds: ["photo_b"],
    candidates: [{ ...candidates[1]!, score: 0.23 }],
  });
  mount();
  expect(screen.getByText(/91.4% Confidence/)).toBeOnTheScreen();
  expect(screen.queryByText(/23%/)).toBeNull();
  expect(
    screen.getByRole("button", { name: "View photo 1" }),
  ).toBeOnTheScreen();
  expect(screen.queryByRole("button", { name: "View photo 2" })).toBeNull();
  fireEvent.press(
    screen.getByRole("button", { name: "Review latest suggestions" }),
  );
  expect(screen.getByText("23%")).toBeOnTheScreen();
  expect(
    screen.getByRole("button", { name: "View photo 2" }),
  ).toBeOnTheScreen();
  fireEvent.press(screen.getByRole("button", { name: "Cancel" }));
  expect(screen.getByText(/91.4% Confidence/)).toBeOnTheScreen();
  expect(mockRequest).not.toHaveBeenCalled();
});

test("identification uses only explicitly chosen photos and never replaces a saved choice automatically", async () => {
  mount();
  await chooseTop();
  fireEvent.press(screen.getByRole("button", { name: "Identify from photos" }));
  expect(
    screen.getByRole("checkbox", { name: "Photo 2" }).props.accessibilityState
      .checked,
  ).toBe(true);
  expect(
    screen.getByRole("checkbox", { name: "Photo 1" }).props.accessibilityState
      .checked,
  ).toBe(false);
  fireEvent.press(screen.getByRole("checkbox", { name: "Photo 1" }));
  fireEvent.press(screen.getByRole("button", { name: "Find matches" }));
  await screen.findByText("Choose an identification");
  expect(mockIdentify).toHaveBeenCalledWith(
    "plant_a",
    {
      photoIds: ["photo_b", "photo_a"],
      organs: ["auto", "auto"],
      locale: "en",
    },
    expect.any(String),
  );
  expect(mockStored.plant.identificationId).toBe("identification_a");
  expect(mockRequest).toHaveBeenCalledTimes(1);
});

test("uncertain selection failure leaves suggestions open, with a stable retry key and no false success", async () => {
  mockRequest.mockRejectedValueOnce(new Error("lost acknowledgement"));
  mount();
  fireEvent.press(
    screen.getByRole("button", {
      name: "Use this match: Hydrangea macrophylla",
    }),
  );
  await screen.findByText(/Couldn’t confirm this choice/);
  expect(screen.getByText("Choose an identification")).toBeOnTheScreen();
  expect(screen.queryByText("✓ Identification saved")).toBeNull();
  await chooseTop();
  expect(mockRequest.mock.calls[0]?.[2].key).toBe(
    mockRequest.mock.calls[1]?.[2].key,
  );
});

test("photo selection enforces one to five photos and disables changes during processing", async () => {
  mockStored.photos.push(
    ...["c", "d", "e", "f"].map((suffix) => ({
      ...mockStored.photos[0]!,
      id: `photo_${suffix}`,
    })),
  );
  mount();
  fireEvent.press(screen.getByRole("button", { name: "Decide later" }));
  fireEvent.press(screen.getByRole("button", { name: "Identify from photos" }));
  fireEvent.press(screen.getByRole("checkbox", { name: "Photo 2" }));
  expect(screen.getByRole("button", { name: "Find matches" })).toBeDisabled();
  for (const number of [1, 2, 3, 4, 5])
    fireEvent.press(screen.getByRole("checkbox", { name: `Photo ${number}` }));
  expect(screen.getByRole("checkbox", { name: "Photo 6" })).toBeDisabled();
  let finish!: () => void;
  mockIdentify.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = () =>
          resolve({ ...mockStored.identifications[0]!, id: "pending" });
      }),
  );
  fireEvent.press(screen.getByRole("button", { name: "Find matches" }));
  await waitFor(() =>
    expect(screen.getByRole("checkbox", { name: "Photo 1" })).toBeDisabled(),
  );
  await act(async () => finish());
});

test("editing keeps a second suggestion selectable when both share the same scientific name", async () => {
  mockStored.identifications[0]!.candidates[0] = {
    ...mockStored.identifications[0]!.candidates[0]!,
    scientificName: "Hydrangea macrophylla",
    commonNames: ["Lacecap hydrangea"],
  };
  mount();
  await chooseTop();
  fireEvent.press(screen.getByRole("button", { name: "Edit identification" }));
  fireEvent.press(
    screen.getByRole("button", { name: "Compare other matches (1)" }),
  );
  expect(
    screen.getAllByRole("button", {
      name: "Current identification: Hydrangea macrophylla",
    }),
  ).toHaveLength(1);
  const alternative = screen.getByRole("button", {
    name: "Use this match: Hydrangea macrophylla",
  });
  expect(alternative).toBeEnabled();
  fireEvent.press(alternative);
  await screen.findByRole("button", { name: "Edit identification" });
  expect(mockRequest.mock.calls[1]?.[2].body.candidateIndex).toBe(0);
  expect(screen.getByText("Lacecap hydrangea")).toBeOnTheScreen();
});
