const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

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
const supportText = document.querySelector("#supportText");
const statusBadge = document.querySelector("#statusBadge");
const statusText = document.querySelector("#statusText");
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
  startBtn.disabled = isListening || !SpeechRecognition;
  stopBtn.disabled = !isListening;
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

function clearOutput() {
  finalTranscript = "";
  renderTranscripts();

  commandValue.textContent = "—";
  commandSource.textContent = "Még nincs találat.";
}

function handleStartFailure(error) {
  shouldListen = false;
  setListeningControls(false);
  setStatus("error", "Nem indult el");

  if (error?.name === "NotAllowedError") {
    supportText.textContent =
      "A mikrofon nincs engedélyezve. Engedélyezd a böngésző címsorából, majd próbáld újra.";
    return;
  }

  supportText.textContent =
    "A beszédfelismerés nem indítható el. Ellenőrizd a mikrofont és próbáld újra.";
}

function startListening() {
  if (!recognition || shouldListen) {
    return;
  }

  shouldListen = true;
  setListeningControls(true);
  setStatus("starting", "Indítás…");

  try {
    recognition.start();
  } catch (error) {
    handleStartFailure(error);
  }
}

function stopListening() {
  shouldListen = false;

  if (!recognition) {
    return;
  }

  setStatus("idle", "Leállítás…");

  try {
    recognition.stop();
  } catch {
    setListeningControls(false);
    setStatus("idle", "Készen áll");
  }
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
    supportText.textContent = "Magyar beszédfelismerés aktív (hu-HU).";
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
      shouldListen = false;
      setListeningControls(false);
      setStatus("error", "Mikrofon tiltva");
      supportText.textContent =
        "Engedélyezd a mikrofont a böngészőben, majd indítsd újra a felismerést.";
      return;
    }

    if (event.error === "audio-capture") {
      shouldListen = false;
      setListeningControls(false);
      setStatus("error", "Nincs mikrofon");
      supportText.textContent =
        "Nem sikerült használható mikrofont elérni ezen az eszközön.";
      return;
    }

    if (event.error === "network") {
      shouldListen = false;
      setListeningControls(false);
      setStatus("error", "Hálózati hiba");
      supportText.textContent =
        "A böngésző beszédfelismerő szolgáltatása nem érhető el.";
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

    setStatus("restarting", "Újraindítás…");

    window.setTimeout(() => {
      if (!shouldListen) {
        return;
      }

      try {
        recognition.start();
      } catch (error) {
        handleStartFailure(error);
      }
    }, 250);
  };
}

renderKeywordList();
renderTranscripts();

if (!SpeechRecognition) {
  startBtn.disabled = true;
  stopBtn.disabled = true;
  setStatus("error", "Nem támogatott");
  supportText.textContent =
    "Ez a böngésző nem biztosít SpeechRecognition API-t. Próbáld Chrome vagy Edge böngészővel.";
} else {
  supportText.textContent =
    "SpeechRecognition elérhető. Első indításkor engedélyezd a mikrofont.";
  configureRecognition();
}

startBtn.addEventListener("click", startListening);
stopBtn.addEventListener("click", stopListening);
clearBtn.addEventListener("click", clearOutput);

window.addEventListener("beforeunload", () => {
  shouldListen = false;
  recognition?.abort();
});
