/* ====================================== */
/* LANDING PAGE INTERACTIONS              */
/* ====================================== */

/**
 * Story Cluster Wall
 * Rotates through example clusters with animations
 */

const clusterExamples = [
  {
    title: "Apple Expands AI Strategy",
    sources: 32,
    articles: 147,
  },
  {
    title: "Nvidia Earnings Surge",
    sources: 28,
    articles: 134,
  },
  {
    title: "Global Markets Shift",
    sources: 24,
    articles: 89,
  },
  {
    title: "US Election Developments",
    sources: 35,
    articles: 167,
  },
  {
    title: "Singapore Housing Policy",
    sources: 18,
    articles: 56,
  },
];

let currentClusterIndex = 0;

function rotateCluster() {
  const clusterTitle = document.getElementById("clusterTitle");

  if (!clusterTitle) return;

  const cluster = clusterExamples[currentClusterIndex];

  // Fade out
  clusterTitle.style.opacity = "0";
  clusterTitle.style.transform = "translateY(-8px)";

  setTimeout(() => {
    clusterTitle.textContent = cluster.title;

    // Update metrics
    const metrics = document.querySelectorAll(".cluster-metrics span");
    if (metrics[0]) metrics[0].textContent = `${cluster.sources} Sources`;
    if (metrics[1]) metrics[1].textContent = `${cluster.articles} Articles`;

    // Fade in
    clusterTitle.style.opacity = "1";
    clusterTitle.style.transform = "translateY(0)";

    currentClusterIndex = (currentClusterIndex + 1) % clusterExamples.length;
  }, 240);
}

// Rotate clusters every 6 seconds
setInterval(rotateCluster, 6000);

/* ====================================== */
/* TOPIC UNIVERSE INTERACTIONS            */
/* ====================================== */

const topicData = {
  TECH: {
    count: 2342,
    description: "AI, startups, semiconductors, cybersecurity.",
  },
  FINANCE: {
    count: 1780,
    description: "Markets, earnings, crypto, commodities.",
  },
  GLOBAL: {
    count: 1291,
    description: "International news, geopolitics, regional updates.",
  },
  POLITICS: {
    count: 985,
    description: "Elections, policy, government developments.",
  },
  CULTURE: {
    count: 744,
    description: "Entertainment, internet culture, celebrities.",
  },
};

function initTopicInteractions() {
  const topicWords = document.querySelectorAll(".topic-word");
  const topicInfo = document.getElementById("topicInfo");

  if (!topicInfo) return;

  topicWords.forEach((button) => {
    const topic = button.textContent.trim();

    button.addEventListener("mouseenter", () => {
      const data = topicData[topic];
      if (data) {
        topicInfo.textContent = `${data.count} active stories · ${data.description}`;
      }
    });

    button.addEventListener("mouseleave", () => {
      topicInfo.textContent = "Hover a topic to explore active coverage.";
    });

    // Mobile: click to show info
    button.addEventListener("click", (e) => {
      e.preventDefault();
      const data = topicData[topic];
      if (data) {
        topicInfo.textContent = `${data.count} active stories · ${data.description}`;
      }
    });
  });
}

/* ====================================== */
/* COUNTER ANIMATION                      */
/* ====================================== */

function animateCounter(element, targetValue) {
  const duration = 1200; // ms
  const startValue = 0;
  const startTime = Date.now();

  function update() {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Easing function: easeOutCubic
    const easeProgress = 1 - Math.pow(1 - progress, 3);

    const currentValue = Math.floor(
      startValue + (targetValue - startValue) * easeProgress,
    );

    element.textContent = currentValue.toLocaleString();

    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }

  update();
}

function initCounterAnimations() {
  const counterElements = document.querySelectorAll("[data-counter]");

  if (counterElements.length === 0) return;

  // Use Intersection Observer to trigger animation when visible
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !entry.target.dataset.animated) {
          const targetValue = parseInt(entry.target.dataset.counter, 10);
          animateCounter(entry.target, targetValue);
          entry.target.dataset.animated = "true";
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.5,
    },
  );

  counterElements.forEach((el) => {
    observer.observe(el);
  });
}

/* ====================================== */
/* SCROLL REVEAL ENHANCEMENT              */
/* ====================================== */

function initScrollReveal() {
  const revealElements = document.querySelectorAll(".reveal");

  if (revealElements.length === 0) return;

  // Add staggered animation delays
  revealElements.forEach((el, index) => {
    el.style.animationDelay = `${index * 0.1}s`;
  });

  // Intersection Observer for late-loading reveals
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = "1";
          entry.target.style.transform = "translateY(0)";
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.1,
    },
  );

  revealElements.forEach((el) => {
    observer.observe(el);
  });
}

/* ====================================== */
/* SMOOTH SCROLL ENHANCEMENT              */
/* ====================================== */

function initSmoothScroll() {
  const links = document.querySelectorAll('a[href^="#"]');

  links.forEach((link) => {
    link.addEventListener("click", (e) => {
      const href = link.getAttribute("href");

      if (href === "#") {
        e.preventDefault();
        return;
      }

      const target = document.querySelector(href);

      if (target) {
        e.preventDefault();

        target.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });

        // Focus management for accessibility
        target.focus({ preventScroll: true });
      }
    });
  });
}

/* ====================================== */
/* PUBLISHER NODE ANIMATION ENHANCEMENT   */
/* ====================================== */

function initPublisherNodeAnimations() {
  const publisherNodes = document.querySelectorAll(".publisher-node");

  if (publisherNodes.length === 0) return;

  publisherNodes.forEach((node) => {
    node.addEventListener("mouseenter", () => {
      node.style.transform = "scale(1.05) translateY(-4px)";
      node.style.boxShadow = "0 12px 30px rgba(18, 20, 22, 0.12)";
    });

    node.addEventListener("mouseleave", () => {
      node.style.transform = "";
      node.style.boxShadow = "";
    });
  });
}

/* ====================================== */
/* CLUSTER CARD ANIMATION                 */
/* ====================================== */

function initClusterCardAnimation() {
  const clusterCard = document.querySelector(".cluster-card");

  if (!clusterCard) return;

  // Subtle pulse on load
  clusterCard.style.animation = "clusterPulse 1.2s ease-out";
}

// Add dynamic keyframes for cluster pulse
function injectDynamicStyles() {
  const style = document.createElement("style");
  style.textContent = `
    @keyframes clusterPulse {
      0% {
        transform: scale(0.95);
        opacity: 0;
      }
      50% {
        transform: scale(1.02);
      }
      100% {
        transform: scale(1);
        opacity: 1;
      }
    }
  `;
  document.head.appendChild(style);
}

/* ====================================== */
/* PREVIEW PANEL INTERACTIONS             */
/* ====================================== */

function initPreviewInteractions() {
  const previewClusters = document.querySelectorAll(".preview-cluster");
  const previewDetail = document.querySelector(".preview-detail");

  if (!previewClusters.length || !previewDetail) return;

  previewClusters.forEach((cluster) => {
    cluster.addEventListener("click", () => {
      previewClusters.forEach((c) => c.style.borderColor = "");
      cluster.style.borderColor = "rgba(77, 102, 87, 0.6)";

      const title = cluster.querySelector("strong").textContent;
      previewDetail.innerHTML = `
        <h4>${title}</h4>
        <p>
          Key developments summarized while preserving direct access to publishers.
        </p>
        <p style="color: var(--ink-lighter); font-size: 12px; margin-top: 8px;">
          Click to see full story cluster with all source articles.
        </p>
      `;
    });
  });
}

/* ====================================== */
/* HEADER SCROLL EFFECT                   */
/* ====================================== */

function initHeaderScrollEffect() {
  const header = document.querySelector(".site-header");

  if (!header) return;

  let lastScrollY = 0;

  window.addEventListener("scroll", () => {
    const currentScrollY = window.scrollY;

    if (currentScrollY > 50) {
      header.style.boxShadow = "var(--shadow-md)";
    } else {
      header.style.boxShadow = "var(--shadow-sm)";
    }

    lastScrollY = currentScrollY;
  });
}

/* ====================================== */
/* KEYBOARD NAVIGATION                    */
/* ====================================== */

function initKeyboardNavigation() {
  document.addEventListener("keydown", (e) => {
    // Skip to main content (Alt+M or Cmd+M)
    if ((e.altKey || e.metaKey) && e.key === "m") {
      e.preventDefault();
      const mainEl = document.querySelector("main");
      if (mainEl) {
        mainEl.focus({ preventScroll: true });
        mainEl.scrollIntoView({ behavior: "smooth" });
      }
    }

    // Navigate to first section (Alt+1)
    if ((e.altKey || e.metaKey) && e.key === "1") {
      e.preventDefault();
      const section = document.querySelector(".hero");
      if (section) {
        section.scrollIntoView({ behavior: "smooth" });
      }
    }
  });
}

/* ====================================== */
/* PREFERENCE DETECTION                   */
/* ====================================== */

function initMotionPreferences() {
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  if (prefersReducedMotion) {
    document.documentElement.style.setProperty(
      "--transition-base",
      "0ms cubic-bezier(0.4, 0, 0.2, 1)",
    );
    document.documentElement.style.setProperty(
      "--transition-slow",
      "0ms cubic-bezier(0.4, 0, 0.2, 1)",
    );
  }

  // Listen for preference changes
  window.matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change", (e) => {
    if (e.matches) {
      document.documentElement.style.setProperty(
        "--transition-base",
        "0ms cubic-bezier(0.4, 0, 0.2, 1)",
      );
    } else {
      document.documentElement.style.setProperty(
        "--transition-base",
        "240ms cubic-bezier(0.4, 0, 0.2, 1)",
      );
    }
  });
}

/* ====================================== */
/* INITIALIZATION                         */
/* ====================================== */

function initializePageInteractions() {
  // Inject dynamic styles
  injectDynamicStyles();

  // Core interactions
  initTopicInteractions();
  initCounterAnimations();
  initScrollReveal();
  initSmoothScroll();

  // Enhancements
  initPublisherNodeAnimations();
  initClusterCardAnimation();
  initPreviewInteractions();
  initHeaderScrollEffect();
  initKeyboardNavigation();
  initMotionPreferences();

  // Initial cluster display
  const clusterTitle = document.getElementById("clusterTitle");
  if (clusterTitle) {
    const cluster = clusterExamples[0];
    clusterTitle.textContent = cluster.title;

    const metrics = document.querySelectorAll(".cluster-metrics span");
    if (metrics[0]) metrics[0].textContent = `${cluster.sources} Sources`;
    if (metrics[1]) metrics[1].textContent = `${cluster.articles} Articles`;
  }
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializePageInteractions);
} else {
  initializePageInteractions();
}

/* ====================================== */
/* PERFORMANCE MONITORING                 */
/* ====================================== */

// Log Core Web Vitals (if available)
if ("web-vital" in window) {
  // This would integrate with web-vitals library if needed
  // For now, we rely on browser's built-in performance APIs
}

// Performance observer for interaction-to-next-paint
if ("PerformanceObserver" in window) {
  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        // Log or send metrics to analytics
        // console.log("Performance entry:", entry);
      }
    });

    observer.observe({ entryTypes: ["largest-contentful-paint", "layout-shift"] });
  } catch (e) {
    // Observer not supported
  }
}
