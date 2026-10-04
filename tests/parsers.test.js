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

test("letter parser uses first letter after mint", () => {
  assert.equal(parseLetter("B mint Balázs", CONFIG.letters)?.value, "B");
  assert.equal(parseLetter("Cé mint Cecil", CONFIG.letters)?.value, "C");
  assert.equal(parseLetter("akármit mondok mint Dénes", CONFIG.letters)?.value, "D");
});

test("letter parser accepts min as recognition variant of mint", () => {
  assert.equal(parseLetter("B min Balázs", CONFIG.letters)?.value, "B");
});

test("accented first letters remain accented", () => {
  assert.equal(parseLetter("valami mint Ádám", CONFIG.letters)?.value, "Á");
  assert.equal(parseLetter("valami mint Éva", CONFIG.letters)?.value, "É");
});

test("Y mint ipszilon uses configurable exception", () => {
  const result = parseLetter("Y mint ipszilon", CONFIG.letters);
  assert.equal(result?.value, "Y");
  assert.equal(result?.source, "exception");
});

test("Duplavé mint Walter uses configurable exception", () => {
  const result = parseLetter("Duplavé mint Walter", CONFIG.letters);
  assert.equal(result?.value, "W");
  assert.equal(result?.source, "exception");
});

test("a word without connector does not trigger a letter", () => {
  assert.equal(parseLetter("Károly tegnap telefonált", CONFIG.letters), null);
});

test("multi-character Hungarian letter names resolve to the code-word initial", () => {
  assert.equal(parseLetter("SZ mint Szabolcs", CONFIG.letters)?.value, "S");
  assert.equal(parseLetter("GY mint Gyula", CONFIG.letters)?.value, "G");
});

test("lower-ranked recognition alternative can still produce a valid event", () => {
  const result = parseAlternatives(
    [
      { transcript: "ez most nem találat", confidence: 0.81 },
      { transcript: "ká mint Károly", confidence: 0.72 },
    ],
    CONFIG,
  );

  assert.equal(result?.type, "LETTER");
  assert.equal(result?.value, "K");
  assert.equal(result?.alternativeIndex, 1);
});
