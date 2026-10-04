export const CONFIG = {
  recognition: {
    language: "hu-HU",
    continuous: true,
    interimResults: true,
    maxAlternatives: 3,
    restartDelayMs: 250,
  },

  storage: {
    microphoneDeviceIdKey: "voice-recognition.microphone-device-id",
  },

  microphone: {
    preferenceRules: [
      { contains: "mikrofon", score: 30 },
      { contains: "microphone", score: 30 },
      { contains: " mic", score: 30 },
      { contains: "webcam", score: 20 },
      { contains: "c270", score: 20 },
      { contains: "logi", score: 10 },
      { contains: "logitech", score: 10 },
      { contains: "sztereo kevero", score: -100 },
      { contains: "stereo mix", score: -100 },
      { contains: "what u hear", score: -100 },
      { contains: "loopback", score: -100 },
    ],
    defaultDevicePenalty: 2,
  },

  meter: {
    fftSize: 1024,
    floorDb: -60,
    weakSignalPercent: 5,
    strongSignalPercent: 18,
    releaseSmoothing: 0.84,
  },

  debug: {
    maxAlternativesShown: 5,
  },

  benchmark: {
    enabled: true,
  },

  letters: {
    enabled: true,

    // The normal rule is intentionally simple:
    // find a connector, then use the first letter of the next word.
    //
    // Examples:
    //   "B mint Balázs"   -> B
    //   "Cé mint Cecil"   -> C
    //   "akármi min Dénes" -> D
    //
    // "min" is included because speech recognition may drop the final "t".
    connectors: ["mint", "min"],

    // Exceptions are evaluated before the normal first-letter rule.
    //
    // Optional fields:
    //   before: match the phrase immediately before the connector
    //   after:  match the word immediately after the connector
    //
    // When both are present, both must match.
    exceptions: [
      {
        value: "Y",
        after: ["ipszilon"],
      },
      {
        value: "W",
        before: ["duplavé", "dupla vé"],
        after: ["walter"],
      },
    ],
  },

  commands: [
    {
      id: "SPIN",
      label: "Pörgetés",
      aliases: ["pörgetek", "pörgetnék", "pörgetni", "pörgess", "pörgetés"],
    },
    {
      id: "SOLVE",
      label: "Megfejtés",
      aliases: ["megfejtés", "megfejtem", "megfejteni", "megoldás"],
    },
    {
      id: "VOWEL",
      label: "Magánhangzó",
      aliases: ["magánhangzó", "magánhangzót"],
    },
    {
      id: "GAME",
      label: "Játék",
      aliases: ["játék"],
    },
  ],
};

export default CONFIG;
