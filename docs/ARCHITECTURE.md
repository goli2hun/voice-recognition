# Architecture

## Goal

Keep speech recognition, transcript interpretation and KriszWheel game logic independent.

```text
Microphone / browser
        ↓
Speech provider
        ↓
Voice engine
        ↓
Command + letter parsers
        ↓
Unified voice event
        ↓
UI / benchmark / future KriszWheel
```

## Speech provider

`speech/provider.js` defines the provider boundary. `speech/browser-provider.js` is the current Web Speech implementation.

Responsibilities: lifecycle, language/config, interim/final results, alternatives, confidence, restart handling and provider errors.

The provider does not understand SPIN, SOLVE or letters.

## Parsers

`speech/parsers.js` contains pure functions only.

They normalize text, map aliases to commands, map `<letter> mint <code word>` to a single game letter and try multiple recognition alternatives.

The parser layer has no microphone, DOM or game-state dependency.

## VoiceEngine

`speech/voice-engine.js` connects provider output to the parsers and produces one stable event contract.

Example:

```javascript
{
  type: "LETTER",
  value: "K",
  transcript: "ká mint károly",
  confidence: 0.82,
  alternativeIndex: 1,
  provider: "browser"
}
```

## Application layer

`app.js` handles demo concerns: microphone selection, meter, UI, debug panel, benchmark and JSON download.

Most UI code does not need to move into KriszWheel.

## Multiple alternatives

The parser tries recognition alternatives in order and uses the first one that yields a valid game event. This improves command-level reliability without fuzzy matching.

## Future Whisper provider

A future `whisper-provider.js` should emit the same final payload shape:

```javascript
{
  alternatives: [
    { transcript: "...", confidence: null }
  ]
}
```

Then VoiceEngine, parsers and KriszWheel event handling stay unchanged.
