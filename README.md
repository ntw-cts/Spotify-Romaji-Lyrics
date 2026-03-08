# Spotify Romaji Lyrics

### **Pronunciation for Japanese lyrics on Spotify.**

This extension automatically detects **Japanese lyrics** on Spotify and injects **Romaji subtitles** directly underneath each line.

---

## 🚀 **Features**

* **Dual-Language Display:** See original Japanese text with Romaji subtitles simultaneously.
* **Smart Toggle:** Enable or disable Romaji instantly via the extension popup.
* **Instant Conversion:** Powered by `kuroshiro` for fast and accurate romanization.

---

## 🛠️ **Installation**

### **1. Download the Project**

Download a ZIP file from the [latest release](https://github.com/ntw-cts/Spotify-Romaji-Lyrics/releases/latest) and extract it to your computer.

### **2. Prepare the Extension**

Since this project uses **Webpack**, you must ensure the `dist` folder is built:

1. **Open your terminal** in the project folder.

> ⚠️ **Warning:** Before running `npm install`, you might need to run `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` in your terminal.

2. Run `npm install` (if you just downloaded it).
3. Run `npm run build` to generate the final extension files.

### **3. Load into Browser**

Choose the browser you want to use:

* **Microsoft Edge:** Go to `edge://extensions`
* **Google Chrome:** Go to `chrome://extensions`

**After reaching the extensions page:**

* **Switch on Developer mode** (usually a toggle in the top right or bottom left).
* Click the **Load unpacked** button.
* Select the **dist folder** inside your project directory.

---

## 📝 **Usage**

1. **Open Spotify Web Player.**
2. Click on the **Lyrics** (microphone icon) for a Japanese song.
3. Click the **Spotify Romaji Lyrics** icon in your browser toolbar.
4. Toggle **Enable Romaji** to **"ON"**.



