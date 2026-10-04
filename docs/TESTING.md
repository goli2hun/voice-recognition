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
