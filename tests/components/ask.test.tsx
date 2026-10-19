import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PreferencesProvider } from "../../src/theme/preferences";
import Ask from "../../src/app/(tabs)/ask";
let mockSequence = 0;
jest.mock("expo-crypto", () => ({ randomUUID: () => `id_${++mockSequence}` }));
const mockApi = {
  conversations: jest.fn(async () => []),
  messages: jest.fn(async () => []),
  proposals: jest.fn(async () => []),
  startConversation: jest.fn(async (input: { id: string }) => ({
    id: input.id,
  })),
  send: jest.fn(async (..._args: unknown[]) => ({})),
};
jest.mock("../../src/services/session", () => ({
  useSessionApi: () => ({ api: mockApi, owner: "user_a" }),
}));
jest.mock("../../src/components/VoiceDock", () => ({ VoiceDock: () => null }));
jest.mock("../../src/components/PrivatePhoto", () => ({
  PrivatePhoto: () => null,
}));
jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({}),
  useRouter: () => ({ push: jest.fn() }),
}));
test("text retry reuses its submitted payload; a new conversation gets a fresh message ID", async () => {
  mockApi.send.mockReset();
  mockApi.send.mockRejectedValueOnce(new Error("lost acknowledgment"));
  mockApi.send.mockResolvedValue({});
  const query = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { gcTime: 0 },
    },
  });
  const view = render(
    <PreferencesProvider>
      <QueryClientProvider client={query}>
        <Ask />
      </QueryClientProvider>
    </PreferencesProvider>,
  );
  const input = screen.getByPlaceholderText("Ask about your discovery…");
  fireEvent.changeText(input, "Remember the tree");
  fireEvent.press(screen.getByRole("button", { name: "Send" }));
  await screen.findByRole("button", { name: "Retry" });
  expect(
    screen.getByPlaceholderText("Ask about your discovery…").props.editable,
  ).toBe(false);
  fireEvent.press(screen.getByRole("button", { name: "Retry" }));
  await waitFor(() => expect(mockApi.send).toHaveBeenCalledTimes(2));
  expect(mockApi.send.mock.calls[1]).toEqual(mockApi.send.mock.calls[0]);
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "New conversation" }),
    ).toBeEnabled(),
  );
  fireEvent.press(screen.getByRole("button", { name: "New conversation" }));
  fireEvent.changeText(
    screen.getByPlaceholderText("Ask about your discovery…"),
    "Another question",
  );
  fireEvent.press(screen.getByRole("button", { name: "Send" }));
  await waitFor(() => expect(mockApi.send).toHaveBeenCalledTimes(3));
  expect(mockApi.send.mock.calls[2]?.[2]).not.toEqual(
    mockApi.send.mock.calls[0]?.[2],
  );
  expect(mockApi.send.mock.calls[2]?.[1]).toMatchObject({
    text: "Another question",
  });
  await waitFor(() =>
    expect(
      screen.getByPlaceholderText("Ask about your discovery…"),
    ).toHaveDisplayValue(""),
  );
  view.unmount();
  query.clear();
});

test.each(["conversation", "attempt"])(
  "a failed unresolved message can start a fresh %s with a new ID",
  async (mode) => {
    mockApi.send
      .mockReset()
      .mockRejectedValueOnce(new Error("provider_outcome_unknown"))
      .mockResolvedValue({});
    const query = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { gcTime: 0 },
      },
    });
    const view = render(
      <PreferencesProvider>
        <QueryClientProvider client={query}>
          <Ask />
        </QueryClientProvider>
      </PreferencesProvider>,
    );
    fireEvent.changeText(
      screen.getByPlaceholderText("Ask about your discovery…"),
      "Unresolved question",
    );
    fireEvent.press(screen.getByRole("button", { name: "Send" }));
    await screen.findByRole("button", { name: "Retry" });
    const firstKey = mockApi.send.mock.calls[0]?.[2];
    expect(firstKey).toEqual(expect.any(String));
    if (mode === "conversation")
      fireEvent.press(screen.getByRole("button", { name: "New conversation" }));
    else {
      const allocations = mockSequence;
      fireEvent.press(
        screen.getByRole("button", { name: "Start a new attempt" }),
      );
      expect(mockApi.send).toHaveBeenCalledTimes(1);
      expect(mockSequence).toBe(allocations);
      fireEvent.press(screen.getByRole("button", { name: "Cancel" }));
      expect(mockSequence).toBe(allocations);
      fireEvent.press(
        screen.getByRole("button", { name: "Start a new attempt" }),
      );
      expect(mockSequence).toBe(allocations);
      fireEvent.press(screen.getByRole("button", { name: "Confirm" }));
      await waitFor(() => expect(mockSequence).toBe(allocations + 1));
    }
    await waitFor(() =>
      expect(
        screen.getByPlaceholderText("Ask about your discovery…").props.editable,
      ).toBe(true),
    );
    fireEvent.changeText(
      screen.getByPlaceholderText("Ask about your discovery…"),
      "New question",
    );
    fireEvent.press(screen.getByRole("button", { name: "Send" }));
    await waitFor(() => expect(mockApi.send).toHaveBeenCalledTimes(2));
    expect(mockApi.send.mock.calls[1]?.[2]).not.toBe(firstKey);
    expect(mockApi.send.mock.calls[1]?.[1]).toMatchObject({
      text: "New question",
    });
    await waitFor(() =>
      expect(
        screen.getByPlaceholderText("Ask about your discovery…"),
      ).toHaveDisplayValue(""),
    );
    view.unmount();
    query.clear();
  },
);
