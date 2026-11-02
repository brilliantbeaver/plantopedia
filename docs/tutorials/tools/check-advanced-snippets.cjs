/* global __dirname */
// Check embedded teaching examples without writing virtual files into src/.
const ts = require("typescript");
const fs = require("node:fs");
const path = require("node:path");
const base = path.resolve(__dirname, "../../..");
const names = {
  "08-0": "src/components/__tutorial_08_0.ts",
  "08-2": "src/components/__tutorial_08_2.ts",
  "10-1": "tests/components/__tutorial_10_1.tsx",
  "09-0": "src/components/__tutorial_09_0.tsx",
  "09-2": "src/components/__tutorial_09_2.tsx",
  "09-4": "src/components/__tutorial_09_4.tsx",
  "06-1": "src/components/__tutorial_06_1.ts",
  "06-3": "src/components/__tutorial_06_3.tsx",
  "07-0": "src/components/__tutorial_07_0.tsx",
  "07-1": "src/components/__tutorial_07_1.ts"
};
const virtual = new Map();
for (const f of fs
  .readdirSync(path.join(base, "docs/tutorials/content"))
  .filter((x) => /^(0[6-9]|10)-.*\.json$/.test(x))) {
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
// The lesson-10 example lives in Jest, while the app tsconfig excludes tests.
const options = { ...parsed.options, types: [...(parsed.options.types || []), "jest"], noEmit: true, skipLibCheck: true };
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
