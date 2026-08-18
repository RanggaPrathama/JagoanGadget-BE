(function () {
  'use strict';

  // --- Scroll Reveal ---
  const revealEls = document.querySelectorAll('[data-reveal]');
  if (revealEls.length) {
    const ro = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            ro.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
    );
    revealEls.forEach(function (el) {
      ro.observe(el);
    });
  }

  // --- Smooth Scroll for [data-scroll] ---
  document.querySelectorAll('[data-scroll]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var href = a.getAttribute('href');
      if (!href || href.charAt(0) !== '#') return;
      var target = document.getElementById(href.slice(1));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  // --- Console Branding ---
  console.log(
    '%c NestJS Backend %c v11 ',
    'background:#6c5ce7;color:#fff;padding:4px 10px;border-radius:4px 0 0 4px;font-weight:700;font-size:13px',
    'background:#1a1a28;color:#a29bfe;padding:4px 10px;border-radius:0 4px 4px 0;font-weight:600;font-size:13px',
  );
  console.log(
    '⚡ NestJS ' +
      process?.env?.NEST_VERSION +
      ' · PostgreSQL · TypeORM · Better Auth',
  );

  // --- Navbar shadow on scroll ---
  var navbar = document.querySelector('.navbar');
  if (navbar) {
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (!ticking) {
        window.requestAnimationFrame(function () {
          navbar.style.borderBottomColor =
            window.scrollY > 20 ? 'var(--border-light)' : 'var(--border)';
          ticking = false;
        });
        ticking = true;
      }
    });
  }

  // --- Animated gradient hero micro-interaction ---
  var heroGradient = document.querySelector('.hero-gradient');
  if (heroGradient) {
    document.querySelector('.hero').addEventListener('mousemove', function (e) {
      var rect = this.getBoundingClientRect();
      var x = ((e.clientX - rect.left) / rect.width) * 100;
      var y = ((e.clientY - rect.top) / rect.height) * 100;
      heroGradient.style.backgroundPosition = x + '% ' + y + '%';
    });
  }
})();
