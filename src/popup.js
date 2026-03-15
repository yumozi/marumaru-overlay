/**
 * Popup Script
 *
 * Controls overlay toggle, lyric/translation font sizes, text color,
 * and position via arrow buttons.
 */

(() => {
  'use strict';

  const DEFAULTS = {
    lyricSize: 22,
    transSize: 15,
    color: '#ffffff',
    leftPct: 50,
    topPct: 90,
  };

  const MIN_SIZE = 10;
  const MAX_SIZE = 60;
  const STEP = 1;
  const POS_STEP = 2; // viewport % per arrow click

  // ---- Elements ---------------------------------------------------------------

  const toggle     = document.getElementById('toggle');
  const resetBtn   = document.getElementById('reset-pos');
  const status     = document.getElementById('status');

  const lyricValue = document.getElementById('lyric-value');
  const lyricDown  = document.getElementById('lyric-down');
  const lyricUp    = document.getElementById('lyric-up');

  const transValue = document.getElementById('trans-value');
  const transDown  = document.getElementById('trans-down');
  const transUp    = document.getElementById('trans-up');

  const colorPick  = document.getElementById('color-pick');

  const posUp    = document.getElementById('pos-up');
  const posDown  = document.getElementById('pos-down');
  const posLeft  = document.getElementById('pos-left');
  const posRight = document.getElementById('pos-right');

  let lyricSize = DEFAULTS.lyricSize;
  let transSize = DEFAULTS.transSize;
  let leftPct   = DEFAULTS.leftPct;
  let topPct    = DEFAULTS.topPct;

  // ---- Hydrate ----------------------------------------------------------------

  chrome.storage.local.get(
    ['overlayEnabled', 'overlayLyricSize', 'overlayTransSize', 'overlayColor', 'overlayPosition', 'currentLyric'],
    (r) => {
      toggle.checked = r.overlayEnabled !== false;

      lyricSize = r.overlayLyricSize || DEFAULTS.lyricSize;
      lyricValue.textContent = lyricSize;

      transSize = r.overlayTransSize || DEFAULTS.transSize;
      transValue.textContent = transSize;

      colorPick.value = r.overlayColor || DEFAULTS.color;

      const pos = r.overlayPosition;
      if (pos && pos.leftPct != null) {
        leftPct = pos.leftPct;
        topPct  = pos.topPct;
      }

      updateStatus(r.currentLyric);
    }
  );

  // ---- Toggle -----------------------------------------------------------------

  toggle.addEventListener('change', () => {
    chrome.storage.local.set({ overlayEnabled: toggle.checked });
  });

  // ---- Lyric font size --------------------------------------------------------

  function setLyricSize(v) {
    lyricSize = Math.max(MIN_SIZE, Math.min(MAX_SIZE, v));
    lyricValue.textContent = lyricSize;
    chrome.storage.local.set({ overlayLyricSize: lyricSize });
  }

  lyricDown.addEventListener('click', () => setLyricSize(lyricSize - STEP));
  lyricUp.addEventListener('click', () => setLyricSize(lyricSize + STEP));

  // ---- Translation font size --------------------------------------------------

  function setTransSize(v) {
    transSize = Math.max(MIN_SIZE, Math.min(MAX_SIZE, v));
    transValue.textContent = transSize;
    chrome.storage.local.set({ overlayTransSize: transSize });
  }

  transDown.addEventListener('click', () => setTransSize(transSize - STEP));
  transUp.addEventListener('click', () => setTransSize(transSize + STEP));

  // ---- Color ------------------------------------------------------------------

  colorPick.addEventListener('input', () => {
    chrome.storage.local.set({ overlayColor: colorPick.value });
  });

  // ---- Position arrows --------------------------------------------------------

  function movePos(dx, dy) {
    leftPct = Math.max(0, Math.min(100, leftPct + dx));
    topPct  = Math.max(0, Math.min(100, topPct + dy));
    chrome.storage.local.set({ overlayPosition: { leftPct, topPct } });
  }

  posUp.addEventListener('click',    () => movePos(0, -POS_STEP));
  posDown.addEventListener('click',  () => movePos(0, POS_STEP));
  posLeft.addEventListener('click',  () => movePos(-POS_STEP, 0));
  posRight.addEventListener('click', () => movePos(POS_STEP, 0));

  // ---- Reset position ---------------------------------------------------------

  resetBtn.addEventListener('click', () => {
    leftPct = DEFAULTS.leftPct;
    topPct  = DEFAULTS.topPct;
    chrome.storage.local.set({ overlayPosition: { leftPct, topPct } });
    resetBtn.textContent = 'Position reset!';
    setTimeout(() => { resetBtn.textContent = 'Reset position'; }, 1200);
  });

  // ---- Status -----------------------------------------------------------------

  function updateStatus(lyric) {
    if (lyric && lyric.text) {
      const preview = lyric.text.length > 30
        ? lyric.text.slice(0, 30) + '\u2026'
        : lyric.text;
      status.textContent = '\u266A ' + preview;
    } else {
      status.textContent = 'Waiting for lyrics\u2026';
    }
  }

  chrome.storage.onChanged.addListener((changes) => {
    if (changes.currentLyric) updateStatus(changes.currentLyric.newValue);
  });
})();
