document.addEventListener('DOMContentLoaded', () => {
  const v = chrome.runtime.getManifest().version;
  const verEl = document.getElementById('ver');
  if (verEl) verEl.textContent = v;
  const btn = document.getElementById('ackBtn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    chrome.storage.local.set({ updateSeen: true, lastVersionSeen: v }, () => {
      try {
        chrome.action.openPopup();
        setTimeout(() => window.close(), 300);
      } catch (e) {
        const url = chrome.runtime.getURL('html/popup.html');
        chrome.tabs.create({ url }, () => {
          window.close();
        });
      }
    });
  });
});
