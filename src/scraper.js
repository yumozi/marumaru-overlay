/**
 * Scraper Content Script
 *
 * Runs only on marumaru-x.com song pages. Watches for the currently active
 * lyric line and broadcasts updates to the background service worker.
 *
 * Sends ruby-annotated HTML for furigana and optionally the translation
 * if the user has enabled it on the site.
 */

(() => {
  'use strict';

  const TAG = '[Marumaru Overlay]';
  const POLL_INTERVAL = 350;

  let lastSentKey = null;

  /** Allowed tags for lyric HTML (ruby annotations only). */
  const ALLOWED_TAGS = new Set(['ruby', 'rb', 'rt', 'rp']);

  /**
   * Sanitize HTML to only keep ruby-related tags.
   */
  function sanitizeRubyHtml(el) {
    let html = '';

    for (const node of el.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        html += escapeHtml(node.textContent);
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const tag = node.tagName.toLowerCase();
        if (ALLOWED_TAGS.has(tag)) {
          html += `<${tag}>${sanitizeRubyHtml(node)}</${tag}>`;
        } else {
          html += sanitizeRubyHtml(node);
        }
      }
    }

    return html;
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function extractPlainText(el) {
    const clone = el.cloneNode(true);
    clone.querySelectorAll('rt').forEach((rt) => rt.remove());
    return clone.textContent.trim();
  }

  /**
   * Get lyric data from a lyrics <li> element.
   * Includes translation if the site is showing it (display !== none).
   */
  function getLyricData(li) {
    const source = li.querySelector('p.lyrics-source');
    if (!source) return null;

    const html = sanitizeRubyHtml(source);
    const text = extractPlainText(source);
    if (!text) return null;

    // Check if translation is visible.
    let translate = null;
    const translateEl = li.querySelector('p.lyrics-translate');
    if (translateEl && translateEl.offsetParent !== null) {
      const t = translateEl.textContent.trim();
      if (t) translate = t;
    }

    return { html, text, translate };
  }

  // ---------------------------------------------------------------------------
  // Broadcast
  // ---------------------------------------------------------------------------

  let dead = false;

  function send(msg) {
    try {
      chrome.runtime.sendMessage(msg);
    } catch (_) {
      dead = true;
    }
  }

  function broadcastLyric() {
    if (dead) return;

    const active = document.querySelector('li.mr-lyrics-list.active');

    if (!active) {
      if (lastSentKey !== null) {
        lastSentKey = null;
        send({ type: 'LYRIC_UPDATE', html: null, text: null, translate: null });
      }
      return;
    }

    const data = getLyricData(active);
    if (!data) return;

    // Dedup by html + translate combo.
    const key = data.html + '|' + (data.translate || '');
    if (key === lastSentKey) return;
    lastSentKey = key;

    console.log(TAG, data.text, data.translate ? `(${data.translate})` : '');
    send({ type: 'LYRIC_UPDATE', html: data.html, text: data.text, translate: data.translate });
  }

  // ---------------------------------------------------------------------------
  // Init
  // ---------------------------------------------------------------------------

  function init() {
    const container = document.getElementById('lyrics-list') || document.body;

    console.log(TAG, 'Scraper active. Container:', container.tagName, container.id || '(body)');

    const observer = new MutationObserver(() => broadcastLyric());
    observer.observe(container, {
      attributes: true,
      attributeFilter: ['class'],
      subtree: true,
      childList: true,
    });

    setInterval(broadcastLyric, POLL_INTERVAL);
    broadcastLyric();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
