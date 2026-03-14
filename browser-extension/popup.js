document.addEventListener('DOMContentLoaded', async () => {
  // Get current tab info
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  // Display current page
  document.getElementById('currentPage').innerHTML = `
    <strong>Current page:</strong><br>
    ${tab.title}<br>
    <small>${tab.url}</small>
  `;
  
  // Get page data from content script
  try {
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'getPageData' });
    
    if (response && response.isCompetitor) {
      document.getElementById('competitorAlert').style.display = 'block';
      
      // Check if we have insights stored
      chrome.storage.local.get(['lastCompetitor'], (result) => {
        if (result.lastCompetitor && result.lastCompetitor.url === response.url) {
          document.getElementById('insights').style.display = 'block';
          document.getElementById('insightText').textContent = 
            result.lastCompetitor.insights || 'Competitor analysis available';
        }
      });
    }
  } catch (error) {
    console.log('Could not get page data:', error);
  }
  
  // Handle Ask Flow button
  document.getElementById('askFlowBtn').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Send to background for processing
    chrome.runtime.sendMessage({
      action: 'queryFlow',
      tabId: tab.id,
      url: tab.url,
      title: tab.title
    }, (response) => {
      if (response && response.insights) {
        document.getElementById('insights').style.display = 'block';
        document.getElementById('insightText').textContent = response.insights;
      }
    });
  });
  
  // Handle Generate Battlecard button
  document.getElementById('generateBattlecard').addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'generateBattlecard' });
    window.close(); // Close popup after action
  });
});
