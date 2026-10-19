import { local } from "../../src/services/local";
const mockCopy = jest.fn();
const mockFiles = new Map<string, Uint8Array>();
jest.mock("expo-sqlite", () => ({
  openDatabaseAsync: async () => ({ execAsync: async () => {} }),
}));
jest.mock("expo-file-system", () => ({
  Paths: { document: "file:///documents" },
  Directory: class {
    uri: string;
    constructor(...parts: string[]) {
      this.uri = parts.join("/");
    }
    create() {}
  },
  File: class {
    uri: string;
    constructor(...parts: (string | { uri: string })[]) {
      this.uri = parts
        .map((p) => (typeof p === "string" ? p : p.uri))
        .join("/");
    }
    copy(destination: { uri: string }) {
      return mockCopy(this.uri, destination.uri);
    }
  },
}));

beforeEach(() => {
  mockCopy.mockReset();
  mockFiles.clear();
});

test("retaining a native photo waits for SDK asynchronous copying before exposing the original", async () => {
  let finish!: () => void;
  mockCopy.mockImplementation(
    (_source, target) =>
      new Promise<void>((resolve) => {
        finish = () => {
          mockFiles.set(target, new Uint8Array([1, 2, 3]));
          resolve();
        };
      }),
  );
  let completed = false;
  const pending = local
    .retain("user_a", "photo_a", "file:///cache/camera.jpg")
    .then((uri) => {
      completed = true;
      expect(mockFiles.has(uri)).toBe(true);
      return uri;
    });
  await Promise.resolve();
  expect(completed).toBe(false);
  finish();
  expect(await pending).toBe("file:///documents/originals/user_a/photo_a");
});

test("native copy rejection reaches capture instead of becoming an unhandled background failure", async () => {
  mockCopy.mockRejectedValue(new Error("storage_full"));
  await expect(
    local.retain("user_a", "photo_a", "file:///cache/camera.jpg"),
  ).rejects.toThrow("storage_full");
});
