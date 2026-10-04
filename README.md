# Voice Recognition

Minimal browser-based Hungarian speech recognition proof of concept for the **Szerencsekerék** project.

The goal is deliberately small:

- request microphone access from the browser,
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

## MVP behaviour

The page contains:

- **Start listening** / **Stop** controls
- listening status
- live interim transcript
- accumulated final transcript
- highlighted configured keywords
- last detected command

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
