function detectType(text) {
  const codePattern = /function\s+\w+\(|class\s+\w+|const\s+\w+\s*=|let\s+\w+\s*=|#include|public\s+|import\s+\w+|\{[\s\S]*?\}/;
  const urlPattern = /(https?:\/\/[^\s]+)/gi;
  if (urlPattern.test(text)) return "link";
  if (codePattern.test(text)) return "código";
  return "texto";
}

chrome.runtime.onInstalled.addListener((details) => {
  chrome.contextMenus.create({
    id: "analyzeText",
    title: "Analisar com Sentinel IA",
    contexts: ["selection", "link", "image"]
  });

  const currentVersion = chrome.runtime.getManifest().version;
  if (details.reason === 'install') {
    chrome.storage.local.set({ onboardingDone: false, lastVersionSeen: currentVersion, installedAt: Date.now() });
    const url = chrome.runtime.getURL('html/welcome.html');
    chrome.tabs.create({ url });
  }
  if (details.reason === 'update') {
    chrome.storage.local.set({ lastVersionSeen: currentVersion, updatedAt: Date.now(), updateSeen: false });
    const url = chrome.runtime.getURL('html/update.html');
    chrome.tabs.create({ url });
  }
});

chrome.runtime.setUninstallURL('http://localhost:3000/uninstall-feedback');

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  let content = "";

  if (info.menuItemId === "analyzeText") {
    if (info.selectionText) {
      content = info.selectionText;
    } else if (info.linkUrl) {
      content = info.linkUrl;
    } else if (info.srcUrl) {
      content = info.srcUrl;
    }

    try {
      const response = await fetch("http://localhost:3000/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: content })
      });

      const raw = await response.json();

      const parsed = typeof raw === "string" ? (() => { try { return JSON.parse(raw); } catch { return null; } })() : raw;

      chrome.storage.local.set({
        lastText: content,
        lastAnalysis: parsed || raw,
        lastUseAt: Date.now()
      }, () => {
        try {
          chrome.storage.local.get({ history: [] }, (data) => {
            const entry = {
              text: content,
              result: parsed || raw,
              type: detectType(content),
              timestamp: new Date().toISOString()
            };
            const updated = [entry, ...(Array.isArray(data.history) ? data.history : [])];
      chrome.storage.local.set({ history: updated }, () => {
        try {
          if (chrome.action && typeof chrome.action.openPopup === 'function') {
            chrome.action.openPopup();
          }
        } catch {}
      });
          });
        } catch (e) {
          chrome.action.openPopup();
        }
      });

      try {
        const notif = parsed || raw;
        const risk = notif?.risk || "N/A";
        const author = notif?.author || "N/A";
        if (chrome.notifications && typeof chrome.notifications.create === 'function') {
          chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/128x128.png',
            title: 'Sentinel AI',
            message: `Autor: ${author} • Risco: ${risk}`
          });
        }
      } catch (e) {}

    } catch (error) {
      console.error("Erro ao analisar:", error.message);
    }
  }
});
