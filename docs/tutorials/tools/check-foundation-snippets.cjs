/* global __dirname */
// Check embedded teaching examples without writing virtual files into src/.
const ts = require("typescript");
const fs = require("node:fs");
const path = require("node:path");
const base = path.resolve(__dirname, "../../..");
const names = {
  "01-3": "src/components/__tutorial_WelcomeCard.tsx",
  "02-0": "src/components/PlantSummaryCard.tsx",
  "02-2": "src/components/__tutorial_PlantList.tsx",
  "03-1": "src/components/__tutorial_OpenPlantButton.tsx",
  "03-2": "src/app/plants/__tutorial_identity.tsx",
  "04-0": "src/components/__tutorial_SnapshotCounter.tsx",
  "04-2": "src/components/plant-summary-reducer.ts",
  "04-3": "src/components/__tutorial_SummaryEditor.tsx",
  "05-0": "src/components/__tutorial_read_plants.ts",
  "05-2": "src/app/(tabs)/__tutorial_GardenStatus.tsx",
  "05-4": "src/components/__tutorial_useRefreshPlant.ts",
};
const virtual = new Map();
for (const f of fs
  .readdirSync(path.join(base, "docs/tutorials/content"))
  .filter((x) => /^0[1-5]-.*\.json$/.test(x))) {
  const d = JSON.parse(
    fs.readFileSync(path.join(base, "docs/tutorials/content", f), "utf8"),
  );
  d.sections.forEach((s, i) => {
    if (s.code && ["ts", "tsx"].includes(s.code.language)) {
      const name = names[`${d.id}-${i}`];
      if (!name)
        throw new Error(
          `No virtual placement declared for ${d.id} section ${i}`,
        );
      virtual.set(path.join(base, name), s.code.text);
    }
  });
}
const config = ts.readConfigFile(
  path.join(base, "tsconfig.json"),
  ts.sys.readFile,
);
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, base);
const options = { ...parsed.options, noEmit: true, skipLibCheck: true };
const host = ts.createCompilerHost(options);
const { fileExists, readFile, getSourceFile } = host;
host.fileExists = (f) => virtual.has(f) || fileExists(f);
host.readFile = (f) => virtual.get(f) ?? readFile(f);
host.getSourceFile = (f, v, onError, newSource) =>
  virtual.has(f)
    ? ts.createSourceFile(f, virtual.get(f), v, true)
    : getSourceFile(f, v, onError, newSource);
const roots = [
  ...virtual.keys(),
  path.join(base, "expo-env.d.ts"),
  ...ts.sys.readDirectory(path.join(base, ".expo/types"), [".d.ts"]),
];
const program = ts.createProgram(roots, options, host);
const diagnostics = ts
  .getPreEmitDiagnostics(program)
  .filter((d) => d.file && virtual.has(d.file.fileName));
for (const d of diagnostics) {
  const loc = d.file.getLineAndCharacterOfPosition(d.start);
  console.error(
    `${path.relative(base, d.file.fileName)}:${loc.line + 1}: ${ts.flattenDiagnosticMessageText(d.messageText, " ")}`,
  );
}
console.log(
  `${virtual.size} embedded TypeScript snippets checked with the repository compiler options; ${diagnostics.length} snippet diagnostics.`,
);
process.exitCode = diagnostics.length ? 1 : 0;
