# Marumaru Lyrics Overlay

A Chrome extension that scrapes the currently playing lyric line from [marumaru-x.com](https://www.marumaru-x.com/) and displays it as a floating, click-through overlay on every other tab — so you can read along while working, browsing, or studying.

![Chrome](https://img.shields.io/badge/Chrome-Manifest_V3-blue)
![License](https://img.shields.io/badge/License-MIT-green)

## How It Works

[marumaru-x.com](https://www.marumaru-x.com/) is a Japanese-language learning site that plays music videos with synced lyrics. As a song plays, the active lyric line is highlighted in real time.

This extension:

1. **Scrapes** the highlighted lyric (with furigana) from the marumaru song page.
2. **Relays** it through a background service worker.
3. **Displays** it as a floating text overlay on every other tab.

```
┌──────────────┐     LYRIC_UPDATE     ┌──────────────┐     LYRIC_UPDATE     ┌──────────────┐
│  marumaru-x   │ ──────────────────► │  background   │ ──────────────────► │  any other    │
│  (scraper.js) │                     │  (service wkr)│                     │  tab (overlay)│
└──────────────┘                      └──────────────┘                      └──────────────┘
```

## Features

- **Real-time lyrics** — polls the active lyric line and pushes updates instantly.
- **Furigana (ruby annotations)** — kanji readings are preserved and displayed above the text, matching the source site.
- **Translation support** — if translation is enabled on marumaru-x.com, it appears below the lyric line.
- **Click-through overlay** — the overlay is fully non-interactive and doesn't block clicks on the page beneath it.
- **Shadow DOM** — overlay styles are fully isolated from host pages.
- **Popup controls:**
  - Toggle overlay on/off
  - Separate font size controls for lyrics and translation
  - Text color picker
  - D-pad arrow buttons for positioning
  - Position reset
- **Viewport-relative positioning** — overlay position adapts to window resize and zoom changes.
- **Auto-hide** — overlay disappears when no lyrics are playing or the lyrics tab is closed.
- **Zero dependencies** — vanilla JS, no build step, no frameworks.

## Installation

1. Clone or download this repository:
   ```bash
   git clone https://github.com/your-username/marumaru-overlay.git
   ```

2. Open Chrome and navigate to `chrome://extensions/`.

3. Enable **Developer mode** (toggle in the top-right corner).

4. Click **Load unpacked** and select the `marumaru-overlay` folder.

5. The extension icon should appear in your toolbar.

## Usage

1. Navigate to any song page on [marumaru-x.com](https://www.marumaru-x.com/japanese-song/) and start playing.

2. Switch to any other tab — you'll see the current lyric line floating on screen with furigana annotations.

3. Use the **popup** (click the extension icon) to:
   - Toggle the overlay on/off
   - Adjust lyrics and translation font sizes independently
   - Change the text color
   - Move the overlay with the arrow buttons
   - Reset position to center-bottom

4. Optionally enable translation on the marumaru site — the translation will automatically appear below the lyric line.

## Project Structure

```
marumaru-overlay/
├── manifest.json          # Chrome MV3 manifest
├── src/
│   ├── scraper.js         # Content script — marumaru-x.com only
│   ├── background.js      # Service worker — message relay & storage
│   ├── overlay.js         # Content script — all other tabs
│   ├── popup.html         # Extension popup UI
│   └── popup.js           # Popup logic
├── icons/
│   ├── icon-16.png
│   ├── icon-48.png
│   ├── icon-128.png
│   └── generate-icons.html  # Open in browser to regenerate icons
├── LICENSE
└── README.md
```

## Architecture

### scraper.js

Runs only on `*://www.marumaru-x.com/japanese-song/play-*`. Uses a `MutationObserver` + polling fallback (350 ms) to detect when the `active` class moves to a new `<li class="mr-lyrics-list">`. Extracts the ruby-annotated HTML from `p.lyrics-source` (sanitized to only allow `ruby`/`rb`/`rt`/`rp` tags) and the translation text from `p.lyrics-translate` if visible. Sends `LYRIC_UPDATE` messages to the background worker.

### background.js

Service worker that relays `LYRIC_UPDATE` from the scraper to all other tabs. Persists the latest lyric in `chrome.storage.local` so newly opened tabs can hydrate immediately via `GET_LYRIC`. Clears the lyric when the scraper tab closes.

### overlay.js

Injected on `<all_urls>` but skips `marumaru-x.com`. Creates a fully click-through Shadow DOM overlay that renders lyrics with furigana (`innerHTML` with ruby markup) and optional translation. Position is controlled entirely from the popup using viewport-relative units (`vw`/`vh`) so it adapts to zoom and resize. Listens for live messages and storage changes for all popup controls.

## Permissions

| Permission | Why |
|---|---|
| `storage` | Persist overlay position, font sizes, color, toggle state, and current lyric. |
| `tabs` | Broadcast lyrics to all open tabs and detect tab removal. |
| `host_permissions: *://www.marumaru-x.com/*` | Allow the scraper content script to run on the lyrics site. |

## Customization

All appearance settings are adjustable from the popup:

- **Lyrics font size** — default 22px (range 10–60)
- **Translation font size** — default 15px (range 10–60)
- **Text color** — any color via the color picker (default white)
- **Position** — arrow buttons move by 2% of viewport per click

For deeper customization, edit the CSS inside `overlay.js` (the `style.textContent` block in the Shadow DOM).

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

[MIT](LICENSE)
