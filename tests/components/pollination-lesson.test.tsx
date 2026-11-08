import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { AccessibilityInfo, Linking, Platform } from "react-native";
import { en } from "../../src/i18n/locales/en";
import { PollinationLesson } from "../../src/features/journey/PollinationLesson";
import { learningCopy } from "../../src/features/journey/learning-copy";
import {
  PreferencesProvider,
  usePreferences,
} from "../../src/theme/preferences";
import { Action } from "../../src/components/ui";
const mockPush = jest.fn();
jest.mock("expo-router", () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock("../../src/services/preference-storage", () => ({
  preferenceStorage: { get: async () => null, set: async () => {} },
}));
beforeEach(() => {
  mockPush.mockClear();
  jest
    .spyOn(AccessibilityInfo, "isReduceMotionEnabled")
    .mockResolvedValue(true);
});
afterEach(() => jest.restoreAllMocks());
function show(onContinue?: () => void) {
  return render(
    <PreferencesProvider>
      <PollinationLesson {...(onContinue ? { onContinue } : {})} />
    </PreferencesProvider>,
  );
}
test("guests can reason, retry a misconception, and continue without account or query providers", () => {
  show();
  expect(screen.getByLabelText(learningCopy.en.diagram)).toBeTruthy();
  expect(
    screen.queryByRole("button", { name: learningCopy.en.continue }),
  ).toBeNull();
  fireEvent.press(
    screen.getByRole("button", { name: learningCopy.en.optionWater }),
  );
  expect(screen.getByText(learningCopy.en.waterFeedback)).toBeTruthy();
  expect(
    screen.queryByRole("button", { name: learningCopy.en.continue }),
  ).toBeNull();
  fireEvent.press(
    screen.getByRole("button", { name: learningCopy.en.optionSpecies }),
  );
  expect(screen.getByText(learningCopy.en.speciesFeedback)).toBeTruthy();
  expect(screen.queryByText(learningCopy.en.waterFeedback)).toBeNull();
  fireEvent.press(
    screen.getByRole("button", { name: learningCopy.en.optionSeeds }),
  );
  expect(screen.getByText(learningCopy.en.seedFeedback)).toBeTruthy();
  expect(screen.getByText(learningCopy.en.connection)).toBeTruthy();
  fireEvent.press(
    screen.getByRole("button", { name: learningCopy.en.continue }),
  );
  expect(mockPush).toHaveBeenCalledWith("/species/ncsu_helianthus_annuus");
});
test("continuing supports a host callback without double navigation", () => {
  const next = jest.fn();
  show(next);
  fireEvent.press(
    screen.getByRole("button", { name: learningCopy.en.optionSeeds }),
  );
  fireEvent.press(
    screen.getByRole("button", { name: learningCopy.en.continue }),
  );
  expect(next).toHaveBeenCalledTimes(1);
  expect(mockPush).not.toHaveBeenCalled();
});
test("practice does not persist a completion claim on remount", () => {
  const view = show();
  fireEvent.press(
    screen.getByRole("button", { name: learningCopy.en.optionSeeds }),
  );
  view.unmount();
  show();
  expect(
    screen.queryByRole("button", { name: learningCopy.en.continue }),
  ).toBeNull();
});
function LocaleSwitch({ locale }: { locale: keyof typeof learningCopy }) {
  const { setPreferences, preferences } = usePreferences();
  return (
    <Action
      title="Change language"
      onPress={() => setPreferences({ ...preferences, locale })}
    />
  );
}
test.each(Object.keys(learningCopy) as (keyof typeof learningCopy)[])(
  "the challenge remains playable in %s",
  (locale) => {
    const copy = learningCopy[locale];
    render(
      <PreferencesProvider>
        <LocaleSwitch locale={locale} />
        <PollinationLesson />
      </PreferencesProvider>,
    );
    fireEvent.press(screen.getByRole("button", { name: "Change language" }));
    fireEvent.press(screen.getByRole("button", { name: copy.optionSeeds }));
    expect(screen.getByText(copy.seedFeedback)).toBeTruthy();
    expect(screen.getByRole("button", { name: copy.continue })).toBeTruthy();
  },
);
test("a source link failure is shown without losing the activity", async () => {
  const open = jest
    .spyOn(Linking, "openURL")
    .mockRejectedValueOnce(new Error("offline"));
  show();
  fireEvent.press(screen.getByRole("button", { name: learningCopy.en.source }));
  fireEvent.press(screen.getByRole("button", { name: "USDA NRCS" }));
  await waitFor(() =>
    expect(open).toHaveBeenCalledWith(
      "https://www.nrcs.usda.gov/conservation-basics/animals/insects-pollinators",
    ),
  );
  await waitFor(() => expect(screen.getByText(en.error)).toBeTruthy());
  expect(screen.getByText(learningCopy.en.question)).toBeTruthy();
  open.mockRestore();
});

test("VoiceOver receives explanatory feedback when an answer changes", () => {
  jest.replaceProperty(Platform, "OS", "ios");
  const announce = jest.spyOn(AccessibilityInfo, "announceForAccessibility");
  show();
  fireEvent.press(
    screen.getByRole("button", { name: learningCopy.en.optionWater }),
  );
  expect(announce).toHaveBeenCalledWith(
    `${learningCopy.en.waterFeedback} ${learningCopy.en.retry}`,
  );
});
