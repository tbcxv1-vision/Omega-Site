/* Omega Incorporated — site behaviour (no dependencies) */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- sticky header state ---------- */
  var header = document.querySelector('[data-header]');
  if (header) {
    var onScroll = function () { header.classList.toggle('is-scrolled', window.scrollY > 8); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---------- mobile menu ---------- */
  var toggle = document.querySelector('[data-menu-toggle]');
  var mobileNav = document.querySelector('[data-mobile-nav]');
  if (toggle && mobileNav) {
    var setOpen = function (open) {
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      mobileNav.hidden = !open;
      header.classList.toggle('is-open', open);
    };
    toggle.addEventListener('click', function () {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setOpen(false);
        toggle.focus();
      }
    });
    mobileNav.addEventListener('click', function (e) {
      if (e.target.closest('a')) setOpen(false);
    });
    window.matchMedia('(min-width: 900px)').addEventListener('change', function (mq) {
      if (mq.matches) setOpen(false);
    });
  }

  /* ---------- scroll reveal ---------- */
  var reveals = document.querySelectorAll('.reveal');
  var finish = function (el) {
    // drop reveal styles once shown so hover transitions stay snappy
    el.addEventListener('transitionend', function done() {
      el.classList.remove('reveal', 'is-visible');
      el.style.removeProperty('--reveal-delay');
      el.removeEventListener('transitionend', done);
    });
  };
  if (reduceMotion || !('IntersectionObserver' in window)) {
    reveals.forEach(function (el) { el.classList.remove('reveal'); });
  } else {
    // stagger siblings inside the same grid
    document.querySelectorAll('.card-grid').forEach(function (grid) {
      Array.prototype.forEach.call(grid.children, function (child, i) {
        if (child.classList.contains('reveal')) child.style.setProperty('--reveal-delay', Math.min(i, 6) * 60 + 'ms');
      });
    });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          finish(entry.target);
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    reveals.forEach(function (el) { io.observe(el); });
  }

  /* ---------- contact form ---------- */
  var form = document.querySelector('[data-contact-form]');
  if (!form) return;

  var interest = form.querySelector('[name="interest"]');
  var hint = form.querySelector('[data-hint]');
  var subject = form.querySelector('[data-subject]');
  var summary = form.querySelector('[data-form-summary]');
  var success = form.querySelector('[data-form-success]');
  var submitBtn = form.querySelector('[data-submit]');
  var submitLabel = form.querySelector('[data-submit-label]');
  var fallbackEmail = form.getAttribute('data-email');

  // Pre-select topic from ?interest=… (set by buttons around the site)
  var params = new URLSearchParams(window.location.search);
  var wanted = params.get('interest');
  if (wanted && interest.querySelector('option[value="' + CSS.escape(wanted) + '"]')) {
    interest.value = wanted;
  }
  var syncInterest = function () {
    hint.hidden = interest.value !== 'fellowship';
    var label = interest.options[interest.selectedIndex].text;
    subject.value = subject.value.replace(/ \[.*\]$/, '') + ' [' + label + ']';
  };
  interest.addEventListener('change', syncInterest);
  syncInterest();

  var rules = {
    name: function (v) { return v.trim() ? '' : 'Please enter your full name.'; },
    email: function (v) {
      if (!v.trim()) return 'Please enter your email address.';
      return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'Enter a valid email, like name@company.com.';
    },
    message: function (v) {
      if (!v.trim()) return 'Please add a short message so we know how to help.';
      return v.trim().length < 10 ? 'Please add a little more detail (at least 10 characters).' : '';
    }
  };

  var validateField = function (name) {
    var field = form.elements[name];
    var msg = rules[name](field.value);
    var errEl = form.querySelector('[data-error-for="' + name + '"]');
    errEl.textContent = msg;
    if (msg) field.setAttribute('aria-invalid', 'true');
    else field.removeAttribute('aria-invalid');
    return msg;
  };

  Object.keys(rules).forEach(function (name) {
    var field = form.elements[name];
    field.addEventListener('blur', function () { if (field.value) validateField(name); });
    field.addEventListener('input', function () {
      if (field.getAttribute('aria-invalid') === 'true') validateField(name);
    });
  });

  var showSummary = function (html) {
    summary.innerHTML = html;
    summary.hidden = false;
    summary.focus();
  };

  var setLoading = function (on) {
    submitBtn.disabled = on;
    submitBtn.classList.toggle('is-loading', on);
    submitBtn.setAttribute('aria-busy', String(on));
    submitLabel.textContent = on ? 'Sending…' : 'Send Message';
  };

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    summary.hidden = true;

    var errors = Object.keys(rules)
      .map(function (name) { return { name: name, msg: validateField(name) }; })
      .filter(function (r) { return r.msg; });

    if (errors.length) {
      if (errors.length === 1) {
        form.elements[errors[0].name].focus();
      } else {
        showSummary('<strong>Please fix ' + errors.length + ' fields:</strong><ul>' +
          errors.map(function (r) {
            return '<li><a href="#' + form.elements[r.name].id + '">' + r.msg + '</a></li>';
          }).join('') + '</ul>');
      }
      return;
    }

    var endpoint = form.getAttribute('action') || '';
    if (endpoint.indexOf('YOUR_FORM_ID') !== -1) {
      showSummary('This form isn\'t connected yet. Please email us at <a href="mailto:' + fallbackEmail + '">' + fallbackEmail + '</a>.');
      return;
    }

    setLoading(true);
    var controller = 'AbortController' in window ? new AbortController() : null;
    var timer = controller && setTimeout(function () { controller.abort(); }, 15000);

    fetch(endpoint, {
      method: 'POST',
      body: new FormData(form),
      headers: { Accept: 'application/json' },
      signal: controller ? controller.signal : undefined
    })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        form.reset();
        syncInterest();
        success.hidden = false;
        success.focus();
      })
      .catch(function () {
        showSummary('Sorry — your message couldn\'t be sent. Please try again, or email us at <a href="mailto:' + fallbackEmail + '">' + fallbackEmail + '</a>.');
      })
      .then(function () {
        if (timer) clearTimeout(timer);
        setLoading(false);
      });
  });

  form.querySelector('[data-form-reset]').addEventListener('click', function () {
    success.hidden = true;
    form.elements.name.focus();
  });

  // summary links: focus the field
  summary.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    e.preventDefault();
    var el = document.getElementById(a.getAttribute('href').slice(1));
    if (el) el.focus();
  });
})();
