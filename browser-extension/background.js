// background.js
const API_BASE_URL = 'https://flow-rust-two.vercel.app'; // Your Vercel URL

// Listen for extension installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('Flow extension installed');
  
  // Create context menu
  chrome.contextMenus.create({
    id: 'ask-flow',
    title: 'Ask Flow about this',
    contexts: ['page', 'selection', 'link']
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'ask-flow') {
    const selectedText = info.selectionText || info.linkUrl || info.pageUrl;
    
    // Store the selection and open popup
    chrome.storage.local.set({ 
      pendingQuery: {
        text: selectedText,
        url: tab.url,
        title: tab.title
      }
    }, () => {
      chrome.action.openPopup();
    });
  }
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'PAGE_ANALYSIS') {
    // Send page data to your backend
    analyzePage(request.data, sender.tab.id);
    sendResponse({ received: true });
  }
  return true;
});

// Function to send page data to backend
async function analyzePage(pageData, tabId) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/analyze-page`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'your-api-key' // Store securely
      },
      body: JSON.stringify({
        url: pageData.url,
        title: pageData.title,
        content: pageData.content,
        timestamp: new Date().toISOString()
      })
    });

    const result = await response.json();
    
    // Show notification if competitor detected
    if (result.isCompetitor) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'Competitor Detected',
        message: `Flow detected ${result.competitorName}. Click for insights.`,
        priority: 2
      });
      
      // Store competitor data
      chrome.storage.local.set({ lastCompetitor: result });
    }
  } catch (error) {
    console.error('Error analyzing page:', error);
  }
}
