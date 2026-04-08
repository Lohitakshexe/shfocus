// Firebase Realtime Database REST endpoint for banned sites
// No server needed — directly reads from Firebase!
const FIREBASE_URL = "https://sh-backend-a0f3c-default-rtdb.asia-southeast1.firebasedatabase.app";

let bannedSites = [];

const fetchBannedSites = async () => {
  try {
    const res = await fetch(`${FIREBASE_URL}/banned-sites.json`);
    const data = await res.json();
    if (data) {
      bannedSites = Object.values(data).map(site => site.url.toLowerCase());
    } else {
      bannedSites = [];
    }
  } catch (e) {
    console.error("Failed to fetch banned sites from Firebase", e);
  }
};

// Fetch initially and refresh every 30 seconds
fetchBannedSites();
setInterval(fetchBannedSites, 30000);

const checkTab = (tab) => {
  if (!tab.url) return;
  const url = tab.url.toLowerCase();
  
  const isBanned = bannedSites.some(banned => url.includes(banned));
  
  if (isBanned) {
    chrome.tabs.query({}, (tabs) => {
      const appTabs = tabs.filter(t => t.url && (
        t.url.includes("localhost:5173") || 
        t.url.includes("localhost:4173") ||
        t.url.includes("shfocus") // your future deployed domain
      ));
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

// Listen when URL updates in active tab
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab.active && changeInfo.url) {
    checkTab(tab);
  }
});
