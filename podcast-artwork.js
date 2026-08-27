(() => {
  'use strict';

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

  const api = { artworkFor, applyArtworkFallback };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.GrizzlyJohnPodcastArtwork = api;
})();
