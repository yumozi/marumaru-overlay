/**
 * Background Service Worker
 *
 * Central relay between the scraper and the overlay.
 */

const TAG = '[Marumaru BG]';

let scraperTabId = null;

async function broadcastToOtherTabs(payload, senderId) {
  const tabs = await chrome.tabs.query({});
  let sent = 0;

  for (const tab of tabs) {
    if (tab.id === senderId) continue;
    try {
      await chrome.tabs.sendMessage(tab.id, payload);
      sent++;
    } catch (_) {}
  }

  console.log(TAG, `Broadcast to ${sent}/${tabs.length - 1} tabs`);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'LYRIC_UPDATE') {
    scraperTabId = sender.tab?.id ?? null;

    const payload = {
      type: 'LYRIC_UPDATE',
      html: message.html,
      text: message.text,
      translate: message.translate || null,
    };

    console.log(TAG, 'Received:', message.text?.slice(0, 30));

    chrome.storage.local.set({ currentLyric: payload });
    broadcastToOtherTabs(payload, scraperTabId);
    return;
  }

  if (message.type === 'GET_LYRIC') {
    chrome.storage.local.get('currentLyric', (result) => {
      sendResponse(result.currentLyric || { type: 'LYRIC_UPDATE', html: null, text: null, translate: null });
    });
    return true;
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId !== scraperTabId) return;

  console.log(TAG, 'Scraper tab closed');
  scraperTabId = null;

  const clearPayload = { type: 'LYRIC_UPDATE', html: null, text: null, translate: null };
  chrome.storage.local.set({ currentLyric: clearPayload });
  broadcastToOtherTabs(clearPayload, null);
});
