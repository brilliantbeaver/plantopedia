# Spoken progress updates in Plantopedia

Research and implementation: 2026-10-18. Model: `gpt-realtime-2.1`.

## Decision

Use a short, meaningful spoken acknowledgment for requests that need a noticeable lookup or several steps. Let the existing Realtime model generate it in the normal audio stream. Do not inject a fixed waiting message after every semantic endpoint.

OpenAI calls these updates preambles. Its [Realtime prompting guidance](https://developers.openai.com/api/docs/guides/voice-prompting#use-preambles-intentionally) recommends selective, concise updates tied to the work, with no preamble for immediate answers, unclear audio or background sound. The guide describes the Realtime 2 family; the [2.1 model page](https://developers.openai.com/api/docs/models/gpt-realtime-2.1) establishes the requested successor's tool/reasoning capabilities. The live 2.1 experiment below verifies this behavior in Plantopedia's adapter.

Examples for this product:

| Request | Suitable acknowledgment |
| --- | --- |
| Compare recent uploaded flowers | “I’ll look through your recent photos.” |
| Check hydrangea distribution | “I’ll check where hydrangeas grow.” |
| Retrieve a saved plant's tasks | “I’ll check your plant’s reminders.” |
| Simple greeting or immediately answerable question | Give the response directly. |
| Unclear request addressed to Plantopedia | Ask a brief clarifying question. |
| Silence, room noise or side conversation | No waiting message. |

These are examples, not a rotating recording bank. The model uses the conversation's language and selected voice. An acknowledgment describes intended work, not success. “Hold on for a minute” implies an unsupported duration and adds no useful context. Our target is one short clause, about 4–9 English words or similar brevity in another language, at most once per request. This is prompt guidance rather than a hard word-count guarantee.

## Integration and ordering

[Semantic VAD](https://developers.openai.com/api/docs/guides/realtime-vad) determines an utterance boundary; it does not establish what the user requested or whether a filler is appropriate. Plantopedia waits for the committed audio item, validates authorized context, then creates its normal answer response. The same-model transcript remains out of band and normally does not block that response. Meaningful overlapping speech is classified before replacing an active answer; brief acknowledgments retain the existing backchannel policy.

The previous live prompt explicitly required tools before speech and discouraged describing tool steps. That suppressed the desired behavior. The replacement prompt allows an immediate action-specific commentary preamble before a slower lookup or extended reasoning, followed by the factual answer after evidence arrives. Existing privacy, evidence, confirmation and failure rules remain in force. The production session keeps its existing minimal reasoning setting; a filler is not a reason to increase inference effort. The model page warns that higher reasoning effort can add latency.

OpenAI documents [commentary and final answer phases](https://developers.openai.com/api/docs/guides/voice-prompting#use-message-channels-deliberately). Both are audible. Plantopedia streams all relevant audio items, executes the function calls from the response, submits their outputs, and requests continuation using the documented [function-calling flow](https://developers.openai.com/api/docs/guides/realtime-conversations#function-calling). A played preamble is not completion: the turn finishes after the answer and playback acknowledgment. Transcript items now have paragraph separation so the update and answer do not run together.

No additional audio response, TTS model, timer-driven recording or competing playback channel is introduced. That avoids adding a second inference round solely for filler, mismatched voices, and stale waiting clips playing over a ready answer. Normal spoken generation still consumes audio tokens; this is not cost-free.

## Interruptions and failure handling

Preambles use the existing item IDs, pacing, playback accounting, ducking and cancellation fences. A meaningful interruption or the explicit interrupt button stops pending playback. Late lookup results cannot restart the canceled answer. Low-information acknowledgments follow the user's saved sensitivity setting. Tool failure still produces a brief limitation, rather than pretending the lookup succeeded or repeatedly announcing another wait. The [WebSocket interruption guidance](https://developers.openai.com/api/docs/guides/realtime-conversations#interruption-and-truncation) requires clients to account for heard audio and truncate unheard output; Plantopedia already does this.

This change does not mask the context-validation delay before response creation. Speaking during that interval would require an independently managed acknowledgment response and carefully defined authorization, cancellation and audio ordering. Optimize or measure that delay before adding such complexity. Likewise, batching the legacy recorded-turn response cannot make an included preamble audible while work is pending; this change targets continuous Voice Chat.

## Evaluation and limits

New regressions verify that a preamble streams while a tool is pending, does not persist/complete the answer prematurely, and is followed by the final answer only completing after playback. A second test interrupts the preamble and verifies that late tool results/audio do not revive it. Existing client tests cover sequential preamble/final playback and clearing every unheard item on interruption.

The first live synthetic probe produced commentary before a controlled 2.5-second lookup, followed by a final-answer phase, without closing the connection. First received audio was 980 ms after the provider speech-stopped event. It used Cedar and rain, a public botanical question, in-memory evidence and simulated playback acknowledgments. It sent no private history/photos or actual microphone recording and wrote no Firebase data. This is an adapter-level observation, excluding physical capture/playback and Firestore/Clerk context lookup latency, not a production latency promise. The first update was longer than desired; after adding a short-clause target, a second live probe said “I’ll check where hydrangeas commonly grow.” First audio arrived 549 ms after endpoint detection, before a 2,501 ms controlled lookup; the final answer followed in a separate final-answer phase and the session remained open. These two samples are not latency percentiles or proof of wording consistency.

Before broader voice acceptance, check direct answers, real uploads, slower multi-tool work, clarification, corrections, silence/noise, each supported language, and meaningful versus low-information interruptions on a physical phone. Measure end-of-utterance to first audible output, first substantive answer, acknowledgment repetition and successful interruption. Do not trade a faster filler for a slower useful answer or treat one successful sample as comprehensive prompt evaluation.

Validation: all 339 checks pass (65 unit, 31 script, 148 server and 95 component). Strict typecheck, lint and API build pass; the affected Realtime suite also passes after final wording/fixture refinements. No mobile/native module or dependency changes were needed. Physical-device acceptance remains outstanding.
