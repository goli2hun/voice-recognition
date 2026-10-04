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

export function parseLetter(text, letterConfig) {
  if (!letterConfig?.enabled) {
    return null;
  }

  const normalized = normalizeLetterText(text);

  for (const entry of letterConfig.entries ?? []) {
    for (const spoken of entry.spoken ?? []) {
      for (const connector of letterConfig.connectors ?? ["mint"]) {
        for (const codeWord of entry.codeWords ?? []) {
          const phrase = normalizeLetterText(
            `${spoken} ${connector} ${codeWord}`,
          );

          if (phrase && containsPhrase(normalized, phrase)) {
            return {
              type: "LETTER",
              value: entry.value,
              matchedPhrase: phrase,
            };
          }
        }
      }
    }

    if (letterConfig.allowCodeWordOnly) {
      for (const codeWord of entry.codeWords ?? []) {
        const normalizedCodeWord = normalizeLetterText(codeWord);

        if (
          normalizedCodeWord &&
          containsPhrase(normalized, normalizedCodeWord)
        ) {
          return {
            type: "LETTER",
            value: entry.value,
            matchedPhrase: normalizedCodeWord,
          };
        }
      }
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
