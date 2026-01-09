let isScrolling = false;
let currentIndex = 0;
let isDiffGridActive = false;
let isInteracting = false;

let targetScroll = 0;
let currentScroll = 0;
const ease = 0.08;

const sections = Array.from(document.querySelectorAll(".section"));

Element.prototype.tilt = function (options) {
  const config = {
    angle: options?.angle ?? 10,
    invert: options?.invert ?? false,
    perspective: options?.perspective ?? 1000,
    reset: options?.reset ?? true,
    scale: options?.scale ?? 1,
    transformElement: options?.transformElement
      ? this.querySelector(options.transformElement)
      : this,
    transitionEasing:
      options?.transitionEasing ?? "cubic-bezier(.03,.98,.52,.99)",
    transitionSpeed: options?.transitionSpeed ?? 1500,
  };

  let timeout;

  const setTransition = () => {
    config.transformElement.style.transition = `transform ${config.transitionSpeed}ms ${config.transitionEasing}`;
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      config.transformElement.style.transition = "";
    }, config.transitionSpeed);
  };

  const handleOver = () => {
    setTransition();
    this.style.setProperty("--tilt-perspective", `${config.perspective}px`);
    this.style.setProperty("--tilt-scale", config.scale);
  };

  const handleMove = (e) => {
    const rect = this.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const xRot = (config.angle / (rect.height / 2)) * (rect.height / 2 - y);
    const yRot = (config.angle / (rect.width / 2)) * (rect.width / 2 - x);

    this.style.setProperty("--tilt-x", `${xRot * -1}deg`);
    this.style.setProperty("--tilt-y", `${yRot}deg`);
  };

  const handleOut = () => {
    this.style.setProperty("--tilt-scale", 1);
    if (config.reset) {
      this.style.setProperty("--tilt-x", "0deg");
      this.style.setProperty("--tilt-y", "0deg");
    }
    setTransition();
  };

  this.addEventListener("mouseenter", handleOver);
  this.addEventListener("mousemove", handleMove);
  this.addEventListener("mouseleave", handleOut);

  config.transformElement.style.willChange = "transform";
  config.transformElement.style.transform =
    "perspective(var(--tilt-perspective)) scale(var(--tilt-scale)) rotateX(var(--tilt-x)) rotateY(var(--tilt-y))";
};

// (RIPPLE / CURSOR / TILT)
$(function () {
  $("#section01").ripples({
    resolution: 512,
    dropRadius: 4,
    perturbance: 0.03,
    interactive: false,
  });

  const canvas = document.querySelector("#cursor");
  const ctx = canvas.getContext("2d");

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener("resize", resize);

  let mx = canvas.width / 2;
  let my = canvas.height / 2;
  let cx = mx;
  let cy = my;

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    cx += (mx - cx) * 0.15;
    cy += (my - cy) * 0.15;

    ctx.beginPath();
    ctx.arc(cx, cy, 18, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.fill();

    requestAnimationFrame(render);
  }
  render();

  window.addEventListener("mousemove", (e) => {
    mx = e.clientX;
    my = e.clientY;
    $("#section01").ripples("drop", mx, my, 14, 0.02);
  });

  document.querySelectorAll("[data-tilt]").forEach((el) => {
    el.tilt({ angle: 10, scale: 1.02, perspective: 800 });
  });
});

// SCROLL TO SECTION
function scrollToSection(index) {
  if (index < 0 || index >= sections.length) return;
  if (isScrolling) return;

  isScrolling = true;
  currentIndex = index;
  isDiffGridActive = sections[index].classList.contains("diff-grid-section");

  gsap.to(window, {
    scrollTo: sections[index].offsetTop,
    duration: 1,
    ease: "power2.out",
    onComplete: () => (isScrolling = false),
  });
}

const col1 = document.querySelector(".col-1");
const col2 = document.querySelector(".col-2");
const col3 = document.querySelector(".col-3");

function getMaxScroll() {
  const h = Math.max(col1.scrollHeight, col2.scrollHeight, col3.scrollHeight);
  return Math.max(0, h - window.innerHeight);
}
function isFooter(index) {
  return sections[index]?.classList.contains("contact-section");
}
//  SINGLE WHEEL CONTROLLER
window.addEventListener(
  "wheel",
  (e) => {
    if (isScrolling || isInteracting) return;

    const isFooterActive = isFooter(currentIndex);
    if (isFooterActive) {
      e.deltaY > 0 ? null : scrollToSection(currentIndex - 1);
      return;
    }

    if (isDiffGridActive) {
      const maxScroll = getMaxScroll();
      const delta = e.deltaY;

      const canDown = targetScroll < maxScroll;
      const canUp = targetScroll > 0;

      if ((delta > 0 && canDown) || (delta < 0 && canUp)) {
        e.preventDefault();
        targetScroll += delta * 0.9;
        targetScroll = Math.max(0, Math.min(maxScroll, targetScroll));
        return;
      }

      if (delta < 0 && targetScroll === 0) {
        isDiffGridActive = false;
        scrollToSection(currentIndex - 1);
        return;
      }

      if (delta > 0 && targetScroll === maxScroll) {
        isDiffGridActive = false;
        scrollToSection(currentIndex + 1);
        return;
      }

      return;
    }

    e.deltaY > 0
      ? scrollToSection(currentIndex + 1)
      : scrollToSection(currentIndex - 1);
  },
  { passive: false }
);

// DIFF GRID FILM RENDER
const offsetSide = -1000;
const offsetMid = 120;

function renderDiffGrid() {
  currentScroll += (targetScroll - currentScroll) * ease;

  col1.style.transform = `translateY(${offsetSide + currentScroll}px)`;
  col3.style.transform = `translateY(${offsetSide + currentScroll}px)`;
  col2.style.transform = `translateY(${offsetMid - currentScroll}px)`;

  requestAnimationFrame(renderDiffGrid);
}
renderDiffGrid();

window.addEventListener("resize", () => {
  targetScroll = Math.min(targetScroll, getMaxScroll());
});

// CASE SLIDER (AUTO + DRAG + CLICK SAFE)
document.addEventListener("DOMContentLoaded", () => {
  const sliders = document.querySelectorAll(".case-slider");
  const menus = document.querySelectorAll(".case-menu li");
  const sliderInstances = [];

  function initSlider(slider) {
    const track = slider.querySelector(".case-track");
    const slides = slider.querySelectorAll(".case-inner");

    let index = 0;
    let timer = null;
    let startX = 0;
    let currentX = 0;
    let dragging = false;

    const slideWidth = () => slider.offsetWidth;

    function moveTo(i, animate = true) {
      index = (i + slides.length) % slides.length;
      track.style.transition = animate ? "transform 0.6s ease" : "none";
      track.style.transform = `translateX(-${index * slideWidth()}px)`;
    }

    function startAuto() {
      stopAuto();
      timer = setInterval(() => moveTo(index + 1), 2500);
    }

    function stopAuto() {
      if (timer) clearInterval(timer);
    }

    slider.addEventListener("mousedown", (e) => {
      isInteracting = true;
      dragging = true;
      startX = e.clientX;
      currentX = 0;
      stopAuto();
      track.style.transition = "none";
    });

    slider.addEventListener("mousemove", (e) => {
      if (!dragging) return;
      currentX = e.clientX - startX;
      track.style.transform = `translateX(${
        currentX - index * slideWidth()
      }px)`;
    });

    function endDrag() {
      if (!dragging) return;
      dragging = false;
      isInteracting = false;

      if (Math.abs(currentX) > slideWidth() * 0.25) {
        currentX < 0 ? moveTo(index + 1) : moveTo(index - 1);
      } else {
        moveTo(index);
      }
      startAuto();
    }

    slider.addEventListener("mouseup", endDrag);
    slider.addEventListener("mouseleave", endDrag);

    slider.addEventListener("wheel", (e) => {
      e.stopPropagation();
    });

    window.addEventListener("resize", () => moveTo(index, false));

    return { startAuto, stopAuto };
  }

  sliders.forEach((slider) => {
    sliderInstances.push(initSlider(slider));
  });

  sliderInstances[0]?.startAuto();

  // MENU CLICK
  menus.forEach((menu, i) => {
    menu.addEventListener("click", () => {
      isInteracting = true;

      menus.forEach((m) => m.classList.remove("active"));
      menu.classList.add("active");

      sliders.forEach((slider, idx) => {
        const active = idx === i;
        slider.classList.toggle("active", active);
        active
          ? sliderInstances[idx].startAuto()
          : sliderInstances[idx].stopAuto();
      });

      setTimeout(() => {
        isInteracting = false;
      }, 600);
    });
  });
});

//(MENU CLICK)

const goSection03 = document.getElementById("goSection03");

if (goSection03) {
  goSection03.addEventListener("click", (e) => {
    e.preventDefault();
    isInteracting = true;

    scrollToSection(2);

    setTimeout(() => {
      isInteracting = false;
    }, 10000);
  });
}

//FIXED BG TEXT SCROLL ANIMATION
gsap.registerPlugin(ScrollTrigger);

gsap.to(".bg-left", {
  x: 0,
  scrollTrigger: {
    trigger: "#wrap",
    start: "top top",
    end: "bottom bottom",
    scrub: 1,
  },
});

gsap.to(".bg-right", {
  x: 0,
  scrollTrigger: {
    trigger: "#wrap",
    start: "top top",
    end: "bottom bottom",
    scrub: 1,
  },
});

const scrollDown = document.querySelector(".scroll-down");

if (scrollDown) {
  scrollDown.addEventListener("click", () => {
    scrollToSection(1);
  });
}

// HEADER NAV
const headerLinks = document.querySelectorAll("header nav a");

headerLinks.forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();

    const text = link.textContent.trim();

    switch (text) {
      case "Visual Archive":
        scrollToSection(1);
        break;

      case "Digital Experience":
        scrollToSection(2);
        break;
      case "Skill":
        scrollToSection(3);
        break;

      case "Certificate":
        scrollToSection(4);
        break;
      default:
        console.warn(`No section mapped for: ${text}`);
        break;
    }
  });
});
ScrollTrigger.create({
  trigger: ".contact-section",
  start: "top bottom",
  onEnter: () => {
    gsap.to(".fixed-bg-text", { opacity: 0, duration: 0.4 });
  },
  onLeaveBack: () => {
    gsap.to(".fixed-bg-text", { opacity: 1, duration: 0.4 });
  },
});
