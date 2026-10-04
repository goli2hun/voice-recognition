# Testing

## Run

```bash
node --test
```

or:

```bash
npm test
```

No `npm install` is required.

## Current parser regression coverage

Tests verify:

- natural command aliases,
- `B mint Balázs -> B`,
- `Cé mint Cecil -> C`,
- arbitrary text before the connector,
- `min` as a recognition variant of `mint`,
- accented initials such as Á and É,
- configurable `Y mint ipszilon -> Y` exception,
- configurable `Duplavé mint Walter -> W` exception,
- no letter without a connector,
- `SZ mint Szabolcs -> S` and `GY mint Gyula -> G`,
- lower-ranked recognition alternatives.

## Browser verification

Node tests cover pure parser logic. Browser testing still covers microphone permission, input selection, volume meter, SpeechRecognition lifecycle, confidence/alternatives and benchmark behaviour.

## Noise-condition testing

Background noise is currently treated as a benchmark condition, not as a parser concern.

Recommended manual comparison if noise becomes suspicious:

1. one benchmark run in normal room conditions,
2. one benchmark run in a quieter room,
3. compare game-event accuracy and repeated failures,
4. only add suppression/noise-floor logic if the difference is meaningful.

This avoids introducing audio preprocessing before there is evidence that it improves the game experience.
