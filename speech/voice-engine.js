import { BrowserSpeechProvider } from "./browser-provider.js";
import { parseAlternatives } from "./parsers.js";

export class VoiceEngine {
  constructor(config, callbacks = {}, providerFactory = null) {
    this.config = config;
    this.callbacks = callbacks;

    const factory =
      providerFactory ??
      ((providerConfig, providerCallbacks) =>
        new BrowserSpeechProvider(providerConfig, providerCallbacks));

    this.provider = factory(config, {
      onState: (state) => this.callbacks.onState?.(state),
      onInterim: (payload) => this.callbacks.onInterim?.(payload),
      onError: (error) => this.callbacks.onError?.(error),
      onFinal: (payload) => this.#handleFinal(payload),
    });
  }

  get providerName() {
    return this.provider.name;
  }

  isSupported() {
    return this.provider.isSupported();
  }

  start(audioTrack = null) {
    this.provider.start(audioTrack);
  }

  stop() {
    this.provider.stop();
  }

  abort() {
    this.provider.abort();
  }

  #handleFinal(payload) {
    const parsed = parseAlternatives(payload.alternatives, this.config);
    const voiceEvent = parsed
      ? {
          ...parsed,
          provider: this.providerName,
        }
      : null;

    if (voiceEvent) {
      this.callbacks.onVoiceEvent?.(voiceEvent);
    }

    this.callbacks.onFinal?.({
      ...payload,
      event: voiceEvent,
      provider: this.providerName,
    });
  }
}
