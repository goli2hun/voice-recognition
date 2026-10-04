# Benchmark

## Why command-level accuracy?

KriszWheel does not need perfect dictation; it needs the intended game action.

Example:

```text
Spoken:            K mint Károly
Browser transcript: ká mint károly
Transcript exact:  false
Game event:        LETTER K
Game-event result: correct
```

Therefore the benchmark reports transcript and game-event accuracy independently.

## Corpus

The current corpus contains 24 fixed phrases in `benchmark/cases.js`: SPIN variants, SOLVE variants, VOWEL and single-letter phrases.

## Run

1. Select the intended microphone.
2. Keep the room in the same state in which the game will normally be used.
3. Click **Benchmark indítása**.
4. Read the phrase under **Mondd ezt**.
5. Wait for a final recognition result.
6. Inspect transcript and parser result.
7. Click **Következő**.
8. Repeat until complete.
9. Optionally export JSON.

A case is recorded only once; explicit Next prevents continuous recognition from advancing multiple items accidentally.

## Background noise

Do not try to create an unrealistically silent environment for the primary benchmark.

The purpose is to measure whether the current browser recognizer is good enough in **real playing conditions**, including normal room/background noise.

A moving volume meter while nobody is speaking is not automatically a failure. What matters is whether background noise reduces:

- command accuracy,
- letter accuracy,
- consistency between repeated runs.

If results remain strong, no extra noise handling is required.

If accuracy drops in noisy conditions, run a second controlled benchmark and compare the results before adding audio preprocessing.

## Metrics

Transcript accuracy ignores case, punctuation and repeated whitespace, but keeps Hungarian accents.

Game-event accuracy compares the expected COMMAND/LETTER with the parsed event. A lower-ranked recognition alternative may produce the winning event.

## JSON export

The export contains browser, language, provider, microphone metadata, max alternatives, summary, all transcripts, alternatives/confidence, parsed events and skipped/correct flags.

This format is intended for future comparisons, including quiet-room vs background-noise runs and browser-vs-Whisper testing.
