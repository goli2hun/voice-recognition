// Voice Recognition project configuration.
// Edit this file to tune recognition, microphone selection, metering and commands.

window.VOICE_RECOGNITION_CONFIG = {
  recognition: {
    language: "hu-HU",
    continuous: true,
    interimResults: true,
    maxAlternatives: 1,
    restartDelayMs: 250,
  },

  storage: {
    microphoneDeviceIdKey: "voice-recognition.microphone-device-id",
  },

  microphone: {
    // Higher score = more preferred when the app has to choose automatically.
    preferenceRules: [
      { contains: "mikrofon", score: 30 },
      { contains: "microphone", score: 30 },
      { contains: " mic", score: 30 },
      { contains: "webcam", score: 20 },
      { contains: "c270", score: 20 },
      { contains: "logi", score: 10 },
      { contains: "logitech", score: 10 },

      // Loopback/system-audio inputs should not win automatic selection.
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
