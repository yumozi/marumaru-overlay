/**
 * Overlay Content Script
 *
 * Renders a floating, text-only, fully click-through lyric line with furigana
 * and optional translation inside a Shadow DOM. All positioning is controlled
 * from the popup via arrow buttons — the overlay itself is non-interactive.
 */

(() => {
  'use strict';

  const TAG = '[Marumaru Overlay]';

  if (location.hostname.includes('marumaru-x.com')) return;

  console.log(TAG, 'Overlay injected on', location.hostname);

  // ---- Storage keys & defaults ------------------------------------------------

  const SK = {
    POS:        'overlayPosition',
    ENABLED:    'overlayEnabled',
    LYRIC_SIZE: 'overlayLyricSize',
    TRANS_SIZE: 'overlayTransSize',
    COLOR:      'overlayColor',
  };

  const DEFAULTS = {
    lyricSize: 22,
    transSize: 15,
    color: '#ffffff',
    leftPct: 50,
    topPct: 90,
  };

  // ---- Shadow DOM -------------------------------------------------------------

  const host = document.createElement('div');
  host.id = 'marumaru-lyrics-overlay-host';
  host.style.cssText = 'all:initial; position:fixed; z-index:2147483647; pointer-events:none;';
  document.documentElement.appendChild(host);

  const shadow = host.attachShadow({ mode: 'closed' });

  // ---- Styles -----------------------------------------------------------------

  const style = document.createElement('style');
  style.textContent = /* css */ `
    :host { all: initial; }

    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    .overlay {
      position: fixed;
      z-index: 2147483647;

      max-width: 95vw;
      white-space: nowrap;
      padding: 6px 14px;

      background: none;
      border: none;

      font-family: "Segoe UI", "Hiragino Sans", "Yu Gothic", "Meiryo", sans-serif;
      text-align: center;

      /* Fully click-through */
      pointer-events: none;
      user-select: none;

      transition: opacity 0.3s ease;
    }

    .overlay.hidden {
      opacity: 0;
    }

    .lyric-main {
      font-weight: 600;
      line-height: 1.8;
      letter-spacing: 0.02em;
    }

    .lyric-main ruby {
      ruby-align: center;
    }

    .lyric-main rt {
      font-size: 0.5em;
      font-weight: 400;
      opacity: 0.85;
    }

    .lyric-translate {
      margin-top: 2px;
      font-weight: 400;
      line-height: 1.4;
      opacity: 0.7;
    }

    .lyric-translate:empty {
      display: none;
    }
  `;

  // ---- Markup -----------------------------------------------------------------

  const overlay = document.createElement('div');
  overlay.classList.add('overlay', 'hidden');
  overlay.innerHTML = `
    <div class="lyric-main"></div>
    <div class="lyric-translate"></div>
  `;

  shadow.appendChild(style);
  shadow.appendChild(overlay);

  const elMain      = shadow.querySelector('.lyric-main');
  const elTranslate = shadow.querySelector('.lyric-translate');

  // ---- State ------------------------------------------------------------------

  let enabled   = true;
  let lyricSize = DEFAULTS.lyricSize;
  let transSize = DEFAULTS.transSize;
  let color     = DEFAULTS.color;

  function applyStyles() {
    elMain.style.fontSize = `${lyricSize}px`;
    elTranslate.style.fontSize = `${transSize}px`;

    overlay.style.color = color;
    overlay.style.textShadow = [
      '0 0 4px rgba(0,0,0,0.9)',
      '0 0 8px rgba(0,0,0,0.7)',
      '0 1px 3px rgba(0,0,0,0.9)',
      '0 0 14px rgba(0,0,0,0.5)',
    ].join(',');
  }

  // ---- Position ---------------------------------------------------------------

  /**
   * Position uses viewport percentages. leftPct is the center X of the overlay
   * (using left + translateX(-50%)), topPct is the top edge Y.
   */
  function applyPosition(leftPct, topPct) {
    overlay.style.left      = `${leftPct}vw`;
    overlay.style.top       = `${topPct}vh`;
    overlay.style.transform = 'translateX(-50%)';
  }

  // ---- Rendering --------------------------------------------------------------

  let lastHtml = null;

  function render(html, translate) {
    if (!enabled) {
      overlay.classList.add('hidden');
      return;
    }

    if (!html) {
      overlay.classList.add('hidden');
      lastHtml = null;
      return;
    }

    if (html !== lastHtml) {
      elMain.innerHTML = html;
      lastHtml = html;
    }
    elTranslate.textContent = translate || '';
    overlay.classList.remove('hidden');
  }

  // ---- Messaging --------------------------------------------------------------

  chrome.runtime.sendMessage({ type: 'GET_LYRIC' }, (response) => {
    if (chrome.runtime.lastError) {
      console.log(TAG, 'GET_LYRIC error:', chrome.runtime.lastError.message);
      return;
    }
    console.log(TAG, 'Hydrated with:', response?.text?.slice(0, 30) || '(empty)');
    if (response) render(response.html, response.translate);
  });

  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'LYRIC_UPDATE') {
      console.log(TAG, 'Received update:', message.text?.slice(0, 30) || '(empty)');
      render(message.html, message.translate);
    }
  });

  // ---- Storage listeners (popup controls) -------------------------------------

  chrome.storage.onChanged.addListener((changes) => {
    if (changes[SK.ENABLED]) {
      enabled = changes[SK.ENABLED].newValue !== false;
      if (!enabled) overlay.classList.add('hidden');
    }

    if (changes[SK.LYRIC_SIZE]) {
      lyricSize = changes[SK.LYRIC_SIZE].newValue || DEFAULTS.lyricSize;
      applyStyles();
    }

    if (changes[SK.TRANS_SIZE]) {
      transSize = changes[SK.TRANS_SIZE].newValue || DEFAULTS.transSize;
      applyStyles();
    }

    if (changes[SK.COLOR]) {
      color = changes[SK.COLOR].newValue || DEFAULTS.color;
      applyStyles();
    }

    if (changes[SK.POS]) {
      const pos = changes[SK.POS].newValue;
      if (pos && pos.leftPct != null) {
        applyPosition(pos.leftPct, pos.topPct);
      } else {
        applyPosition(DEFAULTS.leftPct, DEFAULTS.topPct);
      }
    }
  });

  // ---- Init -------------------------------------------------------------------

  chrome.storage.local.get([SK.ENABLED, SK.LYRIC_SIZE, SK.TRANS_SIZE, SK.COLOR, SK.POS], (r) => {
    enabled   = r[SK.ENABLED] !== false;
    lyricSize = r[SK.LYRIC_SIZE] || DEFAULTS.lyricSize;
    transSize = r[SK.TRANS_SIZE] || DEFAULTS.transSize;
    color     = r[SK.COLOR] || DEFAULTS.color;
    applyStyles();

    const pos = r[SK.POS];
    if (pos && pos.leftPct != null) {
      applyPosition(pos.leftPct, pos.topPct);
    } else {
      applyPosition(DEFAULTS.leftPct, DEFAULTS.topPct);
    }
  });
})();
