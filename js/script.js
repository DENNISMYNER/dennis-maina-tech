/**
 * Dennis Maina - Portfolio
 *
 * Vanilla JavaScript (ES6+), no dependencies. Loaded with `defer` from
 * index.html, so the DOM is fully parsed before anything below runs.
 *
 * Contents
 *   1. Config & helpers
 *   2. Navigation   - mobile menu, scroll effects, smooth scrolling
 *   3. Animations   - reveal on scroll, skill bars, stats counter, parallax,
 *                     card tilt, button ripple
 *   4. Theme        - light / dark toggle (persisted in localStorage)
 *   5. Contact form - client-side validation
 *   6. Page extras  - footer year, loader, link hardening, easter egg
 *   7. Init
 */

"use strict";

/* ==========================================================================
   1. CONFIG & HELPERS
   ========================================================================== */

const CONFIG = {
  navbarScrolledAfter: 80, // px scrolled before the header gets a shadow
  backToTopAfter: 400, // px scrolled before the back-to-top button shows
  activeLinkOffset: 150, // px offset used when detecting the current section
  loaderHideDelay: 800, // ms after window "load" before the loader fades
  themeStorageKey: "portfolio-theme",
  minMessageLength: 20,
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

/** localStorage can throw (private mode, blocked storage) - never let it break the page. */
const storage = {
  get(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* ignore: the theme simply will not persist */
    }
  },
};

/* ==========================================================================
   2. NAVIGATION
   ========================================================================== */

/** Hamburger menu: open/close, Esc key, outside click, close after choosing a link. */
function initMobileNav() {
  const navbar = $(".navbar");
  const navMenu = $(".nav-menu");
  const menuToggle = $(".menu-toggle");
  if (!navbar || !navMenu || !menuToggle) return;

  const setOpen = (isOpen) => {
    navMenu.classList.toggle("active", isOpen);
    menuToggle.classList.toggle("active", isOpen);
    menuToggle.setAttribute("aria-expanded", String(isOpen));
    document.body.classList.toggle("menu-open", isOpen);
  };

  menuToggle.addEventListener("click", () =>
    setOpen(!navMenu.classList.contains("active")),
  );

  $$(".nav-link").forEach((link) =>
    link.addEventListener("click", () => setOpen(false)),
  );

  document.addEventListener("click", (event) => {
    if (
      !navbar.contains(event.target) &&
      navMenu.classList.contains("active")
    ) {
      setOpen(false);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setOpen(false);
  });
}

/** Header shadow, active nav link and back-to-top visibility - one throttled scroll handler. */
function initScrollEffects() {
  const header = $(".header");
  const backToTop = $(".back-to-top");
  const sections = $$("section");
  const navLinks = $$(".nav-link");

  const updateHeader = () =>
    header.classList.toggle(
      "scrolled",
      window.scrollY > CONFIG.navbarScrolledAfter,
    );

  const updateBackToTop = () =>
    backToTop.classList.toggle("show", window.scrollY > CONFIG.backToTopAfter);

  const updateActiveLink = () => {
    let currentSection = "";

    sections.forEach((section) => {
      const top = section.offsetTop - CONFIG.activeLinkOffset;
      if (
        window.scrollY >= top &&
        window.scrollY < top + section.offsetHeight
      ) {
        // Sections without an id (e.g. certifications) deliberately match no link.
        currentSection = section.getAttribute("id");
      }
    });

    navLinks.forEach((link) => {
      link.classList.toggle(
        "active",
        link.getAttribute("href") === "#" + currentSection,
      );
    });
  };

  let ticking = false;
  window.addEventListener(
    "scroll",
    () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        updateHeader();
        updateActiveLink();
        updateBackToTop();
        ticking = false;
      });
    },
    { passive: true },
  );

  backToTop.addEventListener("click", (event) => {
    event.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

/** Smooth scrolling for in-page navigation links. */
function initSmoothScroll() {
  $$(".nav-link").forEach((link) => {
    link.addEventListener("click", (event) => {
      const target = $(link.getAttribute("href"));
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

/* ==========================================================================
   3. ANIMATIONS & INTERACTIVE EFFECTS
   ========================================================================== */

/** Elements that fade/slide in as they enter the viewport. */
const REVEAL_SELECTOR = `
  .skill-card,
  .service-card,
  .project-card,
  .timeline-content,
  .education-card,
  .certificate-card,
  .testimonial-card,
  .stat-card,
  .tech-grid span,
  .contact-item
`;

function initScrollReveal() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("active");
        observer.unobserve(entry.target); // animate once
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -80px 0px" },
  );

  $$(REVEAL_SELECTOR).forEach((element, index) => {
    element.classList.add("reveal");
    element.style.transitionDelay = `${(index % 5) * 100}ms`;
    observer.observe(element);
  });

  $$(".section-header").forEach((header) => {
    header.classList.add("reveal");
    observer.observe(header);
  });

  $$(".project-placeholder, .profile-placeholder").forEach((image) => {
    image.classList.add("reveal-scale");
    observer.observe(image);
  });
}

/**
 * Skill bars. Final widths live in CSS (.html-progress etc.). Bars start at 0
 * and the inline override is removed 300ms after the skills section is visible.
 */
function initSkillBars() {
  const bars = $$(".progress");
  const section = $(".skills");
  if (!section) return;

  bars.forEach((bar) => {
    bar.style.width = "0";
  });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        setTimeout(() => bars.forEach((bar) => (bar.style.width = "")), 300);
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.3 },
  );
  observer.observe(section);
}

/** Counts each statistic up from 0 once the stats section is half visible. */
function initStatsCounter() {
  const section = $(".stats");
  if (!section) return;

  const animateCounter = (element) => {
    const text = element.textContent.trim();
    const target = parseInt(text, 10);
    const suffix = text.replace(/^\d+/, ""); // keeps "+" or "%" exactly as written in the HTML
    const increment = Math.ceil(target / 80);
    let current = 0;

    const timer = setInterval(() => {
      current = Math.min(current + increment, target);
      element.textContent = current + suffix;
      if (current >= target) clearInterval(timer);
    }, 30);
  };

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        $$(".stat-number").forEach(animateCounter);
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.5 },
  );
  observer.observe(section);
}

/** Subtle mouse parallax on the hero image. */
function initHeroParallax() {
  const heroImage = $(".hero-image");
  if (!heroImage) return;

  document.addEventListener("mousemove", (event) => {
    const x = (window.innerWidth / 2 - event.clientX) / 40;
    const y = (window.innerHeight / 2 - event.clientY) / 40;
    heroImage.style.transform = `translate(${x}px, ${y}px)`;
  });
}

/** 3D tilt on cards and scale-up on image placeholders. */
function initCardEffects() {
  $$(".project-card, .skill-card, .service-card, .certificate-card").forEach(
    (card) => {
      card.addEventListener("mousemove", (event) => {
        const rect = card.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = ((event.clientY - rect.top - centerY) / centerY) * -8;
        const rotateY = ((event.clientX - rect.left - centerX) / centerX) * 8;

        card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-8px)`;
      });

      card.addEventListener("mouseleave", () => {
        card.style.transform = "";
      });
    },
  );

  $$(".project-placeholder, .profile-placeholder").forEach((image) => {
    image.addEventListener("mouseenter", () => {
      image.style.transform = "scale(1.05)";
    });
    image.addEventListener("mouseleave", () => {
      image.style.transform = "scale(1)";
    });
  });
}

/** Click ripple on .btn, and a pressed-state scale on every button. */
function initButtonEffects() {
  $$(".btn").forEach((button) => {
    button.addEventListener("click", (event) => {
      const rect = button.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const ripple = document.createElement("span");

      ripple.classList.add("ripple");
      ripple.style.width = `${size}px`;
      ripple.style.height = `${size}px`;
      ripple.style.left = `${event.clientX - rect.left - size / 2}px`;
      ripple.style.top = `${event.clientY - rect.top - size / 2}px`;

      button.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);
    });
  });

  $$("button, .btn").forEach((button) => {
    button.addEventListener("mousedown", () => {
      button.style.transform = "scale(.96)";
    });
    button.addEventListener("mouseup", () => {
      button.style.transform = "";
    });
  });
}

/* ==========================================================================
   4. THEME (LIGHT / DARK)
   ========================================================================== */

function initThemeToggle() {
  const button = $(".theme-toggle");
  if (!button) return;

  const render = (isLight) => {
    document.body.classList.toggle("light-theme", isLight);
    button.textContent = isLight ? "🌙" : "☀️";
  };

  render(storage.get(CONFIG.themeStorageKey) === "light");

  button.addEventListener("click", () => {
    const isLight = !document.body.classList.contains("light-theme");
    render(isLight);
    storage.set(CONFIG.themeStorageKey, isLight ? "light" : "dark");
  });
}

/* ==========================================================================
   5. CONTACT FORM
   ========================================================================== */

/**
 * Client-side validation only. There is no backend, so a valid submission is
 * not sent anywhere - see README.md ("Contact form") for how to connect one.
 */
function initContactForm() {
  const form = $(".contact-form");
  if (!form) return;

  const fields = $$("input, textarea", form);
  const nameField = $("input[type='text']", form);
  const emailField = $("input[type='email']", form);
  const messageField = $("textarea", form);

  const formMessage = document.createElement("div");
  formMessage.classList.add("form-message");
  formMessage.setAttribute("role", "status");
  form.appendChild(formMessage);

  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const showError = (input, message) => {
    const error = document.createElement("small");
    error.classList.add("error-message");
    error.setAttribute("role", "alert");
    error.textContent = message;

    input.classList.add("error");
    input.setAttribute("aria-invalid", "true");
    input.parentElement.appendChild(error);
  };

  const clearErrors = () => {
    $$(".error-message").forEach((error) => error.remove());
    fields.forEach((input) => {
      input.classList.remove("error");
      input.removeAttribute("aria-invalid");
    });
  };

  const showFormMessage = (message, type) => {
    formMessage.textContent = message;
    formMessage.className = `form-message ${type}`;
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    clearErrors();

    let isValid = true;

    if (!nameField.value.trim()) {
      showError(nameField, "Please enter your name.");
      isValid = false;
    }

    if (!emailField.value.trim()) {
      showError(emailField, "Please enter your email.");
      isValid = false;
    } else if (!isValidEmail(emailField.value)) {
      showError(emailField, "Please enter a valid email address.");
      isValid = false;
    }

    if (!messageField.value.trim()) {
      showError(messageField, "Please enter your message.");
      isValid = false;
    } else if (messageField.value.length < CONFIG.minMessageLength) {
      showError(
        messageField,
        `Message should be at least ${CONFIG.minMessageLength} characters.`,
      );
      isValid = false;
    }

    if (isValid) {
      showFormMessage(
        "✓ Message sent successfully! I will get back to you soon.",
        "success",
      );
      form.reset();
    }
  });
}

/* ==========================================================================
   6. PAGE EXTRAS
   ========================================================================== */

/** Keeps the footer year current. */
function initFooterYear() {
  const copyright = $(".copyright");
  if (copyright) {
    copyright.textContent = `© ${new Date().getFullYear()} Dennis Maina. All Rights Reserved.`;
  }
}

/** Full-screen loader, created here so a script failure can never leave it stuck on screen. */
function initPageLoader() {
  const loader = document.createElement("div");
  loader.classList.add("page-loader");
  loader.setAttribute("aria-hidden", "true");
  loader.innerHTML = `
    <div class="loader-circle"></div>
    <p>Loading Portfolio...</p>
  `;
  document.body.appendChild(loader);

  window.addEventListener("load", () => {
    setTimeout(() => loader.classList.add("hide"), CONFIG.loaderHideDelay);
  });
}

/** Any absolute link you add later opens in a new tab, safely. */
function initExternalLinks() {
  $$("a[href^='http']").forEach((link) => {
    link.setAttribute("target", "_blank");
    link.setAttribute("rel", "noopener noreferrer");
  });
}

/** Placeholder links (href="#") should not jump the page to the top. */
function initEmptyHashLinks() {
  $$("a[href='#']").forEach((link) =>
    link.addEventListener("click", (event) => event.preventDefault()),
  );
}

/** Easter egg: typing "developer" anywhere on the page. */
function initKeyboardEasterEgg() {
  let typed = "";

  document.addEventListener("keydown", (event) => {
    typed += event.key.toLowerCase();

    if (typed.includes("developer")) {
      alert("🚀 Keep coding! Your portfolio journey has started.");
      typed = "";
    }
    if (typed.length > 20) typed = "";
  });
}

/* ==========================================================================
   7. INIT
   ========================================================================== */

initFooterYear();
initMobileNav();
initScrollEffects();
initSmoothScroll();
initHeroParallax();
initButtonEffects();
initScrollReveal();
initSkillBars();
initStatsCounter();
initThemeToggle();
initContactForm();
initPageLoader();
initCardEffects();
initKeyboardEasterEgg();
initExternalLinks();
initEmptyHashLinks();
