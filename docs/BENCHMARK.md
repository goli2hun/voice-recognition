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
2. Click **Benchmark indítása**.
3. Read the phrase under **Mondd ezt**.
4. Wait for a final recognition result.
5. Inspect transcript and parser result.
6. Click **Következő**.
7. Repeat until complete.
8. Optionally export JSON.

A case is recorded only once; explicit Next prevents continuous recognition from advancing multiple items accidentally.

## Metrics

Transcript accuracy ignores case, punctuation and repeated whitespace, but keeps Hungarian accents.

Game-event accuracy compares the expected COMMAND/LETTER with the parsed event. A lower-ranked recognition alternative may produce the winning event.

## JSON export

The export contains browser, language, provider, microphone metadata, max alternatives, summary, all transcripts, alternatives/confidence, parsed events and skipped/correct flags.

This format is intended for a future browser-vs-Whisper comparison.
