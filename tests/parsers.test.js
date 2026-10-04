import test from "node:test";
import assert from "node:assert/strict";

import CONFIG from "../config/config.js";
import {
  parseAlternatives,
  parseCommand,
  parseLetter,
} from "../speech/parsers.js";

test("command aliases are detected inside natural phrases", () => {
  const result = parseCommand("Szeretnék pörgetni", CONFIG.commands);
  assert.equal(result?.command, "SPIN");
});

test("Hungarian letter pattern resolves K", () => {
  const result = parseLetter("K mint Károly", CONFIG.letters);
  assert.equal(result?.value, "K");
});

test("spoken letter name resolves K", () => {
  const result = parseLetter("ká mint Károly", CONFIG.letters);
  assert.equal(result?.value, "K");
});

test("accented letters remain distinct", () => {
  assert.equal(parseLetter("A mint Aladár", CONFIG.letters)?.value, "A");
  assert.equal(parseLetter("Á mint Ádám", CONFIG.letters)?.value, "Á");
});

test("code word alone does not trigger a letter", () => {
  assert.equal(parseLetter("Károly tegnap telefonált", CONFIG.letters), null);
});

test("multi-character Hungarian letters are not treated as one game letter", () => {
  assert.equal(parseLetter("SZ mint Szabolcs", CONFIG.letters), null);
});

test("lower-ranked recognition alternative can still produce a valid event", () => {
  const result = parseAlternatives(
    [
      { transcript: "ká mint káro", confidence: 0.81 },
      { transcript: "ká mint károly", confidence: 0.72 },
    ],
    CONFIG,
  );

  assert.equal(result?.type, "LETTER");
  assert.equal(result?.value, "K");
  assert.equal(result?.alternativeIndex, 1);
});
