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
  sendCookies: document.getElementById("sendCookies"),
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

let config = { serverUrl: DEFAULT_SERVER, apiKey: "", sendCookies: true };
let current = null;
let queue = [];
let busy = false;

init();

async function init() {
  await loadConfig();
  await loadQueue();
  await restoreBitrates();
  renderQueue();
  bindEvents();
  // Show the current tab immediately — don't wait on Render/yt-dlp
  await loadCurrentTab();
  checkServer(); // background
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
    config = {
      serverUrl: url,
      apiKey: key,
      sendCookies: els.sendCookies.checked,
    };
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
  const data = await chrome.storage.local.get(["serverUrl", "apiKey", "sendCookies"]);
  config.serverUrl = (data.serverUrl || DEFAULT_SERVER).replace(/\/$/, "");
  config.apiKey = data.apiKey || "";
  config.sendCookies = data.sendCookies !== false;
  els.serverUrl.value = config.serverUrl;
  els.apiKey.value = config.apiKey;
  els.sendCookies.checked = config.sendCookies;
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

/** Export YouTube (+ related) cookies as Netscape cookies.txt for yt-dlp. */
async function getYoutubeCookiesNetscape() {
  if (!config.sendCookies) return "";

  const domains = [
    ".youtube.com",
    "youtube.com",
    ".google.com",
    "google.com",
    ".youtube-nocookie.com",
  ];
  const seen = new Set();
  const rows = ["# Netscape HTTP Cookie File", "# TubeTone auto-export"];

  for (const domain of domains) {
    let list = [];
    try {
      list = await chrome.cookies.getAll({ domain });
    } catch {
      continue;
    }
    for (const c of list) {
      const key = `${c.domain}|${c.path}|${c.name}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const host = c.domain.startsWith(".") ? c.domain : c.domain;
      const includeSub = host.startsWith(".") ? "TRUE" : "FALSE";
      const secure = c.secure ? "TRUE" : "FALSE";
      const expires = c.expirationDate ? Math.floor(c.expirationDate) : 0;
      // Netscape: domain, includeSubdomains, path, secure, expires, name, value
      rows.push(
        [host, includeSub, c.path || "/", secure, String(expires), c.name, c.value].join(
          "\t"
        )
      );
    }
  }

  return rows.length > 2 ? rows.join("\n") : "";
}

async function fetchVideoInfo(url) {
  const cookies = await getYoutubeCookiesNetscape();
  const res = await fetch(`${serverBase()}/info`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ url, cookies }),
    signal: AbortSignal.timeout(45000),
  });
  if (!res.ok) return null;
  return res.json();
}

async function checkServer() {
  try {
    const res = await fetch(`${serverBase()}/health`, {
      signal: AbortSignal.timeout(3000),
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
  const title = tab.title?.replace(/\s*-\s*YouTube\s*$/i, "").trim() || "YouTube video";
  const thumb = id ? `https://i.ytimg.com/vi/${id}/mqdefault.jpg` : null;

  // Paint UI from the tab right away (fast even when Render is online)
  setCurrent({ id, url, title, thumb, status: "queued" });

  // Optional title refresh from server — never blocks the popup
  enrichCurrentFromServer(url);
}

async function enrichCurrentFromServer(url) {
  try {
    const online = await checkServer();
    if (!online) return;
    const info = await fetchVideoInfo(url);
    if (!info || !current || current.url !== url) return;
    setCurrent({
      ...current,
      title: info.title || current.title,
      thumb: info.thumbnail || current.thumb,
    });
  } catch {
    /* keep tab title */
  }
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
  const title = `Video ${id || ""}`.trim();
  const thumb = id ? `https://i.ytimg.com/vi/${id}/mqdefault.jpg` : null;

  addToQueue({ id, url, title, thumb, status: "queued" });
  els.manualUrl.value = "";

  // Refresh title in the background (don't block Add)
  enrichQueueItemFromServer(url);
}

async function enrichQueueItemFromServer(url) {
  try {
    if (!(await checkServer())) return;
    const info = await fetchVideoInfo(url);
    if (!info?.title) return;
    const item = queue.find((q) => q.url === url);
    if (!item) return;
    item.title = info.title;
    if (info.thumbnail) item.thumb = info.thumbnail;
    await saveQueue();
    renderQueue();
  } catch {
    /* keep placeholder title */
  }
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
    st.textContent = statusLabel(item.status, item.error);
    st.classList.add(item.status);
    li.querySelector(".qi-remove").addEventListener("click", async () => {
      queue.splice(index, 1);
      await saveQueue();
      renderQueue();
    });
    els.queueList.appendChild(li);
  });
}

function statusLabel(status, error) {
  switch (status) {
    case "downloading":
      return "Downloading…";
    case "done":
      return "Done";
    case "error":
      return error ? `Failed: ${String(error).slice(0, 80)}` : "Failed";
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
  const cookies = await getYoutubeCookiesNetscape();
  let res;
  try {
    res = await fetch(`${serverBase()}/download`, {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        url: video.url,
        bitrate: Number(bitrate),
        mode: "file",
        cookies,
      }),
      signal: AbortSignal.timeout(300000),
    });
  } catch (err) {
    const msg = String(err?.message || err);
    if (/abort|timeout/i.test(msg)) {
      throw new Error("Timed out — song too long or Render is too slow/out of memory");
    }
    throw new Error(
      "Download interrupted — Render may have restarted (memory limit). Try 128 kbps or local server."
    );
  }

  const type = res.headers.get("Content-Type") || "";
  if (!res.ok) {
    let data = {};
    try {
      data = type.includes("json") ? await res.json() : { error: await res.text() };
    } catch {
      data = {};
    }
    const raw = data.error || `Download failed (${res.status})`;
    throw new Error(String(raw).replace(/^ERROR:\s*/i, "").slice(0, 240));
  }

  if (type.includes("json")) {
    const data = await res.json();
    return data.filename || `${video.title}.mp3`;
  }

  const blob = await res.blob();
  if (!blob.size) {
    throw new Error("Empty file returned — download failed on server");
  }
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
  let lastError = "";

  for (let i = 0; i < queue.length; i++) {
    queue[i].status = "downloading";
    queue[i].error = "";
    renderQueue();
    try {
      await requestDownload(queue[i], bitrate);
      queue[i].status = "done";
      okCount += 1;
    } catch (err) {
      queue[i].status = "error";
      queue[i].error = err.message || "Failed";
      lastError = queue[i].error;
    }
    await saveQueue();
    renderQueue();
  }

  busy = false;
  updateBusyState();
  if (okCount) {
    showToast(`Finished: ${okCount}/${queue.length} downloaded`, "ok");
  } else {
    const short = (lastError || "Download failed").replace(/\s+/g, " ").slice(0, 160);
    showToast(`Finished 0/${queue.length}: ${short}`, "error");
  }
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
  }, type === "error" ? 8000 : 3500);
}
