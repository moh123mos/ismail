/*
 * Animated emoji loader.
 * Animations: Google Noto Animated Emoji (CC BY 4.0), rendered with lottie-web (MIT).
 * Usage: <span class="emoji" data-emoji="1f680" data-fallback="🚀" aria-hidden="true"></span>
 * - Plays only while visible; shows a still frame when the user prefers reduced motion.
 * - If the animation can't load (e.g. page opened via file://), the fallback character is shown.
 */
(function () {
  var nodes = document.querySelectorAll('[data-emoji]');
  if (!nodes.length) return;

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function showFallback(el) {
    el.textContent = el.getAttribute('data-fallback') || '';
  }

  if (!window.lottie) {
    Array.prototype.forEach.call(nodes, showFallback);
    return;
  }

  var io = 'IntersectionObserver' in window
    ? new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          var anim = entry.target._anim;
          if (!anim) return;
          if (entry.isIntersecting) anim.play(); else anim.pause();
        });
      })
    : null;

  Array.prototype.forEach.call(nodes, function (el) {
    el.textContent = '';
    var anim = window.lottie.loadAnimation({
      container: el,
      renderer: 'svg',
      loop: true,
      autoplay: false,
      path: 'imgs/emoji/' + el.getAttribute('data-emoji') + '.json'
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
  });
})();
