# Voice web-search failure: findings and repair

Investigation: 2026-10-18. The requested speech model remains `gpt-realtime-2.1`.

## Reproduced cause

The original Tavily adapter sent `fetchTimeout: 10000`. Installed `@tavily/core` 0.7.14 translates this into the HTTP body field `fetch_timeout`; it does not treat it as a JavaScript millisecond deadline. The live API rejected the request with HTTP 400 and this message:

> fetch_timeout must be a positive number of seconds, at most 30.0

The exact existing payload failed in 389 ms. Removing that field, using the same loaded key and the public query “Hydrangea native distribution,” returned HTTP 200 with four results in 1,771 ms. The application's original adapter independently reproduced `search_unavailable`.

The separate SDK `timeout: 8` was already eight seconds: the installed library multiplies it by 1,000 before configuring Axios. The bug was the additional provider-side `fetchTimeout`, not that SDK request deadline. The [Tavily JavaScript reference](https://docs.tavily.com/sdk/javascript/reference) describes the search options; the installed SDK mapping and live HTTP validation establish the problematic field's units.

## Why two valid keys did not provide two search paths

The configuration probe confirmed live providers were enabled, both keys were present, and the loaded values matched `.env`. It printed only presence/equality flags, never key values. A direct OpenAI Responses search with the configured `gpt-6-luna` backend model completed in 4,933 ms and returned a web-search call plus a URL citation. No key rotation, billing change or `.env` value change was needed for this repair.

Previously, both text and voice called an application function named `search_web`, and that function used only Tavily. The OpenAI key powered inference but did not automatically enable hosted browsing. OpenAI documents [Realtime function calling](https://developers.openai.com/api/docs/guides/realtime-conversations#function-calling) as application-executed tools. Its [hosted web-search integration](https://developers.openai.com/api/docs/guides/tools-web-search) uses the Responses API. The app had no such research adapter or fallback.

A broad catch then discarded the provider's rejection, reducing every failure to `search_unavailable`. The voice layer correctly kept the conversation open but could only tell the user that lookup was unavailable. Earlier voice reliability/preamble probes used controlled tool results; they did not verify the real Tavily request contract. This investigation closes that coverage gap.

## Implemented behavior

- Tavily remains the first choice. Its invalid `fetch_timeout` field is omitted; the SDK request timeout is four seconds.
- On failure, one OpenAI Responses request uses `OPENAI_BACKEND_MODEL`, hosted `web_search`, a low search-context setting, no SDK retries, and a 6.5-second timeout. The combined provider budgets leave headroom within the existing 12-second voice-tool deadline. Real latency and provider availability remain variable.
- The fallback requires a completed search call and actual URL citations. Unsourced model text or incomplete responses are rejected. A valid empty Tavily result does not trigger another paid request.
- The Responses request uses `store: false`, bounded output and one built-in tool call. SDK 7.34 omits the documented [`max_tool_calls` request field](https://developers.openai.com/api/reference/resources/responses/methods/create), so the request has an explicit typed extension; live verification confirms acceptance.
- Results retain safe HTTP(S) URLs, titles, bounded evidence text and retrieval timestamps. Stable URL-derived IDs avoid collisions across repeated searches. Citation text is associated with its preceding paragraph, not an unrelated whole answer.
- Failures log only provider and an allowlisted reason: credentials, quota, rate limit, timeout, request, network, invalid response or upstream. Queries, credentials and raw exceptions are not logged. If both providers fail, callers receive the same safe recoverable application error.
- The tool description clarifies that an earlier turn's failure does not disable a fresh lookup. Existing interruption fences still prevent late results from restarting canceled speech.
- Source links are visible and clickable directly beside the chat answer. The existing disclosure still contains reference details and photographs.

The application still constructs public botanical queries before either provider is invoked. Private chat history, photos, arbitrary model text, user identifiers and precise location do not enter the fallback request. The existing conservative query policy can broaden general-conversation searches to “plants” plus a botanical topic when no confirmed selected taxon exists. Availability is repaired here; this policy is not unrestricted general-purpose search and can limit specificity. Selecting an identified plant gives the current search policy a verified scientific name.

Both live-mode provider keys remain required by existing startup validation. OpenAI fallback uses the backend model rather than changing the voice model. A different backend model must support Responses hosted web search. A fallback adds one paid search only when the primary provider fails; it does not bypass provider quotas or make credentials with insufficient permissions work.

## Verification

The fixed primary adapter returned four real sources in 2,576 ms. A controlled invalid Tavily test credential then caused the safe `credentials` diagnostic and successfully exercised the full fallback path, returning a cited Kew source in 6,055 ms. The actual `.env` was not edited.

A live synthetic voice test used the production research adapters with public botanical input and in-memory conversation context. `gpt-realtime-2.1` emitted a commentary preamble, performed one real search returning four sources (1,962 ms), then produced final-answer audio and remained connected without errors. First audio arrived 567 ms after the provider endpoint. These samples exclude physical capture/playback and Firebase/Clerk context latency. They are not latency guarantees. No real microphone recording, private records or Firebase writes were used.

The first voice test ended its synthetic microphone stream after only two seconds of trailing silence and timed out. Keeping eight seconds of silence, as a continuously streaming microphone would do while waiting, completed the test. This test-harness adjustment does not change production VAD settings.

Automated coverage includes the corrected Tavily request, fallback ordering, citation requirements, failure classification/redaction, safe empty results, malformed results, stable source IDs, public-query privacy through fallback, saved voice citations, and visible safe source links. The isolated checkout passed 65 unit, 31 script, 165 server and 96 component checks; the final server suite passed 166 checks after adding the privacy/persistence integration test (358 total). Strict typecheck, lint, API compilation, all-platform JavaScript export and private-sentinel checks passed. Dependencies were reused from the existing installation; this was not a fresh-install verification.

Separate startup-helper edits in the shared checkout temporarily failed four startup tests. Those edits were preserved and excluded from this change; the isolated checkout's startup suite passed. Physical-device audio and broad search-quality acceptance remain separate checks.
