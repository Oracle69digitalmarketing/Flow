/**
 * FLOW Browser Extension - Background Script
 */

const API_BASE = 'https://ais-dev-rlp4mi36mfpglv35hnby4z-94089556651.europe-west1.run.app'; // This will be updated dynamically in a real build

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'ask-flow',
    title: 'Ask Flow about this',
    contexts: ['selection', 'link', 'page']
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'ask-flow') {
    const selectedText = info.selectionText || info.linkUrl || info.pageUrl;
    // In a real extension, this would open a popup or inject a content script
    console.log('Flow Query:', selectedText);
  }
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'queryFlow') {
    fetch(`${API_BASE}/api/ai/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: request.query,
        userId: 'user_1',
        platform: 'browser_extension'
      })
    })
    .then(res => res.json())
    .then(data => sendResponse(data))
    .catch(err => {
      console.error('Flow query failed', err);
      sendResponse({ error: 'Failed to reach Flow' });
    });
    
    return true; // Keep message channel open for async response
  }
});

// Track page visits
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const isCompetitor = tab.url.includes('competitor') || tab.url.includes('g2.com');
    
    fetch(`${API_BASE}/api/browser/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: tab.url,
        title: tab.title,
        isCompetitor,
        userId: 'user_1'
      })
    }).catch(err => console.error('Flow tracking failed', err));
  }
});
