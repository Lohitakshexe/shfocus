chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "PAUSE_TIMER") {
        // Forward the message to the React App context
        window.postMessage({ type: 'PAUSE_TIMER', url: request.bannedUrl }, '*');
    }
});
