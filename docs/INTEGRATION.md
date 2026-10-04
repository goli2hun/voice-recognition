# KriszWheel Integration Plan

## Reusable modules

```text
config/config.js
speech/provider.js
speech/browser-provider.js
speech/parsers.js
speech/voice-engine.js
```

Benchmark and debug UI are optional development tools. The demo page itself is not the integration target.

## Game boundary

KriszWheel should react only to unified voice events.

```javascript
function onVoiceEvent(event) {
  if (event.type === "COMMAND" && event.command === "SPIN") {
    game.spinWheel();
    return;
  }

  if (event.type === "COMMAND" && event.command === "SOLVE") {
    game.openSolveDialog();
    return;
  }

  if (event.type === "LETTER") {
    game.chooseLetter(event.value);
  }
}
```

The game should not parse raw Hungarian transcript text itself.

## DOM event option

The laboratory app also emits a `voice-event` CustomEvent on `window`. This is handy during incremental integration, although direct VoiceEngine callbacks are cleaner for the final game.

## Suggested steps

1. Run this repo's benchmark with the real microphone.
2. Decide if browser SpeechRecognition quality is acceptable.
3. Reuse the speech modules in KriszWheel.
4. Map COMMAND events to existing game actions.
5. Map LETTER events to the same function used by mouse/touch letter selection.
6. Add microphone start/stop UI.
7. Keep debug UI behind a development flag.
8. Re-run the benchmark inside KriszWheel.
9. Compare Whisper only if needed.

## Important rule

Voice control must call existing game functions. Do not create a second spinning/solving/letter-selection implementation just for speech.

## Provider swap

Switching BrowserSpeechProvider to a future Whisper provider should not require changes to KriszWheel game logic because the VoiceEngine event contract remains the same.
