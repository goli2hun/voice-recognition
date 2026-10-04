# Voice Recognition Lab

Framework-free Hungarian speech-recognition laboratory for **KriszWheel / Szerencsekerék**.

## Current feature set

- explicit microphone selection + remembered device
- live volume meter and active-input diagnostics
- browser SpeechRecognition provider
- multiple recognition alternatives + confidence
- configurable command parser
- connector-based single-letter parser
- configurable letter exceptions
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

## Configuration

All tunable settings live in `config/config.js`.

### Letter recognition rule

The letter parser no longer needs a dictionary of code words.

It searches for a configured connector such as `mint` or `min` and takes the **first letter of the following word**:

```text
B mint Balázs        -> B
Cé mint Cecil        -> C
akármi mint Dénes    -> D
B min Balázs         -> B
valami mint Ádám     -> Á
SZ mint Szabolcs     -> S
```

So the phrase before `mint/min` is normally irrelevant.

This matches the KriszWheel rule that characters are used separately: `SZ mint Szabolcs` resolves to `S`, not a separate `SZ` game letter.

### Configurable exceptions

Exceptions run before the normal rule:

```javascript
letters: {
  connectors: ["mint", "min"],
  exceptions: [
    {
      value: "Y",
      after: ["ipszilon"],
    },
    {
      value: "W",
      before: ["duplavé", "dupla vé"],
      after: ["walter"],
    },
  ],
}
```

Therefore:

```text
Y mint ipszilon        -> Y
Duplavé mint Walter    -> W
```

An exception can constrain the phrase before the connector, the word after it, or both.

## Unified voice events

Command example:

```json
{
  "type": "COMMAND",
  "command": "SPIN",
  "transcript": "szeretnék pörgetni",
  "provider": "browser"
}
```

Letter example:

```json
{
  "type": "LETTER",
  "value": "K",
  "transcript": "ká mint károly",
  "provider": "browser"
}
```

The demo also dispatches parsed events as `window` CustomEvents named `voice-event`.

## Benchmark

The built-in benchmark measures transcript accuracy separately from game-event accuracy and can export its run as JSON.

See `docs/BENCHMARK.md`.

## Debug panel

The debug panel shows provider, recognition state, microphone/audio information, interim/final transcript, alternatives + confidence and the last unified voice event.

## Automated tests

```bash
node --test
```

or:

```bash
npm test
```

No `npm install` is required. See `docs/TESTING.md`.

## Architecture and KriszWheel integration

See:

- `docs/ARCHITECTURE.md`
- `docs/INTEGRATION.md`

## Whisper decision rule

First measure browser **game-event accuracy** with the intended microphone and real playing conditions. Add Whisper only if measured browser performance is insufficient or inconsistent.
