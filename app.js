import CONFIG from "./config/config.js";
import { VoiceEngine } from "./speech/voice-engine.js";
import { BenchmarkSession } from "./benchmark/benchmark.js";
import BENCHMARK_CASES from "./benchmark/cases.js";
import { normalizeCommandText } from "./speech/parsers.js";

const $ = (selector) => document.querySelector(selector);

const ui = {
  startBtn: $("#startBtn"),
  stopBtn: $("#stopBtn"),
  clearBtn: $("#clearBtn"),
  refreshMicBtn: $("#refreshMicBtn"),
  microphoneSelect: $("#microphoneSelect"),
  supportText: $("#supportText"),
  statusBadge: $("#statusBadge"),
  statusText: $("#statusText"),
  deviceName: $("#deviceName"),
  deviceDetails: $("#deviceDetails"),
  signalText: $("#signalText"),
  meterValue: $("#meterValue"),
  volumeMeter: $("#volumeMeter"),
  volumeFill: $("#volumeFill"),
  interimTranscript: $("#interimTranscript"),
  finalTranscript: $("#finalTranscript"),
  keywordList: $("#keywordList"),
  commandValue: $("#commandValue"),
  commandSource: $("#commandSource"),
  letterValue: $("#letterValue"),
  letterSource: $("#letterSource"),
  benchmarkState: $("#benchmarkState"),
  benchmarkPrompt: $("#benchmarkPrompt"),
  benchmarkExpected: $("#benchmarkExpected"),
  benchmarkProgress: $("#benchmarkProgress"),
  benchmarkActual: $("#benchmarkActual"),
  benchmarkResult: $("#benchmarkResult"),
  benchmarkTranscriptScore: $("#benchmarkTranscriptScore"),
  benchmarkEventScore: $("#benchmarkEventScore"),
  benchmarkAttemptCount: $("#benchmarkAttemptCount"),
  benchmarkStartBtn: $("#benchmarkStartBtn"),
  benchmarkNextBtn: $("#benchmarkNextBtn"),
  benchmarkSkipBtn: $("#benchmarkSkipBtn"),
  benchmarkExportBtn: $("#benchmarkExportBtn"),
  benchmarkHistory: $("#benchmarkHistory"),
  debugProvider: $("#debugProvider"),
  debugState: $("#debugState"),
  debugLanguage: $("#debugLanguage"),
  debugDevice: $("#debugDevice"),
  debugAudio: $("#debugAudio"),
  debugBrowser: $("#debugBrowser"),
  debugInterim: $("#debugInterim"),
  debugFinal: $("#debugFinal"),
  debugAlternatives: $("#debugAlternatives"),
  debugVoiceEvent: $("#debugVoiceEvent"),
};

const benchmark = new BenchmarkSession(BENCHMARK_CASES);
let finalTranscript = "";
let shouldListen = false;
let audioInputs = [];

let microphoneStream = null;
let audioContext = null;
let analyser = null;
let sourceNode = null;
let meterBuffer = null;
let meterAnimationFrame = null;
let smoothedMeterLevel = 0;
let activeDeviceMetadata = {
  label: null,
  sampleRate: null,
  channelCount: null,
};

const engine = new VoiceEngine(CONFIG, {
  onState: handleRecognitionState,
  onInterim: handleInterim,
  onFinal: handleFinal,
  onVoiceEvent: handleVoiceEvent,
  onError: handleRecognitionError,
});

const commandAliases = [
  ...new Set(CONFIG.commands.flatMap((command) => command.aliases ?? [])),
].sort((a, b) => b.length - a.length);

const highlightPattern = new RegExp(
  `(${commandAliases.map(escapeRegExp).join("|")})`,
  "giu",
);

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function highlightKeywords(value, placeholder) {
  if (!value.trim()) {
    return `<span class="placeholder">${escapeHtml(placeholder)}</span>`;
  }

  return escapeHtml(value).replace(highlightPattern, "<mark>$1</mark>");
}

function setStatus(state, text) {
  ui.statusBadge.dataset.state = state;
  ui.statusText.textContent = text;
}

function setListeningControls(isListening) {
  ui.startBtn.disabled =
    isListening ||
    !engine.isSupported() ||
    !navigator.mediaDevices?.getUserMedia;

  ui.stopBtn.disabled = !isListening;
  ui.microphoneSelect.disabled = isListening || audioInputs.length === 0;
  ui.refreshMicBtn.disabled = isListening;
}

function renderKeywordList() {
  ui.keywordList.replaceChildren();

  for (const command of CONFIG.commands) {
    for (const alias of command.aliases ?? []) {
      const chip = document.createElement("span");
      chip.className = "keyword-chip";

      const commandName = document.createElement("strong");
      commandName.textContent = command.id;

      const phrase = document.createElement("span");
      phrase.textContent = alias;

      chip.append(commandName, phrase);
      ui.keywordList.append(chip);
    }
  }
}

function renderTranscripts(interim = "") {
  ui.interimTranscript.innerHTML = highlightKeywords(
    interim,
    shouldListen ? "Hallgatózom…" : "Indítsd el a mikrofont, majd beszélj…",
  );

  ui.finalTranscript.innerHTML = highlightKeywords(
    finalTranscript,
    "A véglegesített szöveg itt gyűlik majd.",
  );
}

function clearOutput() {
  finalTranscript = "";
  renderTranscripts();

  ui.commandValue.textContent = "—";
  ui.commandSource.textContent = "Még nincs találat.";
  ui.letterValue.textContent = "—";
  ui.letterSource.textContent = "Mondd például: „K mint Károly”.";

  ui.debugInterim.textContent = "—";
  ui.debugFinal.textContent = "—";
  ui.debugAlternatives.innerHTML = "<li>—</li>";
  ui.debugVoiceEvent.textContent = "—";
}

function handleRecognitionState(state) {
  ui.debugState.textContent = state;

  if (state === "listening") {
    setStatus("listening", "Hallgatózom");
    ui.supportText.textContent =
      `A kiválasztott mikrofon és a ${CONFIG.recognition.language} felismerés aktív.`;
  } else if (state === "restarting") {
    setStatus("restarting", "Felismerés újraindítása…");
  } else if (state === "starting") {
    setStatus("starting", "Felismerés indítása…");
  } else if (state === "stopped" && !shouldListen) {
    setStatus("idle", "Készen áll");
  }
}

function handleInterim(payload) {
  renderTranscripts(payload.transcript);
  ui.debugInterim.textContent = payload.transcript || "—";
}

function handleFinal(payload) {
  const primaryTranscript = payload.alternatives[0]?.transcript ?? "";

  if (primaryTranscript) {
    finalTranscript = `${finalTranscript} ${primaryTranscript}`.trim();
  }

  renderTranscripts();
  ui.debugFinal.textContent = primaryTranscript || "—";
  renderDebugAlternatives(payload.alternatives);

  if (benchmark.active && !benchmark.currentRecorded) {
    benchmark.recordRecognition(payload);
    renderBenchmark();
  }
}

function handleVoiceEvent(event) {
  ui.debugVoiceEvent.textContent = JSON.stringify(event, null, 2);

  if (event.type === "COMMAND") {
    ui.commandValue.textContent = `${event.command} · ${event.label}`;
    ui.commandSource.textContent = `„${event.transcript}”`;
  }

  if (event.type === "LETTER") {
    ui.letterValue.textContent = event.value;
    ui.letterSource.textContent = `„${event.transcript}”`;
  }

  window.dispatchEvent(
    new CustomEvent("voice-event", {
      detail: event,
    }),
  );
}

function handleRecognitionError(error) {
  if (error.code === "no-speech") {
    setStatus("restarting", "Nem hallottam beszédet");
    return;
  }

  const messages = {
    "not-allowed": "A böngésző nem engedte a beszédfelismerést.",
    "service-not-allowed": "A beszédfelismerő szolgáltatás nem engedélyezett.",
    "audio-capture": "A SpeechRecognition nem kapott audio bemenetet.",
    network: "A böngésző beszédfelismerő szolgáltatása nem érhető el.",
  };

  setStatus("error", `Hiba: ${error.code}`);
  ui.supportText.textContent =
    messages[error.code] ?? `SpeechRecognition hiba: ${error.code}`;

  if (error.fatal) {
    shouldListen = false;
    setListeningControls(false);
    stopMicrophoneDiagnostics({ keepDeviceInfo: true });
  }
}

function renderDebugAlternatives(alternatives = []) {
  ui.debugAlternatives.replaceChildren();

  const visible = alternatives.slice(0, CONFIG.debug.maxAlternativesShown);

  if (visible.length === 0) {
    const item = document.createElement("li");
    item.textContent = "—";
    ui.debugAlternatives.append(item);
    return;
  }

  visible.forEach((alternative, index) => {
    const item = document.createElement("li");
    const confidence =
      alternative.confidence === null
        ? "n/a"
        : `${Math.round(alternative.confidence * 100)}%`;

    item.textContent =
      `#${index + 1} · ${confidence} · ${alternative.transcript}`;
    ui.debugAlternatives.append(item);
  });
}

function getSavedMicrophoneId() {
  try {
    return window.localStorage.getItem(
      CONFIG.storage.microphoneDeviceIdKey,
    );
  } catch {
    return null;
  }
}

function saveMicrophoneId(deviceId) {
  try {
    window.localStorage.setItem(
      CONFIG.storage.microphoneDeviceIdKey,
      deviceId,
    );
  } catch {
    // localStorage can be unavailable in strict privacy modes.
  }
}

function microphonePreferenceScore(device) {
  const label = normalizeCommandText(device.label || "");
  let score = 0;

  for (const rule of CONFIG.microphone.preferenceRules) {
    if (label.includes(normalizeCommandText(rule.contains))) {
      score += rule.score;
    }
  }

  if (device.deviceId === "default") {
    score -= CONFIG.microphone.defaultDevicePenalty;
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
    (device) => device.deviceId === ui.microphoneSelect.value,
  );

  if (!selected || microphoneStream) {
    return;
  }

  ui.deviceName.textContent = selected.label || "Kiválasztott mikrofon";
  ui.deviceDetails.textContent =
    "Kiválasztva · indításkor ezt az inputot nyitjuk meg.";
  ui.debugDevice.textContent = selected.label || "Kiválasztott mikrofon";
}

async function requestMicrophonePermission() {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: true,
    video: false,
  });

  stream.getTracks().forEach((track) => track.stop());
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

  const previousValue = ui.microphoneSelect.value;
  const preferredId = preferBest
    ? choosePreferredMicrophone(audioInputs)
    : getSavedMicrophoneId() || previousValue;

  ui.microphoneSelect.replaceChildren();

  if (audioInputs.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Nem található mikrofon";
    ui.microphoneSelect.append(option);
    setListeningControls(false);
    return;
  }

  audioInputs.forEach((device, index) => {
    const option = document.createElement("option");
    option.value = device.deviceId;
    option.textContent = device.label || `Mikrofon ${index + 1}`;
    ui.microphoneSelect.append(option);
  });

  const selectedId =
    audioInputs.some((device) => device.deviceId === preferredId)
      ? preferredId
      : choosePreferredMicrophone(audioInputs);

  if (selectedId) {
    ui.microphoneSelect.value = selectedId;
    saveMicrophoneId(selectedId);
  }

  setListeningControls(shouldListen);
  renderSelectedDevicePreview();
}

function renderDeviceInfo(track) {
  const settings = track.getSettings?.() ?? {};
  const details = [];

  activeDeviceMetadata = {
    label: track.label || "Kiválasztott mikrofon",
    sampleRate: settings.sampleRate ?? null,
    channelCount: settings.channelCount ?? null,
  };

  ui.deviceName.textContent = activeDeviceMetadata.label;

  if (activeDeviceMetadata.sampleRate) {
    details.push(`${activeDeviceMetadata.sampleRate} Hz`);
  }

  if (activeDeviceMetadata.channelCount) {
    details.push(`${activeDeviceMetadata.channelCount} csatorna`);
  }

  ui.deviceDetails.textContent =
    details.length > 0
      ? details.join(" · ")
      : "A böngésző által megnyitott audio input.";

  ui.debugDevice.textContent = activeDeviceMetadata.label;
  ui.debugAudio.textContent =
    details.length > 0 ? details.join(" · ") : "n/a";
}

function renderMeter(level, db) {
  const roundedLevel = Math.round(level);

  ui.volumeFill.style.width = `${roundedLevel}%`;
  ui.volumeMeter.setAttribute("aria-valuenow", String(roundedLevel));
  ui.meterValue.textContent =
    Number.isFinite(db) ? `${db.toFixed(1)} dB` : "— dB";

  if (level >= CONFIG.meter.strongSignalPercent) {
    ui.signalText.textContent = "Jel érkezik";
  } else if (level >= CONFIG.meter.weakSignalPercent) {
    ui.signalText.textContent = "Gyenge jel";
  } else {
    ui.signalText.textContent = "Csend / nincs jel";
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
    ? Math.max(
        0,
        Math.min(
          100,
          ((db - CONFIG.meter.floorDb) / -CONFIG.meter.floorDb) * 100,
        ),
      )
    : 0;

  smoothedMeterLevel =
    rawLevel >= smoothedMeterLevel
      ? rawLevel
      : smoothedMeterLevel * CONFIG.meter.releaseSmoothing;

  renderMeter(smoothedMeterLevel, db);
  meterAnimationFrame = window.requestAnimationFrame(updateVolumeMeter);
}

async function startMicrophoneDiagnostics() {
  if (microphoneStream) {
    return;
  }

  if (audioInputs.length === 0 || !ui.microphoneSelect.value) {
    await refreshMicrophoneList({
      requestPermission: true,
      preferBest: true,
    });
  }

  const selectedDeviceId = ui.microphoneSelect.value;

  ui.signalText.textContent = "Mikrofon megnyitása…";
  ui.deviceName.textContent = "Kapcsolódás…";
  ui.deviceDetails.textContent = "A kiválasztott audio input megnyitása.";

  microphoneStream = await navigator.mediaDevices.getUserMedia({
    audio: selectedDeviceId
      ? { deviceId: { exact: selectedDeviceId } }
      : true,
    video: false,
  });

  const [track] = microphoneStream.getAudioTracks();

  if (!track) {
    throw new Error("No audio track is available.");
  }

  const actualDeviceId = track.getSettings?.().deviceId;

  if (actualDeviceId) {
    const matchingDevice = audioInputs.find(
      (device) => device.deviceId === actualDeviceId,
    );

    if (matchingDevice) {
      ui.microphoneSelect.value = matchingDevice.deviceId;
      saveMicrophoneId(matchingDevice.deviceId);
    }
  }

  renderDeviceInfo(track);

  const AudioContextClass =
    window.AudioContext || window.webkitAudioContext;

  audioContext = new AudioContextClass();

  if (audioContext.state === "suspended") {
    await audioContext.resume();
  }

  analyser = audioContext.createAnalyser();
  analyser.fftSize = CONFIG.meter.fftSize;

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
        engine.stop();
        setListeningControls(false);
        setStatus("error", "Mikrofon megszakadt");
        ui.supportText.textContent =
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

  microphoneStream?.getTracks().forEach((track) => track.stop());
  microphoneStream = null;

  if (audioContext) {
    audioContext.close().catch(() => {});
    audioContext = null;
  }

  renderMeter(0, -Infinity);
  ui.signalText.textContent = "Nincs mérés";

  if (!keepDeviceInfo) {
    ui.deviceName.textContent = "Még nincs megnyitva";
    ui.deviceDetails.textContent =
      "Az eszköz neve mikrofonengedély után jelenik meg.";
  }
}

async function startListening() {
  if (shouldListen || !engine.isSupported()) {
    return;
  }

  shouldListen = true;
  setListeningControls(true);
  setStatus("starting", "Mikrofon indítása…");

  try {
    await startMicrophoneDiagnostics();

    const audioTrack = microphoneStream?.getAudioTracks()?.[0] ?? null;
    engine.start(audioTrack);
  } catch (error) {
    shouldListen = false;
    stopMicrophoneDiagnostics({ keepDeviceInfo: false });
    setListeningControls(false);
    setStatus("error", "Mikrofonhiba");

    if (error?.name === "NotAllowedError") {
      ui.supportText.textContent =
        "A mikrofon nincs engedélyezve. Engedélyezd a böngészőben.";
    } else if (
      error?.name === "NotFoundError" ||
      error?.name === "OverconstrainedError"
    ) {
      ui.supportText.textContent =
        "A kiválasztott mikrofont nem sikerült megnyitni.";
    } else {
      ui.supportText.textContent =
        `Nem sikerült elindítani a mikrofont: ${error?.message ?? error}`;
    }
  }
}

function stopListening() {
  shouldListen = false;
  engine.stop();
  stopMicrophoneDiagnostics({ keepDeviceInfo: true });
  setListeningControls(false);
  setStatus("idle", "Készen áll");
  renderTranscripts();
}

function formatExpected(expected) {
  if (!expected) {
    return "—";
  }

  if (expected.type === "COMMAND") {
    return `COMMAND · ${expected.command}`;
  }

  if (expected.type === "LETTER") {
    return `LETTER · ${expected.value}`;
  }

  return expected.type;
}

function formatActualEvent(event) {
  if (!event) {
    return "NINCS PARSER TALÁLAT";
  }

  return event.type === "COMMAND"
    ? `COMMAND · ${event.command}`
    : `LETTER · ${event.value}`;
}

function renderBenchmark() {
  const summary = benchmark.summary();
  const current = benchmark.currentCase;
  const lastResult = benchmark.results.at(-1);

  ui.benchmarkTranscriptScore.textContent =
    `${summary.transcriptAccuracy}%`;
  ui.benchmarkEventScore.textContent = `${summary.eventAccuracy}%`;
  ui.benchmarkAttemptCount.textContent = String(summary.attemptedCases);
  ui.benchmarkExportBtn.disabled = benchmark.results.length === 0;

  if (benchmark.active && current) {
    ui.benchmarkState.dataset.state = "running";
    ui.benchmarkState.textContent = "Fut";
    ui.benchmarkPrompt.textContent = current.prompt;
    ui.benchmarkExpected.textContent =
      `Elvárt: ${formatExpected(current.expected)}`;
    ui.benchmarkProgress.textContent =
      `${benchmark.index + 1} / ${benchmark.cases.length}`;
    ui.benchmarkNextBtn.disabled = !benchmark.currentRecorded;
    ui.benchmarkSkipBtn.disabled = benchmark.currentRecorded;
    ui.benchmarkStartBtn.textContent = "Újrakezdés";
  } else if (benchmark.completed) {
    ui.benchmarkState.dataset.state = "success";
    ui.benchmarkState.textContent = "Kész";
    ui.benchmarkPrompt.textContent = "Benchmark befejezve";
    ui.benchmarkExpected.textContent =
      `Játékesemény pontosság: ${summary.eventAccuracy}%`;
    ui.benchmarkProgress.textContent =
      `${summary.completedCases} / ${summary.totalCases}`;
    ui.benchmarkNextBtn.disabled = true;
    ui.benchmarkSkipBtn.disabled = true;
    ui.benchmarkStartBtn.textContent = "Új benchmark";
  } else {
    ui.benchmarkState.dataset.state = "idle";
    ui.benchmarkState.textContent = "Nem fut";
    ui.benchmarkPrompt.textContent = "—";
    ui.benchmarkExpected.textContent = "Indítsd el a benchmarkot.";
    ui.benchmarkProgress.textContent = `0 / ${benchmark.cases.length}`;
    ui.benchmarkNextBtn.disabled = true;
    ui.benchmarkSkipBtn.disabled = true;
    ui.benchmarkStartBtn.textContent = "Benchmark indítása";
  }

  if (lastResult) {
    ui.benchmarkActual.textContent =
      lastResult.skipped
        ? "Kihagyva"
        : lastResult.primaryTranscript || "(üres)";

    ui.benchmarkResult.textContent = lastResult.skipped
      ? "KIHAGYVA"
      : lastResult.eventCorrect
        ? `✅ ${formatActualEvent(lastResult.event)}`
        : `❌ ${formatActualEvent(lastResult.event)}`;
  } else {
    ui.benchmarkActual.textContent = "—";
    ui.benchmarkResult.textContent = "—";
  }

  ui.benchmarkHistory.replaceChildren();

  benchmark.results
    .slice(-6)
    .reverse()
    .forEach((result) => {
      const row = document.createElement("div");
      const successful = !result.skipped && result.eventCorrect;
      row.className =
        `history-row ${successful ? "success" : "failure"}`;

      const icon = document.createElement("span");
      icon.textContent = result.skipped ? "↷" : successful ? "✓" : "×";

      const text = document.createElement("span");
      text.textContent =
        `${result.prompt} → ${result.primaryTranscript || "—"}`;

      const score = document.createElement("span");
      score.className = "history-result";
      score.textContent = result.skipped
        ? "skip"
        : formatActualEvent(result.event);

      row.append(icon, text, score);
      ui.benchmarkHistory.append(row);
    });
}

async function startBenchmark() {
  benchmark.start();
  renderBenchmark();

  if (!shouldListen) {
    await startListening();
  }
}

function nextBenchmarkCase() {
  benchmark.next();
  renderBenchmark();
}

function skipBenchmarkCase() {
  benchmark.skip();
  renderBenchmark();
}

function exportBenchmark() {
  if (benchmark.results.length === 0) {
    return;
  }

  const data = benchmark.exportData({
    browser: navigator.userAgent,
    language: CONFIG.recognition.language,
    provider: engine.providerName,
    microphone: activeDeviceMetadata,
    maxAlternatives: CONFIG.recognition.maxAlternatives,
  });

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download =
    `voice-benchmark-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

async function refreshMicrophonesFromUi() {
  ui.refreshMicBtn.disabled = true;
  ui.supportText.textContent = "Mikrofonok lekérdezése…";

  try {
    await refreshMicrophoneList({
      requestPermission: true,
      preferBest: false,
    });
    ui.supportText.textContent =
      "Mikrofonlista frissítve. Válaszd ki a kívánt inputot.";
  } catch (error) {
    ui.supportText.textContent =
      `A mikrofonlista nem kérdezhető le: ${error?.message ?? error}`;
  } finally {
    if (!shouldListen) {
      ui.refreshMicBtn.disabled = false;
    }
  }
}

function initializeDebugPanel() {
  ui.debugProvider.textContent = engine.providerName;
  ui.debugLanguage.textContent = CONFIG.recognition.language;
  ui.debugBrowser.textContent = navigator.userAgent;
}

function initializeApp() {
  renderKeywordList();
  renderTranscripts();
  renderMeter(0, -Infinity);
  renderBenchmark();
  initializeDebugPanel();

  const hasMicrophoneApi = Boolean(
    navigator.mediaDevices?.getUserMedia &&
    navigator.mediaDevices?.enumerateDevices,
  );

  if (!hasMicrophoneApi) {
    ui.startBtn.disabled = true;
    ui.stopBtn.disabled = true;
    ui.refreshMicBtn.disabled = true;
    setStatus("error", "Mikrofon API hiányzik");
    ui.supportText.textContent =
      "Használj localhostot vagy HTTPS-t Chrome/Edge böngészőben.";
    return;
  }

  if (!engine.isSupported()) {
    ui.startBtn.disabled = true;
    ui.stopBtn.disabled = true;
    setStatus("error", "SpeechRecognition nem támogatott");
    ui.supportText.textContent =
      "Próbáld Chrome vagy Edge böngészővel.";
    return;
  }

  ui.supportText.textContent =
    "Mikrofon és SpeechRecognition API elérhető.";
  setListeningControls(false);

  refreshMicrophoneList({ requestPermission: false }).catch(() => {
    ui.microphoneSelect.disabled = true;
  });
}

ui.microphoneSelect.addEventListener("change", () => {
  if (ui.microphoneSelect.value) {
    saveMicrophoneId(ui.microphoneSelect.value);
    renderSelectedDevicePreview();
  }
});

navigator.mediaDevices?.addEventListener?.("devicechange", () => {
  if (!shouldListen) {
    refreshMicrophoneList({ requestPermission: false }).catch(() => {});
  }
});

ui.startBtn.addEventListener("click", startListening);
ui.stopBtn.addEventListener("click", stopListening);
ui.clearBtn.addEventListener("click", clearOutput);
ui.refreshMicBtn.addEventListener("click", refreshMicrophonesFromUi);
ui.benchmarkStartBtn.addEventListener("click", startBenchmark);
ui.benchmarkNextBtn.addEventListener("click", nextBenchmarkCase);
ui.benchmarkSkipBtn.addEventListener("click", skipBenchmarkCase);
ui.benchmarkExportBtn.addEventListener("click", exportBenchmark);

window.addEventListener("beforeunload", () => {
  shouldListen = false;
  engine.abort();
  stopMicrophoneDiagnostics({ keepDeviceInfo: true });
});

initializeApp();
