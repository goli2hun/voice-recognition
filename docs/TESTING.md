# Testing

## Parser tests

The project uses Node's built-in test runner and has no test dependency.

Run:

```bash
node --test
```

or:

```bash
npm test
```

No `npm install` is required.

## Covered cases

- command alias inside a natural sentence
- `K mint Károly` -> K
- spoken `ká` form
- accent distinction A vs Á
- code-word-only false-positive prevention
- multi-character Hungarian letter names are not one game letter
- lower-ranked recognition alternative can still yield the right event

## Why these tests matter

Real-world aliases will grow. The tests provide regression protection before moving the parser into KriszWheel.

## Browser-only verification

Node cannot test Web Speech or the microphone. Browser verification still covers permissions, selector, volume meter, recognition lifecycle, alternatives/confidence and the benchmark.
