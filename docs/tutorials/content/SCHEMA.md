# Course content interface

Each lesson is a standalone JSON file named `01-foundations.json` etc. Write valid JSON, no JavaScript. The root renderer and notebook builder consume this format. Plain paragraphs are preferred, inline backticks are allowed. Do not insert raw HTML.

```
{
 "id":"01", "slug":"foundations", "title":"Your first living screen",
 "subtitle":"One sentence with the concrete outcome.", "minutes":35,
 "stage":"Seed", "prerequisites":["Basic JavaScript functions and arrays"],
 "outcomes":["A full sentence describing an observable skill."],
 "intro":["Two or more fully explained, connected paragraphs."],
 "sections":[
  {"title":"A clear teaching heading", "paragraphs":["Connected explanations."],
   "diagram":"runtime", "code":{"language":"tsx","filename":"Teaching example: Example.tsx","text":"..."},
   "callout":{"title":"A useful distinction","text":"..."}}
 ],
 "lab":{"kind":"runtime","title":"A concrete experiment","instructions":"Predict, operate a control, then explain the observation."},
 "quiz":[{"question":"...", "options":["...","...","..."], "answer":0,"explanation":"A fully explained answer, including why the tempting wrong choice fails."}],
 "exercise":{"title":"...", "brief":"...", "steps":["..."], "acceptance":["..."], "hint":"...", "solution":"A worked explanation or code."},
 "reflection":"A transfer question with an answer the learner must explain.",
 "takeaways":["Complete sentence."],
 "repo":[{"path":"src/...","why":"Explain the actual source relationship."}],
 "sources":[{"title":"Official documentation title","url":"https://..."}]
}
```

Available diagram keys: `runtime`, `components`, `layout`, `navigation`, `state`, `network`, `security`, `camera`, `outbox`, `quality`, `voice`. Available lab kinds: `runtime`, `layout`, `navigation`, `state`, `network`, `security`, `camera`, `outbox`, `quality`, `voice`.

Curriculum: 01 Expo/runtime/setup; 02 components/props and accessible layout; 03 Router and specimen identity; 04 local state, immutable updates, context/reducers; 05 asynchronous API calls and Query; 06 auth/contracts/privacy; 07 camera and capture; 08 durable offline drafts/outbox; 09 platform differences, glass accessibility, language and voice; 10 tests/debug/release/capstone. At least 4 substantial sections, 2 code examples, 3 quiz questions per lesson. Aim for 1100–1600 words per lesson, 35–60 min study. Root creates interactive HTML labs, SVG diagrams, notebooks. Content must teach what this repository actually does, distinguish self-contained teaching examples from drop-in code, and cite actual source files.

All new outputs go within docs/tutorials. No production app changes, no secrets, no new service provisioning. Code examples must be complete enough to understand, declared as excerpts if dependent on existing providers. Explain browser labs are JavaScript teaching models, not Expo/native runtimes. Jupyter uses Python to exercise analogous logic and display React Native examples; actual TSX executes in Expo only. Do not claim Python executes React Native. Current repo pins Expo 57, React Native 0.86.3, React 19.2.3, Query 5.104.3. Prefer repository instructions over floating latest tooling. Do not overwrite another agent's files.
