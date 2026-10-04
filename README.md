# Voice Recognition

Minimal browser-based Hungarian speech recognition proof of concept for the **Szerencsekerék** project.

The goal is deliberately small:

- request microphone access from the browser,
- enumerate and select the desired audio input,
- remember the selected microphone,
- show the active browser audio input,
- display a live microphone volume meter,
- transcribe Hungarian speech live,
- show interim and final text,
- highlight predefined keywords,
- map selected phrases to simple game-oriented commands,
- keep the implementation framework-free.

## Configuration

Project settings live in:

```text
config/config.js
```

The application logic reads that file through `window.VOICE_RECOGNITION_CONFIG`, so normal tuning does not require editing `app.js`.

Configurable values currently include:

- recognition language and Web Speech behaviour,
- recognition restart delay,
- microphone auto-selection preference rules,
- saved microphone storage key,
- volume-meter FFT size, dB floor and signal thresholds,
- all command IDs, labels and aliases,
- Hungarian letter patterns, spoken forms, connector words and code words.

For example, Szerencsekerék command phrases can be added directly under `commands` in `config/config.js`.

## Stack

- HTML
- CSS
- Vanilla JavaScript
- Browser Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`)
- Media Capture API (`getUserMedia` + `enumerateDevices`)
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

## Microphone selection and diagnostics

The microphone panel contains an input selector and a refresh button.

On first use the browser may hide device names until microphone permission is granted. Press the refresh button or start speech recognition, allow microphone access, and the selector will be populated with the available audio inputs.

The selection is stored in local storage and reused on the next visit. Loopback-style inputs such as **Stereo Mix / Sztereó keverő** are deliberately ranked below real microphones when the app has to make an automatic first choice.

The diagnostics stream is opened with an exact `deviceId` constraint, so the volume meter always measures the microphone selected in the dropdown.

When supported by the browser, the same live audio track is also supplied to `SpeechRecognition.start(audioTrack)`. Older Web Speech implementations may ignore or not support explicit audio-track input and can still fall back to the browser/system speech-recognition input.

The diagnostics panel shows:

- selected and active microphone/device name,
- sample rate when exposed by the browser,
- channel count when exposed by the browser,
- a continuously updating input-level meter,
- the current level in dB,
- a simple signal state: no signal / weak signal / signal detected.

This lets us separate two failures:

- **the meter does not move** → microphone, permission, selected input or OS/browser audio problem,
- **the meter moves but there is no transcript** → microphone capture works, so the likely issue is the browser SpeechRecognition service/path.

## MVP behaviour

The page contains:

- microphone selector,
- **Start listening** / **Stop** controls,
- listening status,
- active microphone information,
- real-time volume meter,
- live interim transcript,
- accumulated final transcript,
- highlighted configured keywords,
- last detected command,
- last detected Hungarian letter pattern.

Initial command groups:

| Command | Example phrases |
| --- | --- |
| `SPIN` | pörgetek, pörgetnék, pörgetni, pörgess |
| `SOLVE` | megfejtés, megfejtem, megfejteni, megoldás |
| `VOWEL` | magánhangzó, magánhangzót |
| `GAME` | játék |

### Hungarian letter parser

Letter recognition is intentionally separate from normal commands. It is configured under `letters` in `config/config.js`.

Examples:

```text
K mint Károly  -> K
ká mint Károly -> K
B mint Béla    -> B
SZ mint Szabolcs -> SZ
```

The parser keeps Hungarian accents while matching letters, so `A` and `Á`, `O` and `Ó`, etc. remain distinct. By default, a code word such as `Károly` on its own does **not** trigger a letter; the explicit `<letter> mint <code word>` structure is required to reduce false positives.

The configured entries cover the Hungarian alphabet, including digraphs/trigraphs such as `CS`, `GY`, `LY`, `NY`, `SZ`, `TY`, `ZS` and `DZS`.

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
3. Add fuzzy matching only where real recognition errors justify it.
4. Compare with Whisper if browser recognition is insufficient.
5. Extract the recognizer/command matcher into a reusable module for Szerencsekerék.
