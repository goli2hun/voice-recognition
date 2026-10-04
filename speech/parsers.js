export function normalizeCommandText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("hu-HU")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeLetterText(value) {
  return String(value ?? "")
    .normalize("NFC")
    .toLocaleLowerCase("hu-HU")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function containsPhrase(text, phrase) {
  return ` ${text} `.includes(` ${phrase} `);
}

export function parseCommand(text, commands = []) {
  const normalized = normalizeCommandText(text);

  for (const command of commands) {
    for (const alias of command.aliases ?? []) {
      const normalizedAlias = normalizeCommandText(alias);

      if (normalizedAlias && containsPhrase(normalized, normalizedAlias)) {
        return {
          type: "COMMAND",
          command: command.id,
          label: command.label ?? command.id,
          matchedPhrase: normalizedAlias,
        };
      }
    }
  }

  return null;
}

function exceptionMatches(exception, beforeText, afterWord) {
  const beforeRules = exception.before ?? [];
  const afterRules = exception.after ?? [];

  const beforeMatches =
    beforeRules.length === 0 ||
    beforeRules.some((rule) => {
      const normalizedRule = normalizeLetterText(rule);

      return (
        beforeText === normalizedRule ||
        beforeText.endsWith(` ${normalizedRule}`)
      );
    });

  const afterMatches =
    afterRules.length === 0 ||
    afterRules.some(
      (rule) => normalizeLetterText(rule) === afterWord,
    );

  return beforeMatches && afterMatches;
}

function firstLetter(value) {
  const match = value.match(/\p{L}/u);

  return match
    ? match[0].toLocaleUpperCase("hu-HU")
    : null;
}

export function parseLetter(text, letterConfig) {
  if (!letterConfig?.enabled) {
    return null;
  }

  const normalized = normalizeLetterText(text);

  if (!normalized) {
    return null;
  }

  const words = normalized.split(" ");
  const connectors = new Set(
    (letterConfig.connectors ?? ["mint"])
      .map(normalizeLetterText)
      .filter(Boolean),
  );

  for (let connectorIndex = 0; connectorIndex < words.length; connectorIndex += 1) {
    const connector = words[connectorIndex];

    if (!connectors.has(connector)) {
      continue;
    }

    const afterWord = words[connectorIndex + 1];

    if (!afterWord) {
      continue;
    }

    const beforeText = words.slice(0, connectorIndex).join(" ");

    for (const exception of letterConfig.exceptions ?? []) {
      if (exceptionMatches(exception, beforeText, afterWord)) {
        return {
          type: "LETTER",
          value: String(exception.value).toLocaleUpperCase("hu-HU"),
          matchedPhrase: `${connector} ${afterWord}`,
          source: "exception",
        };
      }
    }

    const value = firstLetter(afterWord);

    if (value) {
      return {
        type: "LETTER",
        value,
        matchedPhrase: `${connector} ${afterWord}`,
        source: "first-letter-after-connector",
      };
    }
  }

  return null;
}

export function parseTranscript(text, config) {
  return (
    parseCommand(text, config.commands) ??
    parseLetter(text, config.letters)
  );
}

export function parseAlternatives(alternatives = [], config) {
  for (let index = 0; index < alternatives.length; index += 1) {
    const alternative = alternatives[index];
    const parsed = parseTranscript(alternative.transcript, config);

    if (parsed) {
      return {
        ...parsed,
        transcript: alternative.transcript,
        confidence: alternative.confidence ?? null,
        alternativeIndex: index,
      };
    }
  }

  return null;
}
