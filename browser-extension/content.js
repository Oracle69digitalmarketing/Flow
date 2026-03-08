/**
 * FLOW Browser Extension - Content Script
 */

let flowButton = null;
let flowOverlay = null;

// Listen for text selection
document.addEventListener('mouseup', (event) => {
  const selection = window.getSelection().toString().trim();
  
  if (selection && selection.length > 5) {
    showFlowButton(event.pageX, event.pageY, selection);
  } else {
    hideFlowButton();
  }
});

function showFlowButton(x, y, text) {
  if (!flowButton) {
    flowButton = document.createElement('button');
    flowButton.id = 'flow-floating-button';
    flowButton.innerHTML = '⚡ Ask Flow';
    document.body.appendChild(flowButton);
    
    flowButton.addEventListener('click', () => {
      askFlow(text);
      hideFlowButton();
    });
  }
  
  flowButton.style.display = 'block';
  flowButton.style.left = `${x + 10}px`;
  flowButton.style.top = `${y - 40}px`;
}

function hideFlowButton() {
  if (flowButton) {
    flowButton.style.display = 'none';
  }
}

async function askFlow(query) {
  showOverlay('Thinking...', true);
  
  chrome.runtime.sendMessage({ action: 'queryFlow', query }, (response) => {
    if (response && response.text) {
      showOverlay(response.text, false);
    } else {
      showOverlay('Sorry, I couldn\'t reach Flow right now.', false);
    }
  });
}

function showOverlay(content, isThinking) {
  if (!flowOverlay) {
    flowOverlay = document.createElement('div');
    flowOverlay.id = 'flow-intelligence-overlay';
    document.body.appendChild(flowOverlay);
  }
  
  flowOverlay.innerHTML = `
    <div class="flow-overlay-header">
      <span class="flow-overlay-title">⚡ FLOW Intelligence</span>
      <button id="flow-overlay-close">✕</button>
    </div>
    <div class="flow-overlay-content">
      ${isThinking ? '<div class="flow-loader"></div>' : `<div class="flow-markdown">${content}</div>`}
    </div>
    ${!isThinking ? `
      <div class="flow-overlay-footer">
        <button class="flow-action-btn primary">Add to Deal</button>
        <button class="flow-action-btn secondary">Draft Email</button>
      </div>
    ` : ''}
  `;
  
  flowOverlay.style.display = 'flex';
  
  document.getElementById('flow-overlay-close').addEventListener('click', () => {
    flowOverlay.style.display = 'none';
  });
}
