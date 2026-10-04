# Voice Recognition Lab

Framework-free Hungarian speech-recognition laboratory for **KriszWheel / Szerencsekerék**.

## Current feature set

- explicit microphone selection + remembered device
- live volume meter and active-input diagnostics
- browser SpeechRecognition provider
- multiple recognition alternatives + confidence
- configurable command parser
- configurable single-letter parser
- unified voice-event interface
- 24-phrase KriszWheel benchmark
- separate transcript and game-event accuracy
- JSON benchmark export
- expandable debug panel
- dependency-free automated parser tests
- provider abstraction prepared for a future Whisper provider

## Quick start

```bash
python -m http.server 8000
```

Open:

```text
http://localhost:8000
```

Chrome or Edge is recommended for the browser SpeechRecognition experiment.

## Project structure

```text
voice-recognition/
├── benchmark/
│   ├── benchmark.js
│   └── cases.js
├── config/
│   └── config.js
├── docs/
│   ├── ARCHITECTURE.md
│   ├── BENCHMARK.md
│   ├── INTEGRATION.md
│   └── TESTING.md
├── speech/
│   ├── browser-provider.js
│   ├── parsers.js
│   ├── provider.js
│   └── voice-engine.js
├── tests/
│   └── parsers.test.js
├── app.js
├── index.html
├── package.json
└── style.css
```

## Configuration

All tunable settings live in `config/config.js`: recognition language, alternatives, restart delay, microphone preferences, meter thresholds, command aliases and letter patterns.

## Unified voice events

Command example:

```json
{
  "type": "COMMAND",
  "command": "SPIN",
  "label": "Pörgetés",
  "transcript": "szeretnék pörgetni",
  "confidence": 0.91,
  "alternativeIndex": 0,
  "provider": "browser"
}
```

Letter example:

```json
{
  "type": "LETTER",
  "value": "K",
  "transcript": "ká mint károly",
  "confidence": 0.84,
  "alternativeIndex": 1,
  "provider": "browser"
}
```

The demo also dispatches parsed events as `window` CustomEvents named `voice-event`.

## Multiple alternatives

`recognition.maxAlternatives` defaults to **3**. The parser tries alternatives in rank order, so a lower-ranked transcript can still produce the correct game event.

## Hungarian letter parser

Examples:

```text
K mint Károly  -> K
ká mint Károly -> K
B mint Béla    -> B
Á mint Ádám    -> Á
```

A code word alone does not trigger a letter by default. Multi-character Hungarian alphabet entries such as CS, DZ, DZS, GY, LY, NY, SZ, TY and ZS are intentionally **not treated as one game letter**; KriszWheel uses the characters separately.

## Benchmark

The built-in 24-phrase benchmark measures two independent metrics:

1. transcript accuracy
2. game-event accuracy

This matters because imperfect text can still map to the correct command or letter. Runs can be exported as JSON.

See `docs/BENCHMARK.md`.

## Debug panel

The expandable debug panel shows provider, recognition state, language, microphone, audio format, browser, last interim/final transcript, alternatives + confidence and the last unified voice event.

## Automated tests

```bash
node --test
```

or:

```bash
npm test
```

No `npm install` is required. See `docs/TESTING.md`.

## Provider abstraction

The current path is:

```text
VoiceEngine -> BrowserSpeechProvider -> Web Speech API
```

A future Whisper provider can use the same event contract without changing the parsers or KriszWheel game logic.

See `docs/ARCHITECTURE.md` and `docs/INTEGRATION.md`.

## Whisper decision rule

First measure browser **game-event accuracy** with the intended microphone and real playing conditions. Add Whisper only if measured browser performance is insufficient or inconsistent.
