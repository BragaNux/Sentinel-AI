document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('startBtn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    chrome.storage.local.set({ onboardingDone: true, lastUseAt: Date.now() }, () => {
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
