export class SpeechProvider {
  constructor(name) {
    this.name = name;
  }

  isSupported() {
    return false;
  }

  start() {
    throw new Error("SpeechProvider.start() must be implemented.");
  }

  stop() {}

  abort() {}
}
