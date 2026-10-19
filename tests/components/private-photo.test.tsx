import { act, render, screen, waitFor } from "@testing-library/react-native";
import { PrivatePhoto } from "../../src/components/PrivatePhoto";

const mockToken = jest.fn();
let mockApi = { token: mockToken };
jest.mock("../../src/services/session", () => ({
  useSessionApi: () => ({ api: mockApi }),
}));
jest.mock("../../src/theme/preferences", () => ({
  usePreferences: () => ({ t: () => "Plant photograph" }),
}));
jest.mock("../../src/config/public-env", () => ({
  publicConfig: {
    success: true,
    data: { apiBaseUrl: "http://localhost:3001" },
  },
}));
jest.mock("../../src/platform/private-photo", () =>
  jest.requireActual("../../src/platform/private-photo.web"),
);

const originalFetch = global.fetch;
const originalCreate = URL.createObjectURL;
const originalRevoke = URL.revokeObjectURL;
const mockFetch = jest.fn();
const mockCreate = jest.fn();
const mockRevoke = jest.fn();
beforeEach(() => {
  jest.resetAllMocks();
  mockApi = { token: mockToken };
  mockToken.mockResolvedValue("private-token");
  global.fetch = mockFetch;
  URL.createObjectURL = mockCreate.mockReturnValue("blob:private-photo");
  URL.revokeObjectURL = mockRevoke;
});
afterEach(() => {
  global.fetch = originalFetch;
  URL.createObjectURL = originalCreate;
  URL.revokeObjectURL = originalRevoke;
});

test("web photos authenticate with fetch and render only a local blob, releasing it on unmount", async () => {
  const blob = new Blob(["photo"], { type: "image/jpeg" });
  mockFetch.mockResolvedValue({ ok: true, blob: async () => blob });
  const view = render(<PrivatePhoto plantId="plant_a" photoId="photo_a" />);
  const image = await screen.findByLabelText("Plant photograph");
  expect(mockFetch).toHaveBeenCalledWith(
    "http://localhost:3001/v1/photos/photo_a?plantId=plant_a",
    expect.objectContaining({
      headers: { Authorization: "Bearer private-token" },
      cache: "no-store",
      credentials: "omit",
    }),
  );
  expect(mockCreate).toHaveBeenCalledWith(blob);
  expect(image.props.source).toEqual({ uri: "blob:private-photo" });
  view.unmount();
  expect(mockRevoke).toHaveBeenCalledWith("blob:private-photo");
});

test("a rejected private response never becomes an image or a public URL fallback", async () => {
  const readBlob = jest.fn();
  mockFetch.mockResolvedValue({
    ok: false,
    status: 401,
    json: async () => ({}),
    blob: readBlob,
  });
  render(<PrivatePhoto plantId="plant_a" photoId="photo_a" />);
  await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
  await act(async () => {});
  expect(readBlob).not.toHaveBeenCalled();
  expect(mockCreate).not.toHaveBeenCalled();
  expect(screen.queryByLabelText("Plant photograph")).toBeNull();
});

test("unmount aborts an in-flight private photo and suppresses its late body", async () => {
  let finish!: (blob: Blob) => void;
  mockFetch.mockResolvedValue({
    ok: true,
    blob: () => new Promise<Blob>((resolve) => (finish = resolve)),
  });
  const view = render(<PrivatePhoto plantId="plant_a" photoId="photo_a" />);
  await waitFor(() => expect(finish).toBeDefined());
  const signal = mockFetch.mock.calls[0][1].signal as AbortSignal;
  view.unmount();
  expect(signal.aborted).toBe(true);
  await act(async () => finish(new Blob(["late photo"])));
  expect(mockCreate).not.toHaveBeenCalled();
});

test("switching owner resources immediately hides and releases the previous owner's photo", async () => {
  mockFetch.mockResolvedValue({
    ok: true,
    blob: async () => new Blob(["photo"]),
  });
  const view = render(<PrivatePhoto plantId="plant_a" photoId="photo_a" />);
  await screen.findByLabelText("Plant photograph");
  mockApi = { token: jest.fn().mockResolvedValue(null) };
  view.rerender(<PrivatePhoto plantId="plant_a" photoId="photo_a" />);
  expect(screen.queryByLabelText("Plant photograph")).toBeNull();
  expect(mockRevoke).toHaveBeenCalledWith("blob:private-photo");
  await act(async () => {});
  expect(mockFetch).toHaveBeenCalledTimes(1);
});
