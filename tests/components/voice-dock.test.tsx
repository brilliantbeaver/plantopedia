import { Children } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, fireEvent } from "@testing-library/react-native";
import { VoiceDock } from "../../src/components/VoiceDock";
import { GlassSurface } from "../../src/theme/GlassSurface";
import { PreferencesProvider } from "../../src/theme/preferences";
import {
  initialVoice,
  type VoiceState,
} from "../../src/platform/voice-contract";

let mockState: VoiceState = initialVoice;
const mockListeners = new Set<() => void>();
const mockTransport = {
  record: jest.fn(async () => {}),
  send: jest.fn(async () => {}),
  play: jest.fn(async () => {}),
  disconnect: jest.fn(async () => {}),
};
const mockVoice = {
  getSnapshot: () => mockState,
  subscribe: (listener: () => void) => {
    mockListeners.add(listener);
    return () => mockListeners.delete(listener);
  },
  transport: mockTransport,
};
jest.mock("../../src/services/session", () => ({
  useSessionApi: () => ({ voice: mockVoice }),
}));
jest.mock("../../src/theme/GlassSurface", () =>
  jest.requireActual("../../src/theme/GlassSurface.tsx"),
);
jest.mock("expo-router", () => ({ useFocusEffect: jest.fn() }));
jest.mock("../../src/theme/use-reduced-motion", () => ({
  useReducedMotion: () => true,
}));
function publish(value: VoiceState) {
  act(() => {
    mockState = value;
    mockListeners.forEach((listener) => listener());
  });
}

test("empty captions never become raw View children across idle, ready and reset transitions", () => {
  mockState = initialVoice;
  const view = render(
    <QueryClientProvider client={new QueryClient()}>
      <PreferencesProvider>
        <VoiceDock conversationId="conversation_a" />
      </PreferencesProvider>
    </QueryClientProvider>,
  );
  function checkContainer() {
    const children = Children.toArray(
      view.UNSAFE_getByType(GlassSurface).props.children,
    );
    expect(
      children.filter(
        (child) => typeof child === "string" || typeof child === "number",
      ),
    ).toEqual([]);
  }
  checkContainer();
  publish({
    ...initialVoice,
    phase: "ready",
    caption: "A new leaf is visible.",
  });
  expect(screen.queryByText("A new leaf is visible.")).toBeNull();
  fireEvent.press(screen.getByRole("button", { name: /Read transcript/ }));
  expect(screen.getByText("A new leaf is visible.")).toBeOnTheScreen();
  checkContainer();
  publish({ ...initialVoice, phase: "ready", caption: "" });
  expect(screen.queryByText("A new leaf is visible.")).toBeNull();
  checkContainer();
  publish({ ...initialVoice, phase: "error", caption: "" });
  expect(screen.getByText(/Voice couldn’t finish/)).toBeOnTheScreen();
  checkContainer();
});

test("continuous voice offers mute, interruption and end without a send step", () => {
  mockState = initialVoice;
  render(
    <QueryClientProvider client={new QueryClient()}>
      <PreferencesProvider>
        <VoiceDock conversationId="chat_a" />
      </PreferencesProvider>
    </QueryClientProvider>,
  );
  expect(screen.getByText("Let’s grow together.")).toBeOnTheScreen();
  expect(screen.queryByText(/Speak for up to 30 seconds/)).toBeNull();
  fireEvent.press(screen.getByRole("button", { name: "About Voice Chat" }));
  expect(screen.getByText(/Talk naturally/)).toBeOnTheScreen();
  fireEvent.press(screen.getByRole("button", { name: "Voice Chat" }));
  expect(mockTransport.record).toHaveBeenCalledWith("chat_a", "en");
  publish({ ...initialVoice, phase: "listening" });
  fireEvent.press(screen.getByRole("button", { name: "Pause microphone" }));
  expect(mockTransport.send).toHaveBeenCalled();
  expect(screen.queryByRole("button", { name: "Send recording" })).toBeNull();
  publish({ ...initialVoice, phase: "listening", muted: true });
  expect(screen.getByText("Microphone paused")).toBeOnTheScreen();
  expect(
    screen.getByRole("button", { name: "Resume microphone" }),
  ).toBeOnTheScreen();
  publish({ ...initialVoice, phase: "processing" });
  fireEvent.press(screen.getByRole("button", { name: "End Voice Chat" }));
  expect(mockTransport.disconnect).toHaveBeenCalled();
  publish({ ...initialVoice, phase: "ready", playingAudio: true });
  fireEvent.press(screen.getByRole("button", { name: "Let me speak" }));
  expect(mockTransport.play).toHaveBeenCalled();
});

test("a requested voice start is consumed once and is canceled if its screen leaves before mount", () => {
  jest.useFakeTimers();
  mockTransport.record.mockClear();
  mockState = initialVoice;
  const started = jest.fn();
  const renderDock = (start: boolean) => (
    <QueryClientProvider client={new QueryClient()}>
      <PreferencesProvider>
        <VoiceDock
          conversationId="new_chat"
          startOnMount={start}
          onStarted={started}
        />
      </PreferencesProvider>
    </QueryClientProvider>
  );
  const view = render(renderDock(true));
  expect(mockTransport.record).not.toHaveBeenCalled();
  act(() => jest.runOnlyPendingTimers());
  expect(mockTransport.record).toHaveBeenCalledTimes(1);
  expect(mockTransport.record).toHaveBeenCalledWith("new_chat", "en");
  expect(started).toHaveBeenCalledTimes(1);
  view.rerender(renderDock(false));
  act(() => jest.runOnlyPendingTimers());
  expect(mockTransport.record).toHaveBeenCalledTimes(1);
  view.unmount();
  mockTransport.record.mockClear();
  const abandoned = render(renderDock(true));
  abandoned.unmount();
  act(() => jest.runOnlyPendingTimers());
  expect(mockTransport.record).not.toHaveBeenCalled();
  jest.useRealTimers();
});
