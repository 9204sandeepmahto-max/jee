
const $ = (id) => document.getElementById(id);

const lockScreen = $("lockScreen");
const chatScreen = $("chatScreen");
const studyScreen = $("studyScreen");

const USERS = {
  aaryaxyz: { name: "Aarya" },
  sandeepxyz: { name: "Sandeep" }
};

const STUDY_PASSWORD = "aarya123";
const CHAT_KEY = "jee_chat_demo_v1";

let currentUser = null;

// Local demo only: messages are stored in this browser.
function readMessages() {
  try {
    const data = JSON.parse(localStorage.getItem(CHAT_KEY) || "[]");
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function writeMessages(data) {
  try {
    localStorage.setItem(CHAT_KEY, JSON.stringify(data));
    return true;
  } catch {
    $("chatStatus").textContent =
      "Storage full. This message could not be saved.";
    return false;
  }
}

function showScreen(screen) {
  [lockScreen, chatScreen, studyScreen].forEach(section => {
    section.classList.add("hidden");
  });

  screen.classList.remove("hidden");
}

function lockApp() {
  currentUser = null;
  $("password").value = "";
  $("loginMessage").textContent = "";
  showScreen(lockScreen);
}

$("loginForm").addEventListener("submit", event => {
  event.preventDefault();

  const code = $("password").value.trim();

  if (code === STUDY_PASSWORD) {
    $("loginMessage").textContent = "";
    showScreen(studyScreen);
    return;
  }

  if (Object.prototype.hasOwnProperty.call(USERS, code)) {
    currentUser = USERS[code];

    $("chatTitle").textContent = currentUser.name;
    $("chatSubtitle").textContent = "Personal conversation";
    $("loginMessage").textContent = "";

    showScreen(chatScreen);
    renderMessages();
    $("messageInput").focus();
    return;
  }

  $("loginMessage").textContent = "Incorrect password. Try again.";
  $("password").value = "";
});

$("backButton").addEventListener("click", lockApp);
$("studyBack").addEventListener("click", lockApp);

// Return to the lock screen when the browser tab becomes hidden.
// Note: this is a UI convenience, not a security boundary.
document.addEventListener("visibilitychange", () => {
  if (document.hidden && !chatScreen.classList.contains("hidden")) {
    lockApp();
  }
});

window.addEventListener("pagehide", lockApp);

// Light / dark mode
$("themeToggle").addEventListener("click", () => {
  document.body.classList.toggle("dark");

  $("themeToggle").textContent =
    document.body.classList.contains("dark") ? "☀" : "☾";
});

// Send a text message
$("messageForm").addEventListener("submit", event => {
  event.preventDefault();

  if (!currentUser) return;

  const input = $("messageInput");
  const content = input.value.trim();

  if (!content) return;

  const allMessages = readMessages();

  allMessages.push({
    id: crypto.randomUUID(),
    sender: currentUser.name,
    type: "text",
    content,
    time: new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    })
  });

  if (writeMessages(allMessages)) {
    input.value = "";
    $("chatStatus").textContent =
      "Saved in this browser only — not sent to the other device.";
    renderMessages();
  }
});

// Render chat safely using textContent
function renderMessages() {
  const container = $("chatMessages");
  container.replaceChildren();

  readMessages().forEach(message => {
    const bubble = document.createElement("div");
    bubble.className = "bubble";

    if (message.type === "text") {
      bubble.appendChild(document.createTextNode(message.content));
    } else {
      const link = document.createElement("a");
      link.href = message.content;
      link.download = message.filename || "attachment";

      if (message.type === "image") {
        const img = document.createElement("img");
        img.src = message.content;
        img.alt = "Shared image";
        link.appendChild(img);
      } else if (message.type === "video") {
        const video = document.createElement("video");
        video.src = message.content;
        video.controls = true;
        link.appendChild(video);
      }

      const caption = document.createElement("span");
      caption.textContent = "Open / download";
      link.appendChild(caption);
      bubble.appendChild(link);
    }

    const meta = document.createElement("small");
    meta.textContent = message.sender + " · " + message.time;
    bubble.appendChild(meta);

    // Click a bubble to delete that message.
    bubble.title = "Click to delete this message";
    bubble.addEventListener("click", () => {
      if (!confirm("Delete this message from this browser?")) return;

      const remaining = readMessages().filter(
        item => item.id !== message.id
      );

      writeMessages(remaining);
      renderMessages();
    });

    container.appendChild(bubble);
  });

  container.scrollTop = container.scrollHeight;
}

// Temporary photo / video preview.
// Real cloud uploads will be added with the backend.
$("mediaInput").addEventListener("change", async () => {
  const file = $("mediaInput").files[0];
  if (!file) return;

  if (!currentUser) {
    $("mediaInput").value = "";
    return;
  }

  if (!file.type.startsWith("image/") &&
      !file.type.startsWith("video/")) {
    $("chatStatus").textContent = "Choose a photo or video.";
    $("mediaInput").value = "";
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    $("chatStatus").textContent =
      "Demo limit: choose a file smaller than 5 MB.";
    $("mediaInput").value = "";
    return;
  }

  const reader = new FileReader();

  reader.onload = () => {
    const allMessages = readMessages();

    allMessages.push({
      id: crypto.randomUUID(),
      sender: currentUser.name,
      type: file.type.startsWith("image/") ? "image" : "video",
      content: reader.result,
      filename: file.name,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
      })
    });

    if (writeMessages(allMessages)) {
      $("chatStatus").textContent =
        "Local demo attachment saved. Not sent to another device.";
      renderMessages();
    }

    $("mediaInput").value = "";
  };

  reader.onerror = () => {
    $("chatStatus").textContent = "Could not read this file.";
    $("mediaInput").value = "";
  };

  reader.readAsDataURL(file);
});

// Add selected PDFs to the study library for this session.
const pdfUrls = [];

$("pdfInput").addEventListener("change", () => {
  const list = $("pdfList");

  for (const file of $("pdfInput").files) {
    if (file.type !== "application/pdf") continue;

    const url = URL.createObjectURL(file);
    pdfUrls.push(url);

    const row = document.createElement("div");
    row.className = "pdf-item";

    const name = document.createElement("span");
    name.textContent = file.name;

    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = "Open PDF";

    row.append(name, link);
    list.appendChild(row);
  }

  $("pdfInput").value = "";
});
