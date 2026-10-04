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
    connectors: ["mint"],
    allowCodeWordOnly: false,
    entries: [
      { value: "A", spoken: ["a"], codeWords: ["aladár", "anna"] },
      { value: "Á", spoken: ["á"], codeWords: ["ádám"] },
      { value: "B", spoken: ["b", "bé"], codeWords: ["béla"] },
      { value: "C", spoken: ["c", "cé"], codeWords: ["cecil"] },
      { value: "D", spoken: ["d", "dé"], codeWords: ["dénes"] },
      { value: "E", spoken: ["e"], codeWords: ["elemér"] },
      { value: "É", spoken: ["é"], codeWords: ["éva"] },
      { value: "F", spoken: ["f", "ef"], codeWords: ["ferenc"] },
      { value: "G", spoken: ["g", "gé"], codeWords: ["géza"] },
      { value: "H", spoken: ["h", "há"], codeWords: ["henrik"] },
      { value: "I", spoken: ["i"], codeWords: ["ilona"] },
      { value: "Í", spoken: ["í"], codeWords: ["írisz"] },
      { value: "J", spoken: ["j", "jé"], codeWords: ["jános"] },
      { value: "K", spoken: ["k", "ká"], codeWords: ["károly", "krisz", "kutya"] },
      { value: "L", spoken: ["l", "el"], codeWords: ["lászló"] },
      { value: "M", spoken: ["m", "em"], codeWords: ["mihály"] },
      { value: "N", spoken: ["n", "en"], codeWords: ["nándor"] },
      { value: "O", spoken: ["o"], codeWords: ["olga"] },
      { value: "Ó", spoken: ["ó"], codeWords: ["óbuda"] },
      { value: "Ö", spoken: ["ö"], codeWords: ["ödön"] },
      { value: "Ő", spoken: ["ő"], codeWords: ["őrs"] },
      { value: "P", spoken: ["p", "pé"], codeWords: ["péter"] },
      { value: "Q", spoken: ["q", "kú"], codeWords: ["quebec"] },
      { value: "R", spoken: ["r", "er"], codeWords: ["róbert"] },
      { value: "S", spoken: ["s", "es"], codeWords: ["sándor"] },
      { value: "T", spoken: ["t", "té"], codeWords: ["tamás"] },
      { value: "U", spoken: ["u"], codeWords: ["ubul"] },
      { value: "Ú", spoken: ["ú"], codeWords: ["újpest"] },
      { value: "Ü", spoken: ["ü"], codeWords: ["üllő"] },
      { value: "Ű", spoken: ["ű"], codeWords: ["űr"] },
      { value: "V", spoken: ["v", "vé"], codeWords: ["viktor"] },
      { value: "W", spoken: ["w", "dupla vé"], codeWords: ["watt"] },
      { value: "X", spoken: ["x", "iksz"], codeWords: ["xilofon"] },
      { value: "Y", spoken: ["y", "ipszilon"], codeWords: ["ybl"] },
      { value: "Z", spoken: ["z", "zé"], codeWords: ["zoltán"] },
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
