// Keeps the extension service worker alive for messaging if needed later.
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(["queue"], (data) => {
    if (!Array.isArray(data.queue)) {
      chrome.storage.local.set({ queue: [] });
    }
  });
});
