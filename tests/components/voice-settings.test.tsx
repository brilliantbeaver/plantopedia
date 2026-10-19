import { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { VoiceSettingsCard } from "../../src/components/VoiceSettingsCard";
import { PreferencesProvider } from "../../src/theme/preferences";
import {
  defaultVoiceSettings,
  type VoiceSettings,
} from "@plantopedia/contracts";
const changed = jest.fn();
function Fixture() {
  const [value, setValue] = useState<VoiceSettings>(defaultVoiceSettings);
  return (
    <VoiceSettingsCard
      value={value}
      onChange={(next) => {
        setValue(next);
        changed(next);
      }}
    />
  );
}
test("six selectable voices and progressive listening/sound controls persist useful presets", () => {
  render(
    <PreferencesProvider>
      <Fixture />
    </PreferencesProvider>,
  );
  for (const name of ["Marin", "Coral", "Shimmer", "Cedar", "Ash", "Ballad"])
    expect(screen.getByRole("button", { name })).toBeOnTheScreen();
  fireEvent.press(screen.getByRole("button", { name: "Cedar" }));
  expect(changed).toHaveBeenLastCalledWith(
    expect.objectContaining({ voice: "cedar" }),
  );
  expect(screen.queryByRole("button", { name: "Busy room" })).toBeNull();
  fireEvent.press(screen.getByRole("button", { name: /Listening setup/ }));
  fireEvent.press(screen.getByRole("button", { name: "Busy room" }));
  expect(changed).toHaveBeenLastCalledWith(
    expect.objectContaining({
      voice: "cedar",
      microphone: "busy",
      interruption: "firm",
      turnTaking: "patient",
    }),
  );
  fireEvent.press(screen.getByRole("button", { name: "Button only" }));
  expect(changed).toHaveBeenLastCalledWith(
    expect.objectContaining({ interruption: "off" }),
  );
  fireEvent.press(screen.getByRole("button", { name: /Sound & delivery/ }));
  fireEvent.press(screen.getByRole("button", { name: "Soft rain" }));
  expect(changed).toHaveBeenLastCalledWith(
    expect.objectContaining({ ambience: "rain" }),
  );
  fireEvent.press(screen.getByRole("button", { name: "Reset voice settings" }));
  expect(changed).toHaveBeenLastCalledWith(defaultVoiceSettings);
});
