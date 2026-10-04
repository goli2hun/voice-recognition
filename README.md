# Voice Recognition

Minimal browser-based Hungarian speech recognition proof of concept for the **Szerencsekerék** project.

The goal is deliberately small:

- request microphone access from the browser,
- show the active browser audio input,
- display a live microphone volume meter,
- transcribe Hungarian speech live,
- show interim and final text,
- highlight predefined keywords,
- map selected phrases to simple game-oriented commands,
- keep the implementation framework-free.

## Stack

- HTML
- CSS
- Vanilla JavaScript
- Browser Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`)
- Media Capture API (`getUserMedia`)
- Web Audio API (`AudioContext` + `AnalyserNode`)

No backend, npm, database, WebSocket or API key is required for the MVP.

## Run locally

From the repository root:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

Chrome or Edge is recommended for the first tests. Allow microphone access when prompted.

> Browser speech recognition support and behaviour vary by browser. The first MVP intentionally targets Chromium-based browsers so we can measure whether the built-in recognizer is accurate enough before adding Whisper.

## Microphone diagnostics

Press **Beszéd indítása**. Before speech recognition starts, the page explicitly opens the browser's default audio input with `getUserMedia()`.

The diagnostics panel then shows:

- the opened microphone/device name,
- sample rate when exposed by the browser,
- channel count when exposed by the browser,
- a continuously updating input-level meter,
- the current level in dB,
- a simple signal state: no signal / weak signal / signal detected.

This lets us separate two failures:

- **the meter does not move** → microphone, permission, selected input or OS/browser audio problem,
- **the meter moves but there is no transcript** → microphone capture works, so the likely issue is the browser SpeechRecognition service/path.

Important: the Web Speech API does not expose a MediaStream input selector. The displayed device is the default audio input explicitly opened by the page for diagnostics; SpeechRecognition manages its own audio input internally.

## MVP behaviour

The page contains:

- **Start listening** / **Stop** controls,
- listening status,
- active microphone information,
- real-time volume meter,
- live interim transcript,
- accumulated final transcript,
- highlighted configured keywords,
- last detected command.

Initial command groups:

| Command | Example phrases |
| --- | --- |
| `SPIN` | pörgetek, pörgetnék, pörgetni, pörgess |
| `SOLVE` | megfejtés, megfejtem, megfejteni, megoldás |
| `VOWEL` | magánhangzó, magánhangzót |
| `GAME` | játék |

Matching is case-insensitive and accent-tolerant for command detection.

## Why this project exists

This repository is a small technical experiment for the Szerencsekerék browser game. The important metric is not perfect dictation. It is whether intended **game commands** can be detected reliably and quickly enough.

A later benchmark can compare the same Hungarian test phrases using:

1. browser `SpeechRecognition`,
2. Whisper.

Whisper should only be added if the browser recognizer is not accurate, predictable or portable enough for the game.

## Planned next steps

1. Run a 20–30 phrase Hungarian command benchmark.
2. Record command-level success/failure, not only transcript quality.
3. Add Hungarian letter patterns such as “K mint Károly”.
4. Add fuzzy matching only where real recognition errors justify it.
5. Compare with Whisper if browser recognition is insufficient.
6. Extract the recognizer/command matcher into a reusable module for Szerencsekerék.
