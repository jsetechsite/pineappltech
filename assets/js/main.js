/* ==========================================================================
   Pineappltech — 2026
   Behaviour layer. No dependencies. Everything degrades to readable HTML.
   ========================================================================== */

(function () {
  "use strict";

  var $ = function (sel, ctx) {
    return (ctx || document).querySelector(sel);
  };
  var $$ = function (sel, ctx) {
    return Array.prototype.slice.call((ctx || document).querySelectorAll(sel));
  };
  var clamp = function (value, min, max) {
    return Math.min(max, Math.max(min, value));
  };

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var supportsHover = window.matchMedia("(hover: hover) and (pointer: fine)");

  /* ---------- Header, scroll progress, clock ---------------------------- */

  var header = $("[data-header]");
  var progressBar = $("[data-scroll-progress]");
  var clock = $("[data-clock]");
  var hero = $(".hero");
  var heroVisual = $("[data-hero-visual]");
  var heroGrid = $(".hero__grid");
  var buildPanel = $("[data-parallax]");
  var lastScrollY = 0;
  var headerHidden = false;

  function onScrollFrame() {
    var y = window.scrollY || window.pageYOffset;

    if (header) {
      if (y > 64) {
        header.classList.add("is-scrolled");
      } else {
        header.classList.remove("is-scrolled");
      }

      /* Mobile only: tuck the bar away on the way down, show it on the way up. */
      var isMobile = window.innerWidth < 1024;
      var menuOpen = document.body.classList.contains("menu-open");
      var goingDown = y > lastScrollY + 4;
      var goingUp = y < lastScrollY - 4;

      if (isMobile && !menuOpen && y > 420 && goingDown) {
        if (!headerHidden) {
          header.classList.add("is-hidden");
          headerHidden = true;
        }
      } else if (!isMobile || goingUp || y <= 420 || menuOpen) {
        if (headerHidden) {
          header.classList.remove("is-hidden");
          headerHidden = false;
        }
      }
    }

    if (progressBar) {
      var docHeight = document.documentElement.scrollHeight - window.innerHeight;
      var ratio = docHeight > 0 ? clamp(y / docHeight, 0, 1) : 0;
      progressBar.style.transform = "scaleX(" + ratio + ")";
    }

    if (!reduceMotion.matches) {
      if (heroGrid && y < window.innerHeight * 1.2) {
        heroGrid.style.transform = "translate3d(0," + (y * 0.08).toFixed(2) + "px,0)";
      }
      if (buildPanel && y < window.innerHeight * 1.4) {
        buildPanel.style.setProperty("--py", clamp(y * 0.05, 0, 46).toFixed(1) + "px");
      }
    }

    updateServices();
    updateProcess();
    updateManifesto();

    lastScrollY = y > 0 ? y : 0;
    scrollScheduled = false;
  }

  var scrollScheduled = false;

  function requestScrollUpdate() {
    if (!scrollScheduled) {
      scrollScheduled = true;
      window.requestAnimationFrame(onScrollFrame);
    }
  }

  window.addEventListener("scroll", requestScrollUpdate, { passive: true });
  window.addEventListener("resize", requestScrollUpdate);
  requestScrollUpdate();

  /* Local time in Manila. */
  if (clock) {
    var timeFormatter = new Intl.DateTimeFormat("en-PH", {
      timeZone: "Asia/Manila",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    });

    var paintClock = function () {
      try {
        clock.textContent = timeFormatter.format(new Date());
      } catch (error) {
        clock.textContent = "--:--";
      }
    };

    paintClock();
    window.setInterval(paintClock, 30000);
  }

  /* ---------- Hero entrance & pointer parallax -------------------------- */

  if (hero) {
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        hero.classList.add("is-ready");
      });
    });

    if (heroVisual && supportsHover.matches) {
      var pointerTarget = { x: 0, y: 0 };
      var pointerCurrent = { x: 0, y: 0 };
      var pointerActive = false;

      hero.addEventListener("pointermove", function (event) {
        if (reduceMotion.matches) return;
        var rect = hero.getBoundingClientRect();
        pointerTarget.x = clamp(((event.clientX - rect.left) / rect.width - 0.5) * 24, -12, 12);
        pointerTarget.y = clamp(((event.clientY - rect.top) / rect.height - 0.5) * 24, -12, 12);
        pointerActive = true;
      });

      hero.addEventListener("pointerleave", function () {
        pointerTarget.x = 0;
        pointerTarget.y = 0;
      });

      var animatePointer = function () {
        if (pointerActive) {
          pointerCurrent.x += (pointerTarget.x - pointerCurrent.x) * 0.08;
          pointerCurrent.y += (pointerTarget.y - pointerCurrent.y) * 0.08;
          heroVisual.style.setProperty("--mx", pointerCurrent.x.toFixed(2) + "px");
          heroVisual.style.setProperty("--my", pointerCurrent.y.toFixed(2) + "px");
        }
        window.requestAnimationFrame(animatePointer);
      };

      window.requestAnimationFrame(animatePointer);
    }
  }

  /* ---------- Mobile menu ---------------------------------------------- */

  var menuToggle = $("[data-menu-toggle]");
  var menuToggleLabel = $(".menu-toggle__label");
  var mobileMenu = $("[data-mobile-menu]");
  var menuOpen = false;

  function getMenuFocusables() {
    if (!mobileMenu) return [];
    return [menuToggle].concat(
      $$("a[href], button:not([disabled])", mobileMenu).filter(function (el) {
        return el.offsetParent !== null;
      })
    );
  }

  function openMenu() {
    if (!mobileMenu || !menuToggle) return;
    menuOpen = true;
    mobileMenu.classList.add("is-open");
    mobileMenu.setAttribute("aria-hidden", "false");
    menuToggle.setAttribute("aria-expanded", "true");
    if (menuToggleLabel) menuToggleLabel.textContent = "Close";
    document.body.classList.add("menu-open");
    document.body.style.overflow = "hidden";
    header.classList.remove("is-hidden");
    headerHidden = false;

    window.setTimeout(function () {
      var first = $(".mobile-nav a", mobileMenu);
      if (first) first.focus({ preventScroll: true });
    }, 80);
  }

  function closeMenu(restoreFocus) {
    if (!mobileMenu || !menuToggle) return;
    menuOpen = false;
    mobileMenu.classList.remove("is-open");
    mobileMenu.setAttribute("aria-hidden", "true");
    menuToggle.setAttribute("aria-expanded", "false");
    if (menuToggleLabel) menuToggleLabel.textContent = "Menu";
    document.body.classList.remove("menu-open");
    document.body.style.overflow = "";
    if (restoreFocus) menuToggle.focus({ preventScroll: true });
  }

  if (menuToggle && mobileMenu) {
    menuToggle.addEventListener("click", function () {
      if (menuOpen) {
        closeMenu(true);
      } else {
        openMenu();
      }
    });

    $$("a[href]", mobileMenu).forEach(function (link) {
      link.addEventListener("click", function () {
        closeMenu(false);
      });
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && menuOpen) {
        event.preventDefault();
        closeMenu(true);
        return;
      }

      if (event.key !== "Tab" || !menuOpen) return;

      var focusables = getMenuFocusables();
      if (!focusables.length) return;
      var first = focusables[0];
      var last = focusables[focusables.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth >= 1024 && menuOpen) closeMenu(false);
    });
  }

  /* ---------- Reveal on scroll ----------------------------------------- */

  var revealItems = $$("[data-reveal]");

  /* Small, automatic stagger for elements revealed together. */
  revealItems.forEach(function (el) {
    var parent = el.parentElement;
    if (!parent) return;
    var siblings = Array.prototype.filter.call(parent.children, function (child) {
      return child.hasAttribute("data-reveal");
    });
    var index = siblings.indexOf(el);
    if (index > 0 && index < 6 && !reduceMotion.matches) {
      el.style.setProperty("--reveal-delay", index * 70 + "ms");
    }
  });

  if ("IntersectionObserver" in window && !reduceMotion.matches) {
    var revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
    );

    revealItems.forEach(function (el) {
      revealObserver.observe(el);
    });
  } else {
    revealItems.forEach(function (el) {
      el.classList.add("is-visible");
    });
  }

  /* ---------- Active section in the primary nav ------------------------ */

  var navLinks = $$(".primary-nav a[href^='#']");
  var watchedSections = navLinks
    .map(function (link) {
      return document.getElementById(link.getAttribute("href").slice(1));
    })
    .filter(Boolean);

  if ("IntersectionObserver" in window && watchedSections.length) {
    var sectionObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var id = entry.target.id;
          navLinks.forEach(function (link) {
            if (link.getAttribute("href") === "#" + id) {
              link.setAttribute("aria-current", "page");
            } else {
              link.removeAttribute("aria-current");
            }
          });
        });
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
    );

    watchedSections.forEach(function (section) {
      sectionObserver.observe(section);
    });
  }

  /* ---------- Manifesto scroll highlight ------------------------------- */

  var highlight = $("[data-highlight]");
  var highlightWords = [];
  var wordsLit = -1;

  if (highlight && !reduceMotion.matches) {
    var text = highlight.textContent.trim();
    var words = text.split(/\s+/);
    highlight.innerHTML = words
      .map(function (word) {
        return '<span class="word">' + escapeHTML(word) + "</span>";
      })
      .join(" ");
    highlightWords = $$(".word", highlight);
    highlight.classList.add("is-highlight-ready");
  }

  function escapeHTML(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function updateManifesto() {
    if (!highlight || !highlightWords.length) return;
    var rect = highlight.getBoundingClientRect();
    var viewport = window.innerHeight;
    if (rect.bottom < 0 || rect.top > viewport) return;

    var start = viewport * 0.8;
    var distance = Math.max(rect.height, 1) + viewport * 0.22;
    var progress = clamp((start - rect.top) / distance, 0, 1);
    var lit = Math.round(progress * highlightWords.length);

    if (lit === wordsLit) return;
    highlightWords.forEach(function (word, index) {
      word.classList.toggle("is-lit", index < lit);
    });
    wordsLit = lit;
  }

  /* ---------- Services rail -------------------------------------------- */

  var services = $("[data-services]");
  var servicesPin = $("[data-services-pin]");
  var servicesStage = $("[data-services-stage]");
  var servicesTrack = $("[data-services-track]");
  var servicesProgress = $("[data-services-progress]");
  var servicesCurrent = $("[data-services-current]");
  var servicesCards = $$("[data-service]");
  var servicesMq = window.matchMedia("(min-width: 900px) and (prefers-reduced-motion: no-preference)");
  var servicesActive = false;
  var servicesTravel = 0;
  var servicesPinHeight = 0;
  var servicesCurrentIndex = 1;

  function refreshServices(force) {
    if (!services || !servicesPin || !servicesStage || !servicesTrack) return;

    var shouldPin = servicesMq.matches;

    if (!shouldPin) {
      if (servicesActive || force) {
        services.classList.remove("is-horizontal");
        services.style.height = "";
        servicesTrack.style.transform = "";
        servicesActive = false;
        servicesTravel = 0;
      }
      if (servicesProgress) servicesProgress.style.transform = "scaleX(0.166)";
      setServicesIndex(1);
      return;
    }

    services.classList.add("is-horizontal");
    servicesActive = true;

    servicesPinHeight = servicesPin.offsetHeight;
    var trackWidth = servicesTrack.scrollWidth;
    var stageWidth = servicesStage.clientWidth;
    servicesTravel = Math.max(0, trackWidth - stageWidth);

    services.style.height = servicesPinHeight + servicesTravel + "px";
    updateServices();
  }

  function setServicesIndex(index) {
    if (index === servicesCurrentIndex) return;
    servicesCurrentIndex = index;
    if (servicesCurrent) {
      servicesCurrent.textContent = (index < 10 ? "0" : "") + index;
    }
  }

  function updateServices() {
    if (!servicesActive || !services || !servicesTrack) return;

    var rect = services.getBoundingClientRect();
    var travel = Math.max(servicesTravel, 1);
    var progress = clamp(-rect.top / travel, 0, 1);

    servicesTrack.style.transform = "translate3d(" + (-progress * servicesTravel).toFixed(2) + "px,0,0)";

    if (servicesProgress) {
      servicesProgress.style.transform = "scaleX(" + (0.166 + progress * 0.834).toFixed(4) + ")";
    }

    var index = clamp(Math.floor(progress * servicesCards.length) + 1, 1, servicesCards.length || 6);
    setServicesIndex(index);
  }

  if (services) {
    refreshServices(true);

    if (servicesMq.addEventListener) {
      servicesMq.addEventListener("change", function () {
        refreshServices(true);
      });
    } else if (servicesMq.addListener) {
      servicesMq.addListener(function () {
        refreshServices(true);
      });
    }

    if ("ResizeObserver" in window && servicesTrack) {
      var servicesResize = new ResizeObserver(function () {
        refreshServices(false);
      });
      servicesResize.observe(servicesTrack);
    }

    window.addEventListener("resize", function () {
      refreshServices(false);
    });

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () {
        refreshServices(false);
      });
    }
  }

  /* ---------- Process index -------------------------------------------- */

  var steps = $$("[data-step]");
  var processBig = $("[data-process-big]");
  var processName = $("[data-process-name]");
  var processMeter = $("[data-process-meter]");
  var processCount = $("[data-process-count]");
  var activeStep = -1;

  function updateProcess() {
    if (!steps.length) return;

    var focusLine = window.innerHeight * 0.45;
    var index = 0;

    steps.forEach(function (step, i) {
      if (step.getBoundingClientRect().top <= focusLine) index = i;
    });

    if (index === activeStep) return;
    activeStep = index;

    steps.forEach(function (step, i) {
      step.classList.toggle("is-active", i === index);
    });

    var label = (index + 1 < 10 ? "0" : "") + (index + 1);
    if (processBig) processBig.textContent = label;
    if (processName) {
      processName.textContent = steps[index].getAttribute("data-step-name") || "";
    }
    if (processCount) processCount.textContent = label;
    if (processMeter) {
      processMeter.style.transform = "scaleX(" + ((index + 1) / steps.length).toFixed(4) + ")";
    }
  }

  /* ---------- Counters -------------------------------------------------- */

  var counters = $$("[data-count]");

  function runCounter(el) {
    var target = parseInt(el.getAttribute("data-count"), 10);
    if (isNaN(target)) return;

    if (reduceMotion.matches) {
      el.textContent = String(target);
      return;
    }

    var duration = 1100;
    var start = null;

    var tick = function (timestamp) {
      if (start === null) start = timestamp;
      var progress = clamp((timestamp - start) / duration, 0, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = String(Math.round(target * eased));
      if (progress < 1) {
        window.requestAnimationFrame(tick);
      } else {
        el.textContent = String(target);
      }
    };

    el.textContent = "0";
    window.requestAnimationFrame(tick);
  }

  if ("IntersectionObserver" in window) {
    var counterObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          runCounter(entry.target);
          counterObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.6 }
    );

    counters.forEach(function (el) {
      counterObserver.observe(el);
    });
  } else {
    counters.forEach(runCounter);
  }

  /* ---------- Video dialog --------------------------------------------- */

  var dialog = $("[data-video-dialog]");
  var videoFrame = $("[data-video-frame]");
  var videoOpeners = $$("[data-video-open]");
  var videoClose = $("[data-video-close]");
  var lastVideoTrigger = null;
  var VIDEO_ID = "h9OJuToWDws";

  function openVideo(trigger) {
    if (!dialog) return;
    lastVideoTrigger = trigger || null;

    if (videoFrame) {
      videoFrame.innerHTML =
        '<iframe src="https://www.youtube-nocookie.com/embed/' +
        VIDEO_ID +
        '?autoplay=1&rel=0&modestbranding=1" title="Introducing Pineappltech (0:52)" ' +
        'allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" ' +
        "allowfullscreen loading=\"lazy\"></iframe>";
    }

    document.body.style.overflow = "hidden";

    if (typeof dialog.showModal === "function") {
      dialog.showModal();
    } else {
      dialog.setAttribute("open", "");
    }

    if (videoClose) {
      window.requestAnimationFrame(function () {
        videoClose.focus({ preventScroll: true });
      });
    }
  }

  function closeVideo() {
    if (!dialog) return;

    if (typeof dialog.close === "function") {
      dialog.close();
    } else {
      dialog.removeAttribute("open");
      clearVideo();
    }
  }

  function clearVideo() {
    if (videoFrame) videoFrame.innerHTML = "";
    if (dialog && dialog.open && typeof dialog.close === "function") {
      dialog.close();
    }
    document.body.style.overflow = "";
    if (lastVideoTrigger) {
      lastVideoTrigger.focus({ preventScroll: true });
      lastVideoTrigger = null;
    }
  }

  if (dialog) {
    videoOpeners.forEach(function (button) {
      button.addEventListener("click", function () {
        openVideo(button);
      });
    });

    if (videoClose) {
      videoClose.addEventListener("click", function () {
        closeVideo();
      });
    }

    dialog.addEventListener("close", clearVideo);

    dialog.addEventListener("cancel", function (event) {
      event.preventDefault();
      closeVideo();
    });

    dialog.addEventListener("click", function (event) {
      if (event.target === dialog) closeVideo();
    });
  }

  /* ---------- Contact form --------------------------------------------- */

  var form = $("[data-contact-form]");
  var formStatus = $("[data-form-status]");

  if (form) {
    var nameField = form.elements.namedItem("name");
    var emailField = form.elements.namedItem("email");
    var projectField = form.elements.namedItem("project");
    var messageField = form.elements.namedItem("message");
    var honeypot = form.elements.namedItem("company-url");

    var fields = [nameField, emailField, messageField];

    fields.forEach(function (field) {
      if (!field) return;
      var error = document.getElementById(field.id + "-error");
      if (error && !field.getAttribute("aria-describedby")) {
        field.setAttribute("aria-describedby", error.id);
      }
      field.setAttribute("aria-required", "true");
    });

    function setError(field, message) {
      if (!field) return;
      var error = document.getElementById(field.id + "-error");
      if (error) error.textContent = message || "";
      if (message) {
        field.setAttribute("aria-invalid", "true");
      } else {
        field.removeAttribute("aria-invalid");
      }
    }

    function validateField(field) {
      if (!field) return true;
      var value = field.value.trim();

      if (field === nameField) {
        if (value.length < 2) {
          setError(field, "Please enter your name.");
          return false;
        }
      } else if (field === emailField) {
        if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(value)) {
          setError(field, "Please enter a valid email address.");
          return false;
        }
      } else if (field === messageField) {
        if (value.length < 10) {
          setError(field, "Please add a little more detail (at least 10 characters).");
          return false;
        }
      }

      setError(field, "");
      return true;
    }

    fields.forEach(function (field) {
      if (!field) return;
      field.addEventListener("blur", function () {
        if (field.value.trim() === "") return;
        validateField(field);
      });
      field.addEventListener("input", function () {
        if (field.getAttribute("aria-invalid") === "true") validateField(field);
        if (formStatus) formStatus.textContent = "";
      });
    });

    function setStatus(message, isError) {
      if (!formStatus) return;
      formStatus.textContent = message;
      formStatus.classList.toggle("is-error", Boolean(isError));
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      /* Honeypot: quietly do nothing for bots. */
      if (honeypot && honeypot.value.trim() !== "") {
        setStatus("Thank you — your message is ready to send.");
        return;
      }

      var firstInvalid = null;
      fields.forEach(function (field) {
        if (!validateField(field) && !firstInvalid) firstInvalid = field;
      });

      if (firstInvalid) {
        setStatus("Please check the highlighted fields.", true);
        firstInvalid.focus();
        return;
      }

      var name = nameField.value.trim();
      var email = emailField.value.trim();
      var project = projectField ? projectField.value.trim() : "";
      var message = messageField.value.trim();

      var subject = "Project inquiry — " + (project || "General") + " — " + name;
      var body = [
        "Hi Pineappltech,",
        "",
        message,
        "",
        "—",
        "Name: " + name,
        "Email: " + email,
        "Project type: " + (project || "Not specified")
      ].join("\r\n");

      var mailto =
        "mailto:pineappltech@gmail.com?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);

      setStatus("Opening your email app with the details filled in…", false);

      try {
        window.location.href = mailto;
      } catch (error) {
        setStatus("Your browser blocked the email draft. Write to pineappltech@gmail.com instead.", true);
        return;
      }

      window.setTimeout(function () {
        if (formStatus) {
          setStatus("If nothing opened, email pineappltech@gmail.com directly — we'll reply from there.", false);
        }
      }, 1600);
    });

    /* Prefill from “Discuss this service” links. */
    $$("[data-project]").forEach(function (link) {
      link.addEventListener("click", function () {
        var project = link.getAttribute("data-project");
        var message = link.getAttribute("data-message");

        if (projectField && project) {
          var match = Array.prototype.find.call(projectField.options, function (option) {
            return option.text.toLowerCase() === project.toLowerCase();
          });
          if (match) projectField.value = match.value;
        }

        if (messageField && message && messageField.value.trim() === "") {
          messageField.value = message;
          messageField.removeAttribute("aria-invalid");
          var messageError = document.getElementById("message-error");
          if (messageError) messageError.textContent = "";
        }
      });
    });
  }

  /* ---------- Marquee: keep the loop seamless on wide screens ---------- */

  var marqueeTrack = $("[data-marquee]");

  if (marqueeTrack) {
    var baseMarquee = marqueeTrack.innerHTML;
    var ensureMarquee = function () {
      var guard = 0;
      while (marqueeTrack.scrollWidth / 2 < window.innerWidth && guard < 4) {
        marqueeTrack.insertAdjacentHTML("beforeend", baseMarquee);
        guard += 1;
      }
    };
    ensureMarquee();
    window.addEventListener("resize", function () {
      if (!reduceMotion.matches) ensureMarquee();
    });
  }

  /* ---------- Keep sticky measurements honest on font load ------------- */

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () {
      requestScrollUpdate();
    });
  }

  window.addEventListener("load", function () {
    requestScrollUpdate();
    if (services) refreshServices(false);
  });
})();
