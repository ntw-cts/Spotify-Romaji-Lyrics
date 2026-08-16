import Kuroshiro from "kuroshiro";
import KuromojiAnalyzer from "kuroshiro-analyzer-kuromoji";

let kuroshiro;
let isReady = false;
let romajiEnabled = false;

// Remembers conversions we've already done, so scrolling a line
// out of view and back (or replaying a song) doesn't redo the work.
const romajiCache = new Map();

// 1. Initialize the library
async function initKuroshiro() {
  kuroshiro = new Kuroshiro();
  try {
    // The dictPath must point to local dictionary files bundled with your extension
    await kuroshiro.init(new KuromojiAnalyzer({ dictPath: chrome.runtime.getURL("dict/") }));
    isReady = true;
    console.log("Kuroshiro is ready!");
    processLyrics();
  } catch (error) {
    console.error("Spotify Romaji Lyrics: failed to load the dictionary, extension will not work.", error);
  }
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

// Builds the two-line "original + romaji" block without using innerHTML,
// so we never accidentally break on stray characters in the lyric text.
function renderRomajiBlock(el, originalText, romaji) {
  el.textContent = ""; // clear existing content safely

  const originalSpan = document.createElement('span');
  originalSpan.className = 'original-lyric';
  originalSpan.style.display = 'block';
  originalSpan.textContent = originalText;

  const romajiSpan = document.createElement('span');
  romajiSpan.className = 'romaji-subtitle';
  romajiSpan.style.cssText = 'display: block; font-size: 0.65em; opacity: 0.75; margin-top: 4px; line-height: 1.2;';
  romajiSpan.textContent = romaji;

  el.appendChild(originalSpan);
  el.appendChild(romajiSpan);
}

// Converts one line, using the cache if we've already done this exact text before.
async function convertLine(el, originalText) {
  el.setAttribute('data-processing', 'true');
  try {
    let romaji = romajiCache.get(originalText);
    if (romaji === undefined) {
      romaji = await kuroshiro.convert(originalText, { to: "romaji", mode: "spaced" });
      romajiCache.set(originalText, romaji);
    }

    // Double-check the user didn't toggle it off while we were converting
    if (romajiEnabled) {
      renderRomajiBlock(el, originalText, romaji);
      el.setAttribute('data-romanized', 'true');
    }
  } catch (error) {
    console.error("Translation error:", error);
    el.removeAttribute('data-romanized');
  } finally {
    el.removeAttribute('data-processing');
  }
}

// 4. Process the Lyrics on the page (The Watchdog logic)
function processLyrics() {
  if (!isReady) return;

  // Select all possible lyric lines
  const lyricElements = document.querySelectorAll('[data-testid="lyrics-line"], [data-testid="lyrics-text"], .lyrics-lyricsContent-text');

  const conversionsToRun = [];

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
          // Collect it instead of awaiting here, so all lines convert in parallel
          conversionsToRun.push(convertLine(el, originalText));
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

  // Fire all conversions concurrently instead of one-at-a-time
  if (conversionsToRun.length) {
    Promise.all(conversionsToRun);
  }
}

// 5. Watch the DOM for scrolling/changing lyrics
// Spotify's own lyric-highlight animation fires DOM mutations constantly during
// playback, so we wait for a short quiet period before actually re-scanning.
let debounceTimer = null;
const observer = new MutationObserver(() => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(processLyrics, 120);
});

// Start observing the body for injected dynamic lyrics containers
observer.observe(document.body, { childList: true, subtree: true, characterData: true });