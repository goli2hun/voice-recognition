function normalizeBenchmarkText(value) {
  return String(value ?? "")
    .normalize("NFC")
    .toLocaleLowerCase("hu-HU")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function eventMatches(expected, actual) {
  if (!actual || expected.type !== actual.type) {
    return false;
  }

  if (expected.type === "COMMAND") {
    return expected.command === actual.command;
  }

  if (expected.type === "LETTER") {
    return expected.value === actual.value;
  }

  return false;
}

export class BenchmarkSession {
  constructor(cases) {
    this.cases = cases;
    this.reset();
  }

  reset() {
    this.active = false;
    this.completed = false;
    this.index = 0;
    this.results = [];
    this.currentRecorded = false;
  }

  start() {
    this.reset();
    this.active = true;
  }

  get currentCase() {
    return this.active ? this.cases[this.index] ?? null : null;
  }

  recordRecognition({ alternatives = [], event = null, provider = null }) {
    if (!this.active || !this.currentCase || this.currentRecorded) {
      return null;
    }

    const primaryTranscript = alternatives[0]?.transcript ?? "";
    const result = {
      id: this.currentCase.id,
      prompt: this.currentCase.prompt,
      expected: this.currentCase.expected,
      primaryTranscript,
      alternatives,
      event,
      provider,
      transcriptExact:
        normalizeBenchmarkText(primaryTranscript) ===
        normalizeBenchmarkText(this.currentCase.prompt),
      eventCorrect: eventMatches(this.currentCase.expected, event),
      skipped: false,
      recordedAt: new Date().toISOString(),
    };

    this.results.push(result);
    this.currentRecorded = true;

    return result;
  }

  skip() {
    if (!this.active || !this.currentCase || this.currentRecorded) {
      return null;
    }

    const result = {
      id: this.currentCase.id,
      prompt: this.currentCase.prompt,
      expected: this.currentCase.expected,
      primaryTranscript: "",
      alternatives: [],
      event: null,
      provider: null,
      transcriptExact: false,
      eventCorrect: false,
      skipped: true,
      recordedAt: new Date().toISOString(),
    };

    this.results.push(result);
    this.currentRecorded = true;
    return result;
  }

  next() {
    if (!this.active || !this.currentRecorded) {
      return false;
    }

    if (this.index >= this.cases.length - 1) {
      this.active = false;
      this.completed = true;
      return false;
    }

    this.index += 1;
    this.currentRecorded = false;
    return true;
  }

  summary() {
    const attempted = this.results.filter((item) => !item.skipped);
    const transcriptCorrect = attempted.filter(
      (item) => item.transcriptExact,
    ).length;
    const eventCorrect = attempted.filter((item) => item.eventCorrect).length;

    return {
      totalCases: this.cases.length,
      completedCases: this.results.length,
      attemptedCases: attempted.length,
      skippedCases: this.results.length - attempted.length,
      transcriptCorrect,
      eventCorrect,
      transcriptAccuracy:
        attempted.length > 0
          ? Math.round((transcriptCorrect / attempted.length) * 100)
          : 0,
      eventAccuracy:
        attempted.length > 0
          ? Math.round((eventCorrect / attempted.length) * 100)
          : 0,
    };
  }

  exportData(metadata = {}) {
    return {
      exportedAt: new Date().toISOString(),
      metadata,
      summary: this.summary(),
      results: this.results,
    };
  }
}
