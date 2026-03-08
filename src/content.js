import Kuroshiro from "kuroshiro";
import KuromojiAnalyzer from "kuroshiro-analyzer-kuromoji";

let kuroshiro;
let isReady = false;
let romajiEnabled = false;

// 1. Initialize the library
async function initKuroshiro() {
  kuroshiro = new Kuroshiro();
  // The dictPath must point to local dictionary files bundled with your extension
  await kuroshiro.init(new KuromojiAnalyzer({ dictPath: chrome.runtime.getURL("dict/") }));
  isReady = true;
  console.log("Kuroshiro is ready!");
  processLyrics();
}

// 2. Check stored preference on load
chrome.storage.local.get(['romajiEnabled'], (result) => {
  romajiEnabled = !!result.romajiEnabled;
  initKuroshiro();
});

// 3. Listen for toggle from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "toggleRomaji") {
    console.log("Message received! Romaji enabled:", request.enabled);
    
    // Update our global variable
    romajiEnabled = request.enabled;
    
    // Save to storage so it remembers your choice if you refresh the page
    chrome.storage.local.set({ romajiEnabled: romajiEnabled });

    // Tell the watchdog function to process the screen immediately
    processLyrics();
  }
});

// 4. Process the Lyrics on the page (The Watchdog logic)
async function processLyrics() {
  if (!isReady) return;

  // Select all possible lyric lines
  const lyricElements = document.querySelectorAll('[data-testid="lyrics-line"], [data-testid="lyrics-text"], .lyrics-lyricsContent-text');

  for (let el of lyricElements) {
    // 1. Check if our custom HTML is currently inside this line
    const hasOurHTML = el.querySelector('.romaji-subtitle') !== null;
      
    // 2. Save the original text safely
    if (!el.hasAttribute('data-original-text')) {
      // ONLY save it if it's pure Spotify text. If it has our HTML, reading textContent
      // would mash the Japanese and Romaji together into a single word!
      if (!hasOurHTML) {
        const textToSave = el.textContent.trim();
        if (textToSave && textToSave !== "♪") {
          el.setAttribute('data-original-text', textToSave);
        }
      }
    }

    const originalText = el.getAttribute('data-original-text');
    
    // Skip if we couldn't grab any valid text
    if (!originalText) continue;

    if (romajiEnabled) {
      // If Romaji is ON, but this line doesn't have our HTML yet, and isn't currently being processed
      if (!hasOurHTML && el.getAttribute('data-processing') !== 'true') {
        
        const hasJapanese = /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf]/.test(originalText);
        
        if (hasJapanese) {
          // Lock this line so the watchdog doesn't trigger 50 translations for the same line
          el.setAttribute('data-processing', 'true'); 
          
          try {
            const romaji = await kuroshiro.convert(originalText, { to: "romaji", mode: "spaced" });
            
            // Before injecting, double-check that the user didn't toggle it off while we were translating!
            if (romajiEnabled) {
                el.innerHTML = `
                  <span class="original-lyric" style="display: block;">${originalText}</span>
                  <span class="romaji-subtitle" style="display: block; font-size: 0.65em; opacity: 0.75; margin-top: 4px; line-height: 1.2;">${romaji}</span>
                `;
            }
            el.setAttribute('data-romanized', 'true');
          } catch (error) {
            console.error("Translation error:", error);
            el.removeAttribute('data-romanized'); 
          } finally {
            // Unlock the line
            el.removeAttribute('data-processing'); 
          }
        } else {
          el.setAttribute('data-romanized', 'true');
        }
      }
    } 
    else {
      // If Romaji is OFF, revert everything!
      // If it has our HTML, or if it's marked as romanized, blow it away and restore the original.
      if (hasOurHTML || el.getAttribute('data-romanized') === 'true') {
        el.textContent = originalText;
        el.setAttribute('data-romanized', 'false');
      }
    }
  }
}

// 5. Watch the DOM for scrolling/changing lyrics
const observer = new MutationObserver(() => {
  processLyrics();
});

// Start observing the body for injected dynamic lyrics containers
observer.observe(document.body, { childList: true, subtree: true, characterData: true });