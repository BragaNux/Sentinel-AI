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

      chrome.storage.local.set({
        lastText: content,
        lastAnalysis: raw,
        lastUseAt: Date.now()
      }, () => {
        chrome.action.openPopup();
      });

      try {
        const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
        const risk = parsed?.risk || "N/A";
        const author = parsed?.author || "N/A";
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/128x128.png',
          title: 'Sentinel AI',
          message: `Autor: ${author} • Risco: ${risk}`
        });
      } catch (e) {}

    } catch (error) {
      console.error("Erro ao analisar:", error.message);
    }
  }
});
