(() => {
  'use strict';

  function ensureArtworkStyles() {
    if (document.getElementById('grizzly-podcast-artwork-fix')) return;
    const style = document.createElement('style');
    style.id = 'grizzly-podcast-artwork-fix';
    style.textContent = `
      .podcast-art {
        overflow: hidden !important;
      }
      .podcast-artwork-image {
        display: block !important;
        width: 100% !important;
        height: 100% !important;
        max-width: 100% !important;
        max-height: 100% !important;
        object-fit: contain !important;
        object-position: center !important;
        box-sizing: border-box !important;
      }
    `;
    document.head.appendChild(style);
  }

  function artworkFor(podcast = {}) {
    const title = String(podcast.title || 'Podcast').trim() || 'Podcast';
    const src = typeof podcast.artwork === 'string' ? podcast.artwork.trim() : '';
    return { src, alt: `${title} podcast cover`, fallback: '🎙️' };
  }

  function applyArtworkFallback(image) {
    if (!image) return false;
    image.hidden = true;
    image.parentElement?.classList.add('is-fallback');
    return true;
  }

  if (typeof document !== 'undefined') ensureArtworkStyles();

  const api = { artworkFor, applyArtworkFallback };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.GrizzlyJohnPodcastArtwork = api;
})();
