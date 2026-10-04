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

## Letter parser

The letter parser is deliberately generic.

It does **not** maintain a dictionary such as "Károly means K". Instead it:

1. normalizes the transcript while preserving Hungarian accents,
2. finds a configured connector (`mint`, `min`, etc.),
3. takes the next word,
4. checks configured exceptions,
5. otherwise returns the first Unicode letter of that word.

Examples:

```text
B mint Balázs      -> B
Cé mint Cecil      -> C
akármi min Dénes   -> D
valami mint Ádám   -> Á
```

This makes the word before the connector mostly irrelevant and removes the need to enumerate code words.

Exceptions are configuration-driven. They may match the phrase before the connector, the word after it, or both.

## Speech provider

`speech/provider.js` defines the provider boundary. `speech/browser-provider.js` is the current Web Speech implementation.

The provider owns lifecycle, interim/final results, alternatives, confidence and restart handling. It does not understand game commands or letters.

## VoiceEngine

`speech/voice-engine.js` connects provider output to the pure parsers and produces stable COMMAND/LETTER events.

## Future Whisper provider

A future Whisper provider can emit the same final-alternatives payload. VoiceEngine, parsers and KriszWheel event handling then remain unchanged.
