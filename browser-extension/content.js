// content.js
// List of competitor domains (you can fetch this from backend)
const COMPETITOR_DOMAINS = [
  'competitor1.com',
  'competitor2.com',
  'competitor3.com'
];

// Check if current page is a competitor
function checkIfCompetitor() {
  const url = window.location.hostname;
  return COMPETITOR_DOMAINS.some(domain => url.includes(domain));
}

// Extract page content
function extractPageContent() {
  // Get main content - remove scripts, styles, etc.
  const mainContent = document.body.innerText || '';
  
  // Get meta information
  const metaDescription = document.querySelector('meta[name="description"]')?.content || '';
  const metaKeywords = document.querySelector('meta[name="keywords"]')?.content || '';
  
  return {
    url: window.location.href,
    title: document.title,
    content: mainContent.substring(0, 5000), // Limit size
    metaDescription,
    metaKeywords,
    isCompetitor: checkIfCompetitor()
  };
}

// Send page data when page loads
window.addEventListener('load', () => {
  const pageData = extractPageContent();
  
  // Send to background script
  chrome.runtime.sendMessage({
    type: 'PAGE_ANALYSIS',
    data: pageData
  });
});

// Listen for messages from popup or background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getPageData') {
    sendResponse(extractPageContent());
  }
  
  if (request.action === 'highlightCompetitors') {
    // Add visual indicator that competitor detected
    const indicator = document.createElement('div');
    indicator.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: #ff4444;
      color: white;
      padding: 8px 16px;
      border-radius: 20px;
      z-index: 10000;
      font-family: Arial, sans-serif;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    `;
    indicator.textContent = '🔍 Competitor detected - Ask Flow';
    indicator.onclick = () => chrome.runtime.sendMessage({ action: 'openPopup' });
    document.body.appendChild(indicator);
    
    // Auto-remove after 10 seconds
    setTimeout(() => indicator.remove(), 10000);
  }
});
