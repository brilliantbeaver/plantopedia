import { useState } from "react";
import { render, screen, userEvent } from "@testing-library/react-native";
import { CandidateCard } from "../../src/components/CandidateCard";
import { Field, Action, Copy } from "../../src/components/ui";
import {
  PreferencesProvider,
  dictionaries,
  usePreferences,
} from "../../src/theme/preferences";
const candidate = {
  scientificName: "Acer rubrum",
  authorship: "L.",
  commonNames: ["Red maple"],
  score: 0.82,
  taxonId: null,
};
test("candidate retains scientific name and displays a percentage; selection is an explicit callback", async () => {
  const selected = jest.fn();
  render(
    <PreferencesProvider>
      <CandidateCard candidate={candidate} onSelect={selected} />
    </PreferencesProvider>,
  );
  expect(screen.getByText("Acer rubrum")).toBeOnTheScreen();
  expect(screen.getByText("82%")).toBeOnTheScreen();
  expect(screen.getByText(/Confidence · Pl@ntNet/)).toBeOnTheScreen();
  expect(selected).not.toHaveBeenCalled();
  await userEvent.press(
    screen.getByRole("button", { name: "Use this match: Acer rubrum" }),
  );
  expect(selected).toHaveBeenCalledTimes(1);
});
test("pending selection prevents duplicate callbacks", async () => {
  const selected = jest.fn();
  render(
    <PreferencesProvider>
      <CandidateCard candidate={candidate} onSelect={selected} busy />
    </PreferencesProvider>,
  );
  expect(
    screen.getByRole("button", { name: "Use this match: Acer rubrum" }),
  ).toBeDisabled();
  await userEvent.press(
    screen.getByRole("button", { name: "Use this match: Acer rubrum" }),
  );
  expect(selected).not.toHaveBeenCalled();
});
function Editor() {
  const [text, setText] = useState("");
  const [notes, setNotes] = useState<readonly string[]>([]);
  return (
    <>
      <Field placeholder="Observation" value={text} onChangeText={setText} />
      <Action
        title="Add"
        disabled={!text.trim()}
        onPress={() => {
          setNotes((previous) => [...previous, text]);
          setText("");
        }}
      />
      {notes.map((note, index) => (
        <Copy key={index}>{note}</Copy>
      ))}
    </>
  );
}
test("controlled input follows event → callback → state → rendered props", async () => {
  render(
    <PreferencesProvider>
      <Editor />
    </PreferencesProvider>,
  );
  expect(screen.getByRole("button", { name: "Add" })).toBeDisabled();
  await userEvent.type(screen.getByPlaceholderText("Observation"), "New leaf");
  await userEvent.press(screen.getByRole("button", { name: "Add" }));
  expect(screen.getByText("New leaf")).toBeOnTheScreen();
  expect(screen.getByPlaceholderText("Observation")).toHaveDisplayValue("");
  expect(screen.getByRole("button", { name: "Add" })).toBeDisabled();
});
function Language() {
  const { t, preferences, setPreferences } = usePreferences();
  return (
    <>
      <Copy>{t("scan")}</Copy>
      <Action
        title="Français"
        onPress={() =>
          setPreferences({ ...preferences, locale: "fr", theme: "dark" })
        }
      />
    </>
  );
}
test("language switches immediately through shared preferences", async () => {
  render(
    <PreferencesProvider>
      <Language />
    </PreferencesProvider>,
  );
  expect(screen.getByText("Scan")).toBeOnTheScreen();
  await userEvent.press(screen.getByRole("button", { name: "Français" }));
  expect(screen.getByText("Scanner")).toBeOnTheScreen();
});
test("seven dictionaries contain the complete same key set", () => {
  expect(Object.keys(dictionaries)).toHaveLength(7);
  for (const dictionary of Object.values(dictionaries))
    expect(Object.keys(dictionary).sort()).toEqual(
      Object.keys(dictionaries.en).sort(),
    );
});
