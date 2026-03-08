document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('romajiToggle');

  // Load the saved state
  chrome.storage.local.get(['romajiEnabled'], (result) => {
    toggle.checked = !!result.romajiEnabled;
  });

  // Listen for toggle changes
  toggle.addEventListener('change', () => {
    const isEnabled = toggle.checked;
    
    // Save state
    chrome.storage.local.set({ romajiEnabled: isEnabled });

    // Send a message to the active Spotify tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      // Look for just "spotify.com" to avoid any URL scrambling issues
      if (tabs[0].url.includes("spotify.com")) {
        console.log("Sending toggle message to Spotify..."); 
        chrome.tabs.sendMessage(tabs[0].id, { action: "toggleRomaji", enabled: isEnabled });
      } else {
        console.log("Not a Spotify tab! URL is:", tabs[0].url);
      }
    });
  });
});