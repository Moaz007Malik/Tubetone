const DEFAULT_SERVER = "http://127.0.0.1:8765";
const YT_RE =
  /^(https?:\/\/)?(www\.|m\.|music\.)?(youtube\.com\/(watch\?v=|shorts\/|embed\/|live\/)|youtu\.be\/)[\w-]+/i;

const els = {
  serverStatus: document.getElementById("serverStatus"),
  serverStatusText: document.getElementById("serverStatusText"),
  toggleSettings: document.getElementById("toggleSettings"),
  settingsPanel: document.getElementById("settingsPanel"),
  serverUrl: document.getElementById("serverUrl"),
  apiKey: document.getElementById("apiKey"),
  saveSettings: document.getElementById("saveSettings"),
  videoMeta: document.getElementById("videoMeta"),
  thumb: document.getElementById("thumb"),
  thumbPlaceholder: document.getElementById("thumbPlaceholder"),
  videoTitle: document.getElementById("videoTitle"),
  videoUrl: document.getElementById("videoUrl"),
  bitrate: document.getElementById("bitrate"),
  addToQueue: document.getElementById("addToQueue"),
  downloadNow: document.getElementById("downloadNow"),
  queueList: document.getElementById("queueList"),
  queueCount: document.getElementById("queueCount"),
  clearQueue: document.getElementById("clearQueue"),
  manualUrl: document.getElementById("manualUrl"),
  addManual: document.getElementById("addManual"),
  bulkBitrate: document.getElementById("bulkBitrate"),
  downloadAll: document.getElementById("downloadAll"),
  toast: document.getElementById("toast"),
};

let config = { serverUrl: DEFAULT_SERVER, apiKey: "" };
let current = null;
let queue = [];
let busy = false;

init();

async function init() {
  await loadConfig();
  await loadQueue();
  await restoreBitrates();
  renderQueue();
  await checkServer();
  await loadCurrentTab();
  bindEvents();
  setInterval(checkServer, 8000);
}

function bindEvents() {
  els.toggleSettings.addEventListener("click", () => {
    const open = els.settingsPanel.hidden;
    els.settingsPanel.hidden = !open;
    els.toggleSettings.textContent = open ? "Server settings ▴" : "Server settings ▾";
  });

  els.saveSettings.addEventListener("click", async () => {
    const url = els.serverUrl.value.trim().replace(/\/$/, "") || DEFAULT_SERVER;
    const key = els.apiKey.value.trim();
    config = { serverUrl: url, apiKey: key };
    await chrome.storage.local.set(config);
    if (url.startsWith("https://") && !url.includes("onrender.com")) {
      try {
        await chrome.permissions.request({ origins: [`${new URL(url).origin}/*`] });
      } catch {
        /* optional */
      }
    }
    showToast("Settings saved", "ok");
    await checkServer();
  });

  els.addToQueue.addEventListener("click", () => {
    if (!current) return;
    addToQueue(current);
  });

  els.downloadNow.addEventListener("click", async () => {
    if (!current || busy) return;
    await downloadOne(current, els.bitrate.value, "current");
  });

  els.addManual.addEventListener("click", () => addManualUrl());
  els.manualUrl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") addManualUrl();
  });

  els.clearQueue.addEventListener("click", async () => {
    queue = [];
    await saveQueue();
    renderQueue();
  });

  els.downloadAll.addEventListener("click", downloadAll);

  els.bitrate.addEventListener("change", () => {
    chrome.storage.local.set({ bitrate: els.bitrate.value });
  });
  els.bulkBitrate.addEventListener("change", () => {
    chrome.storage.local.set({ bulkBitrate: els.bulkBitrate.value });
  });
}

async function loadConfig() {
  const data = await chrome.storage.local.get(["serverUrl", "apiKey"]);
  config.serverUrl = (data.serverUrl || DEFAULT_SERVER).replace(/\/$/, "");
  config.apiKey = data.apiKey || "";
  els.serverUrl.value = config.serverUrl;
  els.apiKey.value = config.apiKey;
}

async function restoreBitrates() {
  const data = await chrome.storage.local.get(["bitrate", "bulkBitrate"]);
  if (data.bitrate) els.bitrate.value = data.bitrate;
  if (data.bulkBitrate) els.bulkBitrate.value = data.bulkBitrate;
}

async function loadQueue() {
  const data = await chrome.storage.local.get(["queue"]);
  queue = Array.isArray(data.queue) ? data.queue : [];
}

async function saveQueue() {
  await chrome.storage.local.set({ queue });
}

function authHeaders(extra = {}) {
  const headers = { ...extra };
  if (config.apiKey) headers["X-API-Key"] = config.apiKey;
  return headers;
}

function serverBase() {
  return config.serverUrl.replace(/\/$/, "");
}

async function checkServer() {
  try {
    const res = await fetch(`${serverBase()}/health`, {
      signal: AbortSignal.timeout(12000),
    });
    const ok = res.ok;
    els.serverStatus.classList.toggle("online", ok);
    els.serverStatus.classList.toggle("offline", !ok);
    els.serverStatusText.textContent = ok ? "Online" : "Offline";
    return ok;
  } catch {
    els.serverStatus.classList.remove("online");
    els.serverStatus.classList.add("offline");
    els.serverStatusText.textContent = "Offline";
    return false;
  }
}

function normalizeYoutubeUrl(url) {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = u.pathname.slice(1).split("/")[0];
      return id ? `https://www.youtube.com/watch?v=${id}` : null;
    }
    if (host.endsWith("youtube.com")) {
      if (u.pathname === "/watch" && u.searchParams.get("v")) {
        return `https://www.youtube.com/watch?v=${u.searchParams.get("v")}`;
      }
      const shorts = u.pathname.match(/^\/shorts\/([\w-]+)/);
      if (shorts) return `https://www.youtube.com/watch?v=${shorts[1]}`;
      const embed = u.pathname.match(/^\/(?:embed|live)\/([\w-]+)/);
      if (embed) return `https://www.youtube.com/watch?v=${embed[1]}`;
    }
  } catch {
    return null;
  }
  return null;
}

function videoIdFromUrl(url) {
  try {
    return new URL(url).searchParams.get("v");
  } catch {
    return null;
  }
}

async function loadCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url || !YT_RE.test(tab.url)) {
    setCurrent(null);
    return;
  }
  const url = normalizeYoutubeUrl(tab.url);
  if (!url) {
    setCurrent(null);
    return;
  }

  const id = videoIdFromUrl(url);
  let title = tab.title?.replace(/\s*-\s*YouTube\s*$/i, "").trim() || "YouTube video";
  let thumb = id ? `https://i.ytimg.com/vi/${id}/mqdefault.jpg` : null;

  try {
    if (await checkServer()) {
      const res = await fetch(`${serverBase()}/info?url=${encodeURIComponent(url)}`, {
        headers: authHeaders(),
      });
      if (res.ok) {
        const info = await res.json();
        title = info.title || title;
        thumb = info.thumbnail || thumb;
      }
    }
  } catch {
    /* fallback */
  }

  setCurrent({ id, url, title, thumb, status: "queued" });
}

function setCurrent(video) {
  current = video;
  const has = Boolean(video);
  els.addToQueue.disabled = !has;
  els.downloadNow.disabled = !has;
  els.videoMeta.classList.toggle("empty", !has);

  if (!has) {
    els.videoTitle.textContent = "Open a YouTube video";
    els.videoUrl.textContent = "";
    els.thumb.hidden = true;
    els.thumbPlaceholder.hidden = false;
    els.thumbPlaceholder.textContent = "No video";
    return;
  }

  els.videoTitle.textContent = video.title;
  els.videoUrl.textContent = video.url;
  if (video.thumb) {
    els.thumb.src = video.thumb;
    els.thumb.hidden = false;
    els.thumbPlaceholder.hidden = true;
  } else {
    els.thumb.hidden = true;
    els.thumbPlaceholder.hidden = false;
    els.thumbPlaceholder.textContent = "No thumb";
  }
}

async function addManualUrl() {
  const raw = els.manualUrl.value.trim();
  if (!raw) return;
  const url = normalizeYoutubeUrl(raw);
  if (!url) {
    showToast("Not a valid YouTube URL", "error");
    return;
  }
  const id = videoIdFromUrl(url);
  let title = `Video ${id || ""}`.trim();
  let thumb = id ? `https://i.ytimg.com/vi/${id}/mqdefault.jpg` : null;

  try {
    if (await checkServer()) {
      const res = await fetch(`${serverBase()}/info?url=${encodeURIComponent(url)}`, {
        headers: authHeaders(),
      });
      if (res.ok) {
        const info = await res.json();
        title = info.title || title;
        thumb = info.thumbnail || thumb;
      }
    }
  } catch {
    /* fallback */
  }

  addToQueue({ id, url, title, thumb, status: "queued" });
  els.manualUrl.value = "";
}

function addToQueue(video) {
  if (queue.some((q) => q.url === video.url)) {
    showToast("Already in queue", "error");
    return;
  }
  queue.push({
    id: video.id,
    url: video.url,
    title: video.title,
    thumb: video.thumb,
    status: "queued",
  });
  saveQueue();
  renderQueue();
  showToast("Added to queue", "ok");
}

function renderQueue() {
  els.queueCount.textContent = String(queue.length);
  els.downloadAll.disabled = queue.length === 0 || busy;
  els.queueList.innerHTML = "";

  queue.forEach((item, index) => {
    const li = document.createElement("li");
    li.className = "queue-item";
    li.innerHTML = `
      <div>
        <div class="qi-title"></div>
        <div class="qi-status"></div>
      </div>
      <button class="qi-remove" type="button" title="Remove">×</button>
    `;
    li.querySelector(".qi-title").textContent = item.title;
    const st = li.querySelector(".qi-status");
    st.textContent = statusLabel(item.status);
    st.classList.add(item.status);
    li.querySelector(".qi-remove").addEventListener("click", async () => {
      queue.splice(index, 1);
      await saveQueue();
      renderQueue();
    });
    els.queueList.appendChild(li);
  });
}

function statusLabel(status) {
  switch (status) {
    case "downloading":
      return "Downloading…";
    case "done":
      return "Done";
    case "error":
      return "Failed";
    default:
      return "Queued";
  }
}

async function saveMp3Blob(blob, filename) {
  const url = URL.createObjectURL(blob);
  try {
    await chrome.downloads.download({
      url,
      filename: `TubeTone/${filename}`,
      saveAs: false,
    });
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
}

function filenameFromResponse(res, fallback) {
  const header = res.headers.get("X-Filename") || res.headers.get("Content-Disposition") || "";
  const star = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (star) {
    try {
      return decodeURIComponent(star[1]);
    } catch {
      /* ignore */
    }
  }
  const plain = /filename="?([^";]+)"?/i.exec(header);
  if (plain) return plain[1];
  const safe = (fallback || "audio").replace(/[<>:"/\\|?*]+/g, "_").slice(0, 120);
  return `${safe}.mp3`;
}

async function requestDownload(video, bitrate) {
  const res = await fetch(`${serverBase()}/download`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ url: video.url, bitrate: Number(bitrate), mode: "file" }),
  });

  const type = res.headers.get("Content-Type") || "";
  if (!res.ok) {
    const data = type.includes("json") ? await res.json().catch(() => ({})) : {};
    throw new Error(data.error || `Download failed (${res.status})`);
  }

  if (type.includes("json")) {
    const data = await res.json();
    return data.filename || `${video.title}.mp3`;
  }

  const blob = await res.blob();
  const filename = filenameFromResponse(res, video.title);
  await saveMp3Blob(blob, filename);
  return filename;
}

async function downloadOne(video, bitrate, source) {
  if (!(await checkServer())) {
    showToast("Server offline — check URL / Render", "error");
    return false;
  }

  busy = true;
  updateBusyState();
  if (source === "current") els.downloadNow.textContent = "Downloading…";

  try {
    const filename = await requestDownload(video, bitrate);
    showToast(`Saved: ${filename}`, "ok");
    return true;
  } catch (err) {
    showToast(err.message || "Download failed", "error");
    return false;
  } finally {
    busy = false;
    els.downloadNow.textContent = "Download";
    updateBusyState();
  }
}

async function downloadAll() {
  if (!queue.length || busy) return;
  if (!(await checkServer())) {
    showToast("Server offline — check URL / Render", "error");
    return;
  }

  busy = true;
  updateBusyState();
  const bitrate = els.bulkBitrate.value;
  let okCount = 0;

  for (let i = 0; i < queue.length; i++) {
    queue[i].status = "downloading";
    renderQueue();
    try {
      await requestDownload(queue[i], bitrate);
      queue[i].status = "done";
      okCount += 1;
    } catch {
      queue[i].status = "error";
    }
    await saveQueue();
    renderQueue();
  }

  busy = false;
  updateBusyState();
  showToast(`Finished: ${okCount}/${queue.length} downloaded`, okCount ? "ok" : "error");
}

function updateBusyState() {
  const has = Boolean(current);
  els.downloadNow.disabled = !has || busy;
  els.addToQueue.disabled = !has;
  els.downloadAll.disabled = queue.length === 0 || busy;
  els.addManual.disabled = busy;
}

function showToast(message, type = "") {
  els.toast.hidden = false;
  els.toast.className = `toast ${type}`.trim();
  els.toast.textContent = message;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => {
    els.toast.hidden = true;
  }, 3500);
}
