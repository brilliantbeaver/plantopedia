import {
  act,
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Draft } from "../../src/services/local-schema";
import { PreferencesProvider } from "../../src/theme/preferences";
import { CaptureScreen } from "../../src/features/capture/CaptureScreen";
import { RequestError } from "../../src/services/api";
let mockSequence = 0;
jest.mock("expo-crypto", () => ({
  randomUUID: () => `capture_${++mockSequence}`,
}));
const mockApi = {
  createPlant: jest.fn(async () => {
    throw new Error("lost acknowledgment");
  }),
  observe: jest.fn(),
  token: jest.fn(),
};
let mockDrafts: Draft[] = [];
jest.mock("../../src/services/session", () => ({
  useSessionApi: () => ({ api: mockApi, owner: "user_a" }),
}));
jest.mock("../../src/services/local", () => ({
  local: {
    drafts: async () => mockDrafts,
    retain: async () => "file:///original.jpg",
    save: async (value: Draft) => {
      mockDrafts = [value];
    },
  },
}));
jest.mock("../../src/features/capture/prepare", () => ({
  prepareImage: async () => "file:///derivative.jpg",
}));
const mockTakePicture = jest.fn();
let mockCameraProps: { onCameraReady(): void; onMountError(): void };
jest.mock("expo-camera", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  return {
    CameraView: React.forwardRef<unknown, typeof mockCameraProps>(
      function MockCamera(props, ref) {
        mockCameraProps = props;
        React.useImperativeHandle(ref, () => ({
          takePictureAsync: mockTakePicture,
        }));
        return null;
      },
    ),
    useCameraPermissions: () => [{ granted: true }, jest.fn()],
  };
});
jest.mock("expo-image-picker", () => ({
  launchImageLibraryAsync: async () => ({
    canceled: false,
    assets: [{ uri: "file:///selected.jpg", width: 8, height: 8 }],
  }),
}));
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn() }),
  useFocusEffect: jest.fn(),
}));
jest.mock("expo/fetch", () => ({ fetch: jest.fn() }));
jest.mock("expo-file-system", () => ({ File: jest.fn() }));
test("a lost create acknowledgment freezes the submitted capture and replays the same payload", async () => {
  mockDrafts = [];
  mockApi.createPlant
    .mockReset()
    .mockRejectedValue(new Error("lost acknowledgment"));
  render(
    <PreferencesProvider>
      <QueryClientProvider client={new QueryClient()}>
        <CaptureScreen />
      </QueryClientProvider>
    </PreferencesProvider>,
  );
  fireEvent.press(screen.getByRole("button", { name: "Choose a photo" }));
  const name = await screen.findByPlaceholderText("Name this particular plant");
  await waitFor(() => expect(name.props.editable).toBe(true));
  fireEvent.changeText(name, "Library tree");
  fireEvent.press(screen.getByRole("button", { name: "Save plant" }));
  await waitFor(() =>
    expect(
      screen.getByPlaceholderText("Name this particular plant").props.editable,
    ).toBe(false),
  );
  await screen.findByText(
    "We couldn’t finish saving your plant. Check your connection and try again. Identification is available after saving.",
  );
  fireEvent.changeText(
    screen.getByPlaceholderText("Name this particular plant"),
    "Changed after dispatch",
  );
  expect(
    screen.getByPlaceholderText("Name this particular plant").props.value,
  ).toBe("Library tree");
  fireEvent.press(screen.getByRole("button", { name: "Retry" }));
  await waitFor(() => expect(mockApi.createPlant).toHaveBeenCalledTimes(2));
  expect(mockApi.createPlant.mock.calls[0]).toEqual(
    mockApi.createPlant.mock.calls[1],
  );
  expect(mockDrafts[0]?.original).toBe("file:///original.jpg");
});

test("a database outage explains service availability while preserving the draft", async () => {
  mockDrafts = [];
  mockApi.createPlant
    .mockReset()
    .mockRejectedValue(new RequestError(503, "database_unavailable", false));
  render(
    <PreferencesProvider>
      <QueryClientProvider client={new QueryClient()}>
        <CaptureScreen />
      </QueryClientProvider>
    </PreferencesProvider>,
  );
  fireEvent.press(screen.getByRole("button", { name: "Choose a photo" }));
  await screen.findByPlaceholderText("Name this particular plant");
  await waitFor(() =>
    expect(
      screen.getByPlaceholderText("Name this particular plant").props.editable,
    ).toBe(true),
  );
  fireEvent.changeText(
    screen.getByPlaceholderText("Name this particular plant"),
    "Hydrangea",
  );
  fireEvent.press(screen.getByRole("button", { name: "Save plant" }));
  await screen.findByText(
    "Plant saving is temporarily unavailable. Please try again later.",
  );
  expect(screen.queryByText(/Check your connection/)).toBeNull();
  expect(mockDrafts[0]).toMatchObject({
    original: "file:///original.jpg",
    nickname: "Hydrangea",
    failure: "database_unavailable",
  });
  expect(screen.getByRole("button", { name: "Retry" })).toBeTruthy();
});

test("invalid captures remain editable; a typed pre-write 422 permits correction without changing an uncertain attempt", async () => {
  mockDrafts = [];
  // The first Save fails local validation without consuming this mock. The
  // first actual API call then exercises the server's typed pre-write 422.
  mockApi.createPlant
    .mockReset()
    .mockRejectedValueOnce(new RequestError(422, "invalid_plant_input", false))
    .mockRejectedValue(new Error("lost acknowledgment"));
  render(
    <PreferencesProvider>
      <QueryClientProvider client={new QueryClient()}>
        <CaptureScreen />
      </QueryClientProvider>
    </PreferencesProvider>,
  );
  fireEvent.press(screen.getByRole("button", { name: "Choose a photo" }));
  await screen.findByPlaceholderText("Name this particular plant");
  await waitFor(() =>
    expect(
      screen.getByPlaceholderText("Name this particular plant").props.editable,
    ).toBe(true),
  );
  fireEvent.changeText(
    screen.getByPlaceholderText("Name this particular plant"),
    "x".repeat(121),
  );
  fireEvent.press(screen.getByRole("button", { name: "Save plant" }));
  await screen.findByText(
    "Check your plant details. Use a name of 1–120 characters, a place of up to 200 characters, and a note of up to 8,000 characters.",
  );
  expect(mockApi.createPlant).not.toHaveBeenCalled();
  expect(mockDrafts[0]?.submittedAt).toBeUndefined();
  fireEvent.changeText(
    screen.getByPlaceholderText("Name this particular plant"),
    "Server rejected this",
  );
  fireEvent.press(screen.getByRole("button", { name: "Save plant" }));
  await waitFor(() => expect(mockApi.createPlant).toHaveBeenCalledTimes(1));
  await waitFor(() =>
    expect(
      screen.getByPlaceholderText("Name this particular plant").props.editable,
    ).toBe(true),
  );
  expect(mockDrafts[0]?.submittedAt).toBeUndefined();
  fireEvent.changeText(
    screen.getByPlaceholderText("Name this particular plant"),
    "Corrected tree",
  );
  fireEvent.press(screen.getByRole("button", { name: "Save plant" }));
  await waitFor(() => expect(mockApi.createPlant).toHaveBeenCalledTimes(2));
  await waitFor(() =>
    expect(
      screen.getByPlaceholderText("Name this particular plant").props.editable,
    ).toBe(false),
  );
});

function showCapture() {
  mockDrafts = [];
  render(
    <PreferencesProvider>
      <QueryClientProvider client={new QueryClient()}>
        <CaptureScreen />
      </QueryClientProvider>
    </PreferencesProvider>,
  );
}

test("native shutter waits for camera readiness and recovers after a capture rejection", async () => {
  mockTakePicture.mockReset().mockRejectedValue(new Error("camera_failed"));
  showCapture();
  fireEvent.press(screen.getByRole("button", { name: "Photograph a plant" }));
  expect(
    screen.getByRole("button", { name: "Take photograph" }),
  ).toBeDisabled();
  fireEvent.press(screen.getByRole("button", { name: "Take photograph" }));
  expect(mockTakePicture).not.toHaveBeenCalled();
  act(() => mockCameraProps.onCameraReady());
  fireEvent.press(screen.getByRole("button", { name: "Take photograph" }));
  await screen.findByText(
    "We couldn’t prepare this photo. Try saving again, or choose a different photo.",
  );
  expect(screen.getByRole("button", { name: "Take photograph" })).toBeEnabled();
  expect(mockTakePicture).toHaveBeenCalledTimes(1);
  fireEvent.press(screen.getByRole("button", { name: "Cancel" }));
  expect(screen.getByRole("button", { name: "Choose a photo" })).toBeEnabled();
});

test("a camera mount failure returns to usable gallery capture", () => {
  showCapture();
  fireEvent.press(screen.getByRole("button", { name: "Photograph a plant" }));
  act(() => mockCameraProps.onMountError());
  expect(screen.getByRole("button", { name: "Choose a photo" })).toBeEnabled();
  expect(screen.queryByRole("button", { name: "Take photograph" })).toBeNull();
});

test("a phone loopback configuration explains the connection failure and preserves its retryable draft", async () => {
  mockApi.createPlant
    .mockReset()
    .mockRejectedValue(new RequestError(0, "phone_api_unreachable", false));
  showCapture();
  fireEvent.press(screen.getByRole("button", { name: "Choose a photo" }));
  const name = await screen.findByPlaceholderText("Name this particular plant");
  await waitFor(() => expect(name.props.editable).toBe(true));
  fireEvent.changeText(name, "Phone plant");
  fireEvent.press(screen.getByRole("button", { name: "Save plant" }));
  await screen.findByText(
    /This preview cannot reach the plant service from your phone/,
  );
  expect(mockDrafts[0]?.original).toBe("file:///original.jpg");
  expect(screen.getByRole("button", { name: "Retry" })).toBeEnabled();
});
