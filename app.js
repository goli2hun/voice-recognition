const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

const MIC_STORAGE_KEY = "voice-recognition.microphone-device-id";

const COMMANDS = [
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
];

const startBtn = document.querySelector("#startBtn");
const stopBtn = document.querySelector("#stopBtn");
const clearBtn = document.querySelector("#clearBtn");
const refreshMicBtn = document.querySelector("#refreshMicBtn");
const microphoneSelect = document.querySelector("#microphoneSelect");
const supportText = document.querySelector("#supportText");
const statusBadge = document.querySelector("#statusBadge");
const statusText = document.querySelector("#statusText");
const deviceName = document.querySelector("#deviceName");
const deviceDetails = document.querySelector("#deviceDetails");
const signalText = document.querySelector("#signalText");
const meterValue = document.querySelector("#meterValue");
const volumeMeter = document.querySelector("#volumeMeter");
const volumeFill = document.querySelector("#volumeFill");
const interimTranscript = document.querySelector("#interimTranscript");
const finalTranscriptElement = document.querySelector("#finalTranscript");
const keywordList = document.querySelector("#keywordList");
const commandValue = document.querySelector("#commandValue");
const commandSource = document.querySelector("#commandSource");

const aliases = [...new Set(COMMANDS.flatMap((command) => command.aliases))]
  .sort((a, b) => b.length - a.length);

const highlightPattern = new RegExp(
  `(${aliases.map(escapeRegExp).join("|")})`,
  "giu",
);

let recognition = null;
let shouldListen = false;
let finalTranscript = "";
let audioInputs = [];

let microphoneStream = null;
let audioContext = null;
let analyser = null;
let sourceNode = null;
let meterBuffer = null;
let meterAnimationFrame = null;
let smoothedMeterLevel = 0;

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeText(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("hu-HU");
}

function highlightKeywords(value, placeholder) {
  if (!value.trim()) {
    return `<span class="placeholder">${escapeHtml(placeholder)}</span>`;
  }

  return escapeHtml(value).replace(highlightPattern, "<mark>$1</mark>");
}

function detectCommand(value) {
  const normalized = normalizeText(value);

  return COMMANDS.find((command) =>
    command.aliases.some((alias) =>
      normalized.includes(normalizeText(alias)),
    ),
  );
}

function renderKeywordList() {
  keywordList.replaceChildren();

  for (const command of COMMANDS) {
    for (const alias of command.aliases) {
      const chip = document.createElement("span");
      chip.className = "keyword-chip";

      const commandName = document.createElement("strong");
      commandName.textContent = command.id;

      const phrase = document.createElement("span");
      phrase.textContent = alias;

      chip.append(commandName, phrase);
      keywordList.append(chip);
    }
  }
}

function setStatus(state, text) {
  statusBadge.dataset.state = state;
  statusText.textContent = text;
}

function setListeningControls(isListening) {
  startBtn.disabled =
    isListening ||
    !SpeechRecognition ||
    !navigator.mediaDevices?.getUserMedia;

  stopBtn.disabled = !isListening;
  microphoneSelect.disabled = isListening || audioInputs.length === 0;
  refreshMicBtn.disabled = isListening;
}

function renderTranscripts(interim = "") {
  interimTranscript.innerHTML = highlightKeywords(
    interim,
    shouldListen ? "Hallgatózom…" : "Indítsd el a mikrofont, majd beszélj…",
  );

  finalTranscriptElement.innerHTML = highlightKeywords(
    finalTranscript,
    "A véglegesített szöveg itt gyűlik majd.",
  );
}

function renderDetectedCommand(command, sourceText) {
  if (!command) {
    return;
  }

  commandValue.textContent = `${command.id} · ${command.label}`;
  commandSource.textContent = `„${sourceText.trim()}”`;
}

function getSavedMicrophoneId() {
  try {
    return window.localStorage.getItem(MIC_STORAGE_KEY);
  } catch {
    return null;
  }
}

function saveMicrophoneId(deviceId) {
  try {
    window.localStorage.setItem(MIC_STORAGE_KEY, deviceId);
  } catch {
    // localStorage can be unavailable in strict privacy modes.
  }
}

function microphonePreferenceScore(device) {
  const label = normalizeText(device.label || "");

  let score = 0;

  if (label.includes("mikrofon") || label.includes("microphone") || label.includes(" mic")) {
    score += 30;
  }

  if (label.includes("webcam") || label.includes("c270")) {
    score += 20;
  }

  if (label.includes("logi") || label.includes("logitech")) {
    score += 10;
  }

  if (
    label.includes("sztereo kevero") ||
    label.includes("stereo mix") ||
    label.includes("what u hear") ||
    label.includes("loopback")
  ) {
    score -= 100;
  }

  if (device.deviceId === "default") {
    score -= 2;
  }

  return score;
}

function choosePreferredMicrophone(devices) {
  const savedId = getSavedMicrophoneId();

  if (savedId && devices.some((device) => device.deviceId === savedId)) {
    return savedId;
  }

  return [...devices]
    .sort((a, b) => microphonePreferenceScore(b) - microphonePreferenceScore(a))[0]
    ?.deviceId;
}

function renderSelectedDevicePreview() {
  const selected = audioInputs.find(
    (device) => device.deviceId === microphoneSelect.value,
  );

  if (!selected || microphoneStream) {
    return;
  }

  deviceName.textContent = selected.label || "Kiválasztott mikrofon";
  deviceDetails.textContent = "Kiválasztva · indításkor ezt az inputot nyitjuk meg.";
}

async function requestMicrophonePermission() {
  const permissionStream = await navigator.mediaDevices.getUserMedia({
    audio: true,
    video: false,
  });

  for (const track of permissionStream.getTracks()) {
    track.stop();
  }
}

async function refreshMicrophoneList({
  requestPermission = false,
  preferBest = false,
} = {}) {
  if (requestPermission) {
    await requestMicrophonePermission();
  }

  const devices = await navigator.mediaDevices.enumerateDevices();
  audioInputs = devices.filter((device) => device.kind === "audioinput");

  const previousValue = microphoneSelect.value;
  const preferredId = preferBest
    ? choosePreferredMicrophone(audioInputs)
    : getSavedMicrophoneId() || previousValue;

  microphoneSelect.replaceChildren();

  if (audioInputs.length === 0) {
    const option = document.createElement("option");
    option.textContent = "Nem található mikrofon";
    option.value = "";
    microphoneSelect.append(option);
    microphoneSelect.disabled = true;
    return;
  }

  audioInputs.forEach((device, index) => {
    const option = document.createElement("option");
    option.value = device.deviceId;
    option.textContent = device.label || `Mikrofon ${index + 1}`;
    microphoneSelect.append(option);
  });

  const selectedId =
    audioInputs.some((device) => device.deviceId === preferredId)
      ? preferredId
      : choosePreferredMicrophone(audioInputs);

  if (selectedId) {
    microphoneSelect.value = selectedId;
    saveMicrophoneId(selectedId);
  }

  microphoneSelect.disabled = false;
  renderSelectedDevicePreview();
}

function renderDeviceInfo(track) {
  const settings = track.getSettings?.() ?? {};
  const details = [];

  deviceName.textContent = track.label || "Kiválasztott mikrofon";

  if (settings.sampleRate) {
    details.push(`${settings.sampleRate} Hz`);
  }

  if (settings.channelCount) {
    details.push(`${settings.channelCount} csatorna`);
  }

  deviceDetails.textContent =
    details.length > 0
      ? details.join(" · ")
      : "A böngésző által megnyitott audio input.";
}

function renderMeter(level, db) {
  const roundedLevel = Math.round(level);

  volumeFill.style.width = `${roundedLevel}%`;
  volumeMeter.setAttribute("aria-valuenow", String(roundedLevel));
  meterValue.textContent = Number.isFinite(db) ? `${db.toFixed(1)} dB` : "— dB";

  if (level >= 18) {
    signalText.textContent = "Jel érkezik";
  } else if (level >= 5) {
    signalText.textContent = "Gyenge jel";
  } else {
    signalText.textContent = "Csend / nincs jel";
  }
}

function updateVolumeMeter() {
  if (!analyser || !meterBuffer) {
    return;
  }

  analyser.getByteTimeDomainData(meterBuffer);

  let sumSquares = 0;

  for (const sample of meterBuffer) {
    const normalizedSample = (sample - 128) / 128;
    sumSquares += normalizedSample * normalizedSample;
  }

  const rms = Math.sqrt(sumSquares / meterBuffer.length);
  const db = rms > 0 ? 20 * Math.log10(rms) : -Infinity;
  const rawLevel = Number.isFinite(db)
    ? Math.max(0, Math.min(100, ((db + 60) / 60) * 100))
    : 0;

  smoothedMeterLevel =
    rawLevel >= smoothedMeterLevel
      ? rawLevel
      : smoothedMeterLevel * 0.84;

  renderMeter(smoothedMeterLevel, db);

  meterAnimationFrame = window.requestAnimationFrame(updateVolumeMeter);
}

async function startMicrophoneDiagnostics() {
  if (microphoneStream) {
    return;
  }

  if (audioInputs.length === 0 || !microphoneSelect.value) {
    await refreshMicrophoneList({
      requestPermission: true,
      preferBest: true,
    });
  }

  const selectedDeviceId = microphoneSelect.value;

  signalText.textContent = "Mikrofon megnyitása…";
  deviceName.textContent = "Kapcsolódás…";
  deviceDetails.textContent = "A kiválasztott audio input megnyitása.";

  const audioConstraint = selectedDeviceId
    ? { deviceId: { exact: selectedDeviceId } }
    : true;

  microphoneStream = await navigator.mediaDevices.getUserMedia({
    audio: audioConstraint,
    video: false,
  });

  const [track] = microphoneStream.getAudioTracks();

  if (!track) {
    throw new Error("No audio track is available.");
  }

  const actualDeviceId = track.getSettings?.().deviceId;
  if (actualDeviceId) {
    const matchingOption = audioInputs.find(
      (device) => device.deviceId === actualDeviceId,
    );

    if (matchingOption) {
      microphoneSelect.value = matchingOption.deviceId;
      saveMicrophoneId(matchingOption.deviceId);
    }
  }

  renderDeviceInfo(track);

  const AudioContext = window.AudioContext || window.webkitAudioContext;
  audioContext = new AudioContext();

  if (audioContext.state === "suspended") {
    await audioContext.resume();
  }

  analyser = audioContext.createAnalyser();
  analyser.fftSize = 1024;

  sourceNode = audioContext.createMediaStreamSource(microphoneStream);
  sourceNode.connect(analyser);

  meterBuffer = new Uint8Array(analyser.fftSize);
  smoothedMeterLevel = 0;
  updateVolumeMeter();

  track.addEventListener(
    "ended",
    () => {
      if (shouldListen) {
        shouldListen = false;
        setListeningControls(false);
        setStatus("error", "Mikrofon megszakadt");
        supportText.textContent =
          "Az audio input megszűnt. Ellenőrizd az eszközt és indítsd újra.";
      }

      stopMicrophoneDiagnostics({ keepDeviceInfo: true });
    },
    { once: true },
  );
}

function stopMicrophoneDiagnostics({ keepDeviceInfo = true } = {}) {
  if (meterAnimationFrame !== null) {
    window.cancelAnimationFrame(meterAnimationFrame);
    meterAnimationFrame = null;
  }

  sourceNode?.disconnect();
  sourceNode = null;
  analyser = null;
  meterBuffer = null;
  smoothedMeterLevel = 0;

  if (microphoneStream) {
    for (const track of microphoneStream.getTracks()) {
      track.stop();
    }
    microphoneStream = null;
  }

  if (audioContext) {
    audioContext.close().catch(() => {});
    audioContext = null;
  }

  renderMeter(0, -Infinity);
  signalText.textContent = "Nincs mérés";

  if (!keepDeviceInfo) {
    deviceName.textContent = "Még nincs megnyitva";
    deviceDetails.textContent =
      "Az eszköz neve mikrofonengedély után jelenik meg.";
  }
}

function clearOutput() {
  finalTranscript = "";
  renderTranscripts();

  commandValue.textContent = "—";
  commandSource.textContent = "Még nincs találat.";
}

function handleMicrophoneFailure(error) {
  shouldListen = false;
  stopMicrophoneDiagnostics({ keepDeviceInfo: false });
  setListeningControls(false);
  setStatus("error", "Mikrofonhiba");

  if (error?.name === "NotAllowedError") {
    supportText.textContent =
      "A mikrofon nincs engedélyezve. Engedélyezd a böngésző címsorából, majd próbáld újra.";
    deviceName.textContent = "Hozzáférés megtagadva";
    deviceDetails.textContent = "A böngésző nem kapott mikrofonengedélyt.";
    return;
  }

  if (error?.name === "NotFoundError" || error?.name === "OverconstrainedError") {
    supportText.textContent =
      "A kiválasztott mikrofont nem sikerült megnyitni. Frissítsd az eszközlistát és válassz másik inputot.";
    deviceName.textContent = "A mikrofon nem érhető el";
    deviceDetails.textContent = "Lehet, hogy az eszközt kihúzták vagy másik eszközazonosítót kapott.";
    return;
  }

  supportText.textContent =
    "Nem sikerült megnyitni a mikrofont. Ellenőrizd az eszközt és a böngésző engedélyeit.";
}

function startSpeechRecognition() {
  const audioTrack = microphoneStream?.getAudioTracks()?.[0];

  if (audioTrack?.readyState === "live") {
    try {
      recognition.start(audioTrack);
      return;
    } catch (error) {
      if (error?.name !== "TypeError") {
        throw error;
      }
    }
  }

  recognition.start();
}

function handleRecognitionStartFailure(error) {
  shouldListen = false;
  setListeningControls(false);
  setStatus("error", "Nem indult el");
  supportText.textContent =
    "A mikrofon működik, de a beszédfelismerés nem indítható el.";
  stopMicrophoneDiagnostics({ keepDeviceInfo: true });

  console.error("SpeechRecognition start failed:", error);
}

async function startListening() {
  if (!recognition || shouldListen) {
    return;
  }

  shouldListen = true;
  setListeningControls(true);
  setStatus("starting", "Mikrofon indítása…");

  try {
    await startMicrophoneDiagnostics();
  } catch (error) {
    handleMicrophoneFailure(error);
    return;
  }

  if (!shouldListen) {
    stopMicrophoneDiagnostics({ keepDeviceInfo: true });
    return;
  }

  setStatus("starting", "Felismerés indítása…");

  try {
    startSpeechRecognition();
  } catch (error) {
    handleRecognitionStartFailure(error);
  }
}

function stopListening() {
  shouldListen = false;

  if (recognition) {
    try {
      recognition.stop();
    } catch {
      // Recognition may already be stopped.
    }
  }

  stopMicrophoneDiagnostics({ keepDeviceInfo: true });
  setListeningControls(false);
  setStatus("idle", "Készen áll");
  renderTranscripts();
}

function stopForRecognitionError(status, message) {
  shouldListen = false;
  setListeningControls(false);
  setStatus("error", status);
  supportText.textContent = message;
  stopMicrophoneDiagnostics({ keepDeviceInfo: true });
}

function configureRecognition() {
  recognition = new SpeechRecognition();
  recognition.lang = "hu-HU";
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    setListeningControls(true);
    setStatus("listening", "Hallgatózom");
    supportText.textContent =
      "A kiválasztott mikrofon és a magyar beszédfelismerés is aktív (hu-HU).";
    renderTranscripts();
  };

  recognition.onresult = (event) => {
    let interim = "";
    let changedText = "";

    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const text = event.results[index][0].transcript.trim();

      if (!text) {
        continue;
      }

      changedText += `${text} `;

      if (event.results[index].isFinal) {
        finalTranscript = `${finalTranscript} ${text}`.trim();
      } else {
        interim += `${text} `;
      }
    }

    renderTranscripts(interim.trim());

    const detected = detectCommand(changedText);
    if (detected) {
      renderDetectedCommand(detected, changedText);
    }
  };

  recognition.onerror = (event) => {
    if (event.error === "aborted" && !shouldListen) {
      return;
    }

    if (event.error === "not-allowed" || event.error === "service-not-allowed") {
      stopForRecognitionError(
        "Felismerés tiltva",
        "A böngésző nem engedte a beszédfelismerést. A mikrofonengedélyt és a böngésző beállításait is ellenőrizd.",
      );
      return;
    }

    if (event.error === "audio-capture") {
      stopForRecognitionError(
        "Audio hiba",
        "A SpeechRecognition nem kapott audio bemenetet.",
      );
      return;
    }

    if (event.error === "network") {
      stopForRecognitionError(
        "Hálózati hiba",
        "A mikrofon megnyílt, de a böngésző beszédfelismerő szolgáltatása nem érhető el.",
      );
      return;
    }

    if (event.error === "no-speech") {
      setStatus("restarting", "Nem hallottam beszédet");
      return;
    }

    setStatus("error", `Hiba: ${event.error}`);
  };

  recognition.onend = () => {
    if (!shouldListen) {
      setListeningControls(false);
      setStatus("idle", "Készen áll");
      renderTranscripts();
      return;
    }

    setStatus("restarting", "Felismerés újraindítása…");

    window.setTimeout(() => {
      if (!shouldListen) {
        return;
      }

      try {
        startSpeechRecognition();
      } catch (error) {
        handleRecognitionStartFailure(error);
      }
    }, 250);
  };
}

async function handleRefreshMicrophones() {
  refreshMicBtn.disabled = true;
  supportText.textContent = "Mikrofonok lekérdezése…";

  try {
    await refreshMicrophoneList({
      requestPermission: true,
      preferBest: false,
    });

    supportText.textContent =
      "Mikrofonlista frissítve. Válaszd ki a kívánt inputot.";
  } catch (error) {
    handleMicrophoneFailure(error);
  } finally {
    if (!shouldListen) {
      refreshMicBtn.disabled = false;
    }
  }
}

renderKeywordList();
renderTranscripts();
renderMeter(0, -Infinity);

const hasMicrophoneApi = Boolean(
  navigator.mediaDevices?.getUserMedia &&
  navigator.mediaDevices?.enumerateDevices,
);

if (!hasMicrophoneApi) {
  startBtn.disabled = true;
  stopBtn.disabled = true;
  refreshMicBtn.disabled = true;
  setStatus("error", "Mikrofon API hiányzik");
  supportText.textContent =
    "A mikrofon API nem érhető el. Használj localhostot vagy HTTPS-t Chrome/Edge böngészőben.";
} else if (!SpeechRecognition) {
  startBtn.disabled = true;
  stopBtn.disabled = true;
  setStatus("error", "Nem támogatott");
  supportText.textContent =
    "A mikrofon API elérhető, de ez a böngésző nem biztosít SpeechRecognition API-t. Próbáld Chrome vagy Edge böngészővel.";
} else {
  supportText.textContent =
    "Mikrofon és SpeechRecognition API elérhető. Választhatsz inputot, majd indíthatod a felismerést.";
  configureRecognition();

  refreshMicrophoneList({ requestPermission: false }).catch(() => {
    microphoneSelect.disabled = true;
  });
}

microphoneSelect.addEventListener("change", () => {
  if (!microphoneSelect.value) {
    return;
  }

  saveMicrophoneId(microphoneSelect.value);
  renderSelectedDevicePreview();
});

navigator.mediaDevices?.addEventListener?.("devicechange", () => {
  if (!shouldListen) {
    refreshMicrophoneList({ requestPermission: false }).catch(() => {});
  }
});

startBtn.addEventListener("click", startListening);
stopBtn.addEventListener("click", stopListening);
clearBtn.addEventListener("click", clearOutput);
refreshMicBtn.addEventListener("click", handleRefreshMicrophones);

window.addEventListener("beforeunload", () => {
  shouldListen = false;
  recognition?.abort();
  stopMicrophoneDiagnostics({ keepDeviceInfo: true });
});
