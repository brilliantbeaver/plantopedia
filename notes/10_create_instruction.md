## Role

Voice and development update (2026-10-18): The historical GPT-Live/WebRTC requirements below are superseded by continuous `gpt-realtime-2.1` Voice Chat; explicit recorded turns were an intermediate design. See [the current voice design](voice-turns.md). For current setup, follow the [single `npx expo start` workflow](../README.md#everyday-startup-one-expo-server); continuous native voice requires the custom development client, while Expo Go previews other features.


You are an expert cross-platform mobile apps architect, specializing in modern and modular React Native applications.

You prioritize technical accuracy, strict type safety, and modularity. You never guess; you rely on progressive disclosure to load missing context or exact file contents before proceeding.

## Tasks

You are to create a set of clear and specific instructions for build Plantopedia: a well designed React Native application.  Product requirements are documented clearly at: "notes/Plantopedia-PRD.md"

Your instructions for building this app must include the following considerations:

* Plantopedia is a camera-first, voice-native plant companion—not simply a plant identifier with a chatbot attached.  Plantopedia is React Native cross-platform application. Users photograph plants and trees, receive evidence-based identification suggestions, and discuss their discoveries through natural voice or text.

* For secrets and key management, we will be storing API keys and secrets as key/value pairs in the toplevel ".env" file.  Secrets should not be uploaded to github but remains protected.

* For plant identification, we strongly prefer using plantnet.org's (Pl@ntNet API): https://my.plantnet.org/doc/getting-started/introduction.  The API key for this end point is at ".env" file with key PLANTNET_API_KEY.  The OpenAPI spec is at: https://my.plantnet.org/doc/api/openapi

* For voice capabilities, we strongly prefer using OpenAI's GPT-Live model: https://developers.openai.com/api/docs/models/gpt-live-1.  To support general conversation with the user, this app should support Tavily websearch with API key in ".env". https://docs.tavily.com/sdk/javascript/quick-start

* For backend storage, you will use Firebase: https://docs.expo.dev/guides/using-firebase/ with keys and env variables in ".env"

* For tracing and telemetry, you will use Langsmith: https://reference.langchain.com/javascript/langsmith with keys and env variables in ".env"

The building of the app should also have a set of well designed, well covered tests thoughtfully created to ensure unit, functional, and component level testing.  

Use Occam's Razor design principles to build using simplest functional design and implementations.

Use adversarial review to check and verify your instructions, guides, and writing in general.  Fix all issues carefully and systematically.

## UI/UX Design

We strongly prefer liquid glass design language and schemes.  An example app with similar functionalities to consider is: https://apps.apple.com/us/app/botan-plant-identifier-care/id1557446434.  A few screenshots of this Botan app is at: 

* notes/images/botan1.jpg
* notes/images/botan2.jpg
* notes/images/botan2.jpg

For color scheme, enable user configuration for Light / Dark mode, as well as providing easy language swap for the text on the app between:  (1) English as default, (2) French, (3) Spanish, (4) German, (5) Simplified Chinese, (6) Japanese, and (7) Korean

## Key React Native features and techniques

The output instruction should systematically describe the building of a modern and modular **React Native** app with Expo, using TypeScript and TSX**, and make it interactive through **React state and one-way data flow**.  Here are key React Native features and techniques should be demonstrated in this app.

| Feature or technique | Key takeaway |
| --- | --- |
| Cross-platform development | Share an implementation across mobile platforms while accounting for differences in device APIs, framework support, and deployment. |
| Expo workflow | Use Expo's tools, Expo Go, and Snack to develop, preview, and explore React Native apps. |
| Component-based UI | Compose `View`, `Text`, `Image`, `Button`, `TextInput`, and `ScrollView` into nested trees; extract repeated UI into custom components. |
| TypeScript and TSX | Use types to catch mismatches during development and TSX to express UI structure; pass data and functions through props. |
| Styling and layout | Organize styles with `StyleSheet.create`; use margin, padding, and borders for spacing, and nested Flexbox containers for adaptable rows and columns. |
| Interactive state | Keep changing UI data in `useState`; event callbacks call setters, and the next render reflects the update. Each render sees a state snapshot. |
| Data-driven and conditional UI | Use `map` to turn arrays into components and conditions to select content, labels, and enabled or disabled states. |
| Immutable updates | Replace state arrays and objects with updated copies using spread syntax and `slice`, giving React a new reference to observe. |
| Shared state and controlled inputs | Lift shared state to the closest common ancestor; pass values down as props and callbacks down so children can request updates. Connect `TextInput` through `value` and `onChangeText`. |
| Maintainable development | Separate code with imports/exports, sketch component layouts, read diagnostics, consult documentation, and understand code well enough to debug it independently. |

The central interaction pattern is **user event → callback → state update → render → updated props and UI**. The sections below explain each technique and identify the supporting lecture slides.


## Output Requirements

Your output must be a structured Markdown document (notes/12_app_create_instr.md) containing clear and specific instructions.

---

 WARN  Photo preparation failed: metadata_detected

---

[Image #1] : after clicking on "Choose this suggestion", I continue to see the choices for the identification suggestions.  Revamp the UI/UX for this interaction, and use your best UX design skills to create an intuitive and primarily mobile friendly way of interacting with this app for (1) letting the user know about the top identified species with clear confidence scores, and (2) that they have a choice on which of these identification to associate with their photo(s).  Ultrathink on how to enable the user to also change their mind in the future to edit the identification.

---

With modern UI/UX design skills and principles, and Liquid Glass design schemes, review the entire mobile app to significantly improve the intuitiveness and usabilities.  Make strong use of clear and vivid iconographies, progressive disclosures, and navigational aides.

The 5 tabs at the bottom of the page seems to have disproportionately small sizing of the text with minimally visible icons right now.

---

The voice interaction with the Voice Chat feels very slow and laggy (with high latency).  Ultrathink if we can leave the Voice Chat open, and use `gpt-realtime-2.1`'s advanced semantic endpointing to auto-detect end of turn for the user, and carefully retrieve appropriate history and context for the voice conversation with the user without explicit clicking on the buttons.  The user experience should try to imitate a natural conversation, accommodating reasonable interruptions, as if the user is talking to a live person.

The voice chat should have more continuous listening with natural voice semantic endpointing detection for end of turn, as well as natural handling of reasonable interruptions and ignoring low-information barge-ins.

---

Ultrathink the voice processing pipeline with gpt-realtime-2.1, are there sensitivity bugs to interruptions or other errors? We want to avoid having too sensitive interruption detection.  Fix thoroughly.

In the "Settings" page, enable simple edits of the Voice configuration including give 3 different female and 3 different male voices.  Enable configuration of interruption or barge-in sensitivities, stability of the voice, etc. that are most likely to be useful for different listening environments by the user.  Enable adding some natural background noises for the voice agent.

---

For the voice chat, ultrathink: after a semantic endpoint is detected for the user's utterance, the Voice Chat should provide an audio "filler" that is action-specific spoken updates (semantically relevant filler) before slower work.  Deeply research on how to do this with gpt-realtime-2.1 using best practices to give a natural voice conversation.

---

lsof -tiTCP:8081,3001 -sTCP:LISTEN | sort -u | xargs kill -TERM