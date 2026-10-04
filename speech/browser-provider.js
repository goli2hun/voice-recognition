import { SpeechProvider } from "./provider.js";

export class BrowserSpeechProvider extends SpeechProvider {
  constructor(config, callbacks = {}) {
    super("browser");

    this.config = config;
    this.callbacks = callbacks;
    this.shouldListen = false;
    this.audioTrack = null;
    this.restartTimer = null;

    const Recognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    this.Recognition = Recognition ?? null;
    this.recognition = this.Recognition ? this.#createRecognition() : null;
  }

  isSupported() {
    return Boolean(this.Recognition);
  }

  start(audioTrack = null) {
    if (!this.recognition) {
      throw new Error("SpeechRecognition is not supported.");
    }

    this.shouldListen = true;
    this.audioTrack = audioTrack;
    this.callbacks.onState?.("starting");
    this.#startRecognition();
  }

  stop() {
    this.shouldListen = false;
    this.#clearRestartTimer();

    try {
      this.recognition?.stop();
    } catch {
      // The recognizer may already be stopped.
    }
  }

  abort() {
    this.shouldListen = false;
    this.#clearRestartTimer();

    try {
      this.recognition?.abort();
    } catch {
      // Ignore teardown errors.
    }
  }

  #createRecognition() {
    const recognition = new this.Recognition();

    recognition.lang = this.config.recognition.language;
    recognition.continuous = this.config.recognition.continuous;
    recognition.interimResults = this.config.recognition.interimResults;
    recognition.maxAlternatives = this.config.recognition.maxAlternatives;

    recognition.onstart = () => {
      this.callbacks.onState?.("listening");
    };

    recognition.onresult = (event) => {
      for (
        let resultIndex = event.resultIndex;
        resultIndex < event.results.length;
        resultIndex += 1
      ) {
        const result = event.results[resultIndex];
        const alternatives = Array.from(result)
          .map((item) => ({
            transcript: item.transcript.trim(),
            confidence:
              Number.isFinite(item.confidence) && item.confidence > 0
                ? item.confidence
                : null,
          }))
          .filter((item) => item.transcript);

        if (alternatives.length === 0) {
          continue;
        }

        if (result.isFinal) {
          this.callbacks.onFinal?.({ alternatives });
        } else {
          this.callbacks.onInterim?.({
            transcript: alternatives[0].transcript,
            alternatives,
          });
        }
      }
    };

    recognition.onerror = (event) => {
      const fatalErrors = new Set([
        "not-allowed",
        "service-not-allowed",
        "audio-capture",
        "network",
      ]);

      if (fatalErrors.has(event.error)) {
        this.shouldListen = false;
      }

      this.callbacks.onError?.({
        code: event.error,
        fatal: fatalErrors.has(event.error),
      });
    };

    recognition.onend = () => {
      if (!this.shouldListen) {
        this.callbacks.onState?.("stopped");
        return;
      }

      this.callbacks.onState?.("restarting");

      this.restartTimer = window.setTimeout(() => {
        if (this.shouldListen) {
          this.#startRecognition();
        }
      }, this.config.recognition.restartDelayMs);
    };

    return recognition;
  }

  #startRecognition() {
    if (!this.recognition) {
      return;
    }

    if (this.audioTrack?.readyState === "live") {
      try {
        this.recognition.start(this.audioTrack);
        return;
      } catch (error) {
        if (error?.name !== "TypeError") {
          throw error;
        }
      }
    }

    this.recognition.start();
  }

  #clearRestartTimer() {
    if (this.restartTimer !== null) {
      window.clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
  }
}
