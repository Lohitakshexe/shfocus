let bannedSites = [];

const fetchBannedSites = async () => {
  try {
    const res = await fetch('http://localhost:3000/banned-sites');
    const data = await res.json();
    bannedSites = data.map(site => site.url.toLowerCase());
  } catch (e) {
    console.error("Failed to fetch banned sites", e);
  }
};

// Fetch initially and then every 30 seconds
fetchBannedSites();
setInterval(fetchBannedSites, 30000);

const checkTab = (tab) => {
  if (!tab.url) return;
  const url = tab.url.toLowerCase();
  
  // Check if current url matches any banned site
  const isBanned = bannedSites.some(banned => url.includes(banned));
  
  if (isBanned) {
    // We found a distraction! Find the Web App tab and notify it.
    chrome.tabs.query({}, (tabs) => {
      const appTabs = tabs.filter(t => t.url && (t.url.includes("localhost:5173") || t.url.includes("localhost:3000")));
      appTabs.forEach(appTab => {
        chrome.tabs.sendMessage(appTab.id, {
          action: "PAUSE_TIMER",
          bannedUrl: url
        }).catch(err => console.log("Could not send to tab", err));
      });
    });
  }
};

// Listen when active tab changes
chrome.tabs.onActivated.addListener(activeInfo => {
  chrome.tabs.get(activeInfo.tabId, tab => checkTab(tab));
});

// Listen when URL updates in the active tab
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab.active && changeInfo.url) {
    checkTab(tab);
  }
});
