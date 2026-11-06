/*
 * Animated emoji loader.
 * Animations: Google Noto Animated Emoji (CC BY 4.0), rendered with lottie-web (MIT).
 *
 *   <span class="emoji" data-emoji="1f680" data-fallback="🚀" aria-hidden="true"></span>
 *
 *   AnimatedEmoji.scan(root)               animate every [data-emoji] under root (default: document); runs once on load
 *   AnimatedEmoji.set(el, code, fallback)  put another animation into el (frees the previous one); code '' clears it
 *
 * - Needs vendor/lottie_light.min.js loaded first. Works from any page depth: files are found relative to this script.
 * - Plays only while visible; shows a still frame when the user prefers reduced motion.
 * - If the animation can't load (e.g. page opened via file://), the fallback character is shown.
 */
(function () {
  'use strict';

  var ROOT = new URL('../', document.currentScript.src).href;   // this file lives in <root>/js/
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var io = 'IntersectionObserver' in window
    ? new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          var anim = entry.target._anim;
          if (!anim) return;
          if (entry.isIntersecting) anim.play(); else anim.pause();
        });
      })
    : null;

  function free(el) {
    if (el._anim) {
      if (io) io.unobserve(el);
      try { el._anim.destroy(); } catch (e) { /* already gone */ }
      el._anim = null;
    }
  }

  function showFallback(el) {
    free(el);
    el.textContent = el.getAttribute('data-fallback') || '';
  }

  function start(el) {
    free(el);
    var code = el.getAttribute('data-emoji');
    el.textContent = '';
    if (!code) return;
    if (!window.lottie) { showFallback(el); return; }
    var anim = window.lottie.loadAnimation({
      container: el,
      renderer: 'svg',
      loop: true,
      autoplay: false,
      path: ROOT + 'imgs/emoji/' + code + '.json'
    });
    el._anim = anim;
    anim.addEventListener('DOMLoaded', function () {
      if (reduce) {
        anim.goToAndStop(Math.floor(anim.totalFrames * 0.5), true);
      } else if (io) {
        io.observe(el);
      } else {
        anim.play();
      }
    });
    anim.addEventListener('data_failed', function () { showFallback(el); });
  }

  function scan(root) {
    Array.prototype.forEach.call((root || document).querySelectorAll('[data-emoji]'), function (el) {
      if (el._emojiStarted) return;
      el._emojiStarted = true;
      start(el);
    });
  }

  function set(el, code, fallback) {
    if (!el) return;
    el._emojiStarted = true;
    if (code) {
      el.setAttribute('data-emoji', code);
      el.setAttribute('data-fallback', fallback || '');
    } else {
      el.removeAttribute('data-emoji');
      el.removeAttribute('data-fallback');
    }
    start(el);
  }

  window.AnimatedEmoji = { scan: scan, set: set };
  scan();
})();
