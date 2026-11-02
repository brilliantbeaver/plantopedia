# Adversarial notebook, build, and packaging review

Reviewed the course builder, Python model source, all ten generated notebooks, static reader, course README, and generated ZIP listings. This was a read-only implementation review; only this report was written. The source was still being assembled, so the references below identify the reviewed version rather than a frozen Git revision. Browser QA and full nbclient execution were assigned separately to the lead.

## Findings

### Medium — the SQLite notebook leaves both connections open before temporary-directory cleanup

**Location:** `tools/notebook_labs.py:186` and `tools/notebook_labs.py:190`; generated into `notebooks/08-offline.ipynb`.

**Trigger:** Run lesson 08's model on Windows, where deleting an open database file can fail. Both `with sqlite3.connect(path) as db:` blocks manage transactions but do not close their connections. The surrounding `TemporaryDirectory` exits while `db` and `reopened` still reference open handles.

**Consequence:** The notebook can raise `PermissionError` while removing the temporary directory instead of completing its promised top-to-bottom run. On POSIX, successful deletion conceals the leaked handles and makes the test appear portable. The example also teaches the wrong cleanup assumption in a lesson about persistence boundaries.

**Evidence:** Executing the unmodified lesson-08 model and then calling `db.execute('SELECT 1').fetchone()` and `reopened.execute('SELECT 1').fetchone()` returned `(1,)` for both connections after the temporary-directory block had exited. Python documents that the [SQLite connection context manager does not close its connection](https://docs.python.org/3.13/library/sqlite3.html#how-to-use-the-connection-context-manager). Its [TemporaryDirectory documentation](https://docs.python.org/3.11/library/tempfile.html#tempfile.TemporaryDirectory) explicitly names removal of open files on Windows as a possible permission error. The Windows failure is inferred from this documented behavior; a Windows kernel was not run.

**Repair:** Use `contextlib.closing` or explicit `try/finally` to close the first connection before opening the second, and close the second before leaving the temporary directory. Retain an explicit successful commit. Regenerate notebook 08 and its ZIPs. A regression should verify that the connection handles are closed, not merely that a second connection can see the committed row.

### Medium — notebook experiment directions promise controls their models do not provide

**Location:** `tools/build_course.py:74`, which copies `lesson['lab']['instructions']` directly into every notebook. Specific model boundaries are `tools/notebook_labs.py:57`, `:117`, `:154`, and `:226`.

**Trigger:** Follow the notebook's experiment paragraph literally. These are browser-oriented instructions inserted above smaller Python models:

- `notebooks/03-navigation.ipynb:302` asks the learner to use Back. Its model at `:357` offers a specimen dropdown and prints one route; it has no history or Back operation.
- `notebooks/05-network.ipynb:305` asks for a failed refresh with cached records. Its model at `:360` classifies one response and prints a key; it does not retain a cache or model refresh transitions.
- `notebooks/07-camera.ipynb:293` asks the learner to introduce a preparation failure. Its decision model at `:329` only accepts permission, readiness, selected, and retained flags.
- `notebooks/09-cross-platform.ipynb:339` asks the learner to start, interrupt, and end a session. Its widget explorer at `:387` controls glass and language. The later `VoiceModel` executes a fixed start/end/stale-callback assertion sequence and has no interruption operation.

**Consequence:** Learners cannot perform the stated experiment with the provided controls. The complete lesson text and working model assertions do not repair the mismatch between the promised interaction and the available task.

**Repair:** Give each notebook model an accurate experiment paragraph, clearly state what it omits, and point to the browser/Expo exercise for the missing interaction. Alternatively, implement the promised controls. Review these directions separately from the browser lab directions after each content change.

### Medium — rebuilding the whole-course ZIP embeds an obsolete checksum manifest

**Location:** `tools/build_course.py:147` through `:154`.

**Trigger:** Run the documented builder a second time. The first run creates `downloads/manifest.json` only after writing `plantopedia-course-kit.zip`. A later run walks every existing file into the whole-course ZIP, including that previous manifest, and only afterward replaces the outside manifest with new hashes.

**Consequence:** The downloaded course kit contains a stale manifest that cannot describe its own current ZIP and can also mismatch regenerated lesson archives. The first reviewed archive omitted the manifest entirely, which follows from the same ordering. The external manifest is current; the problem is the stale copy inside a subsequent bundle.

**Evidence:** The reviewed first-build ZIP had no entry ending in `/downloads/manifest.json`. The next-build inclusion follows directly from the unrestricted `ROOT.rglob('*')` loop and the fact that only the whole-course ZIP itself is excluded by filename. The manifest's own write occurs afterward. No implementation rebuild was run during this read-only review.

**Repair:** Exclude the generated manifest from the whole-course archive, or generate a separate internal manifest covering only artifacts already finalized before packaging. Do not attempt a self-referential checksum. Test the second build, not just the first archive's CRC integrity.

### Low — the smaller bundle instructions begin with links to files absent from those bundles

**Location:** `tools/build_course.py:143` through `:146`; copied from `README.md:3`.

**Trigger:** Extract `plantopedia-notebooks.zip` or `plantopedia-exercises.zip` and follow its `START-HERE.md`. The same full-course README is copied to both. Its first action is to open `index.html`; neither ZIP contains that file. Several later guide/download/review links are absent too.

**Consequence:** The smaller archives give readers a broken starting link even though their contained notebook or exercise workspace can be used independently. This is a packaging/instruction failure, rather than a claim that notebook execution needs the missing HTML.

**Evidence:** ZIP listings contain `notebooks/*` plus `START-HERE.md`, or `exercises/*` plus `START-HERE.md`, with no `index.html`. The first paragraph of each bundled `START-HERE.md` links directly to it.

**Repair:** Generate a short bundle-specific starting file. Notebook instructions should start with creating a Python environment and `jupyter lab notebooks`; exercise instructions should link to `exercises/README.md`. Describe other course materials as separate downloads.

## Claims and limits checked

| Claim | Assessment | Evidence and boundary |
| --- | --- | --- |
| Code cells use Python rather than pretending to execute TSX. | Holds for the reviewed notebooks. | The builder puts examples in Markdown fences at `build_course.py:71`; model cells come from `LABS` at `:75`. |
| All ten notebooks parse with Python 3.9 syntax. | Holds for syntax. | Parsed every code cell with `ast.parse(..., feature_version=(3,9))`; no syntax errors. This is not an actual Python-3.9 runtime run. |
| Model cells need no app imports, service accounts, credentials, camera, or microphone. | Holds within the source inspected. | Models use included fixtures, standard-library modules and setup-provided IPython displays. Optional widgets are imported in the setup cell. |
| Missing-widget mode uses the documented function defaults. | Holds for current defaults. | `explore` calls `function()` at `build_course.py:48`; current explorer defaults match the initial supplied controls. It does not honor arbitrary changed control dictionaries in fallback mode, so the README's instruction to edit function defaults matters. Frontend widget rendering was not tested here. |
| The static reader has balanced generated tags and working local source/image links in the checkout. | Holds for the reviewed generation. | A strict tag-stack walk found no mismatched/unclosed tags or duplicate IDs; all 116 collected local/remote links were checked for local existence, with no missing local paths. This is not a formal HTML-conformance or accessibility audit. |
| The thirteen downloaded ZIPs are readable. | Holds for CRC integrity. | Python `ZipFile.testzip()` returned no corrupt entry for all thirteen. Content and instructions still have the findings above. |

## What passing checks do not prove

A successful Mac/Linux nbclient run cannot detect Windows refusal to delete an open SQLite file. Parsing every code cell cannot establish model correctness, teachability, or widget usability. Running only default controls does not exercise every slider/dropdown combination or unsupported frontend rendering. A model assertion that a stale callback is ignored does not prove a native microphone stops. ZIP CRC tests do not validate relative links, the truth of `START-HERE.md`, or second-build checksum freshness. A balanced HTML tag stack does not establish contrast, screen-reader reading order, touch usability, or print quality.

The lesson-08 SQLite assertions establish that committed data is visible through another connection. They do not establish that the first connection was closed, that the app process restarted, that a retained camera file survived, or that Expo's native SQLite adapter behaved correctly. The notebook source does correctly describe that narrower metadata model, but the cleanup bug still needs repair.

Verdict: needs-attention

## Reviewed-source fingerprints
- `tools/build_course.py`: 173 lines; SHA-256 `a38c09145181631e9136907f29fc5182ac8351f847efbe926e9bfd2f06d07993`; last line `if __name__=='__main__':main()`.
- `tools/notebook_labs.py`: 307 lines; SHA-256 `1507219b8253366ce9a70b313cb21ef757f41989dad4c2dc161b26439ecbf3b4`; last line `}`.
- `README.md`: 90 lines; SHA-256 `f03fa129a401a170163ea47f637520bca8c5a005ef07a0c2c707df884cd51f98`; last line `[Review and verification](review/verification.md) records actual checks and their limits. [Independent content/model review](review/content-and-models-review.md) and [exercise review](review/exercises-review.md) preserve findings and repairs. New teaching code is isolated from the production app, and the user’s existing work is left in place.`.
- `course-reader.html`: 648 lines; SHA-256 `eaf0f1e5697f17bd44266c05cecd6bf0f3f1cdb1150fe1948a5dce1afae35c29`; last line `</main></body></html>`.

## Authorized repair record

After the read-only report, the lead assigned source fixes in `tools/notebook_labs.py` and `tools/build_course.py` to this reviewer. All four findings above have source repairs:

- The SQLite model now wraps both connections in `contextlib.closing`, commits the write in its transaction scope, closes the first handle before reopening, closes the second before folder cleanup, and verifies that both handles reject a query before leaving `TemporaryDirectory`.
- Ten notebook-specific experiment paragraphs now describe the actual model controls, current defaults, and omitted interactions. They explicitly point learners to the browser or Expo layer for broader behavior. Missing-widget mode prints the defaults it actually uses.
- The whole-course ZIP explicitly excludes the outside `downloads/manifest.json`, avoiding a stale embedded copy and self-checksum recursion.
- The notebooks and exercise archives now receive dedicated starting instructions that refer to their actual contents, with Windows activation/PowerShell guidance where relevant. Notebook companion links are described as conditional on having the complete folder.

Source verification after these repairs: both Python source files parse with Python-3.9 syntax; every model's widget-free execution and assertions complete; lesson 08's handles reject post-close queries; all ten explorer defaults match the initial scalar/list/range widget declarations; both bundle starting strings avoid the missing `index.html` link. No notebooks or archives were regenerated by this reviewer. The lead retains generation, nbclient, browser, and archive acceptance responsibilities, so the historical generated-file line references above describe the reviewed pre-repair artifacts.

Final source status: repaired; generated-artifact acceptance remains with the lead.
