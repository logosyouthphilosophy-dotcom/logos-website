/* ===== Logos Youth Philosophy — shared script =====
   1) bilingual (EN / AR) content dictionary + language toggle (RTL aware)
   2) university logo marquee                                            */

const FORM = "https://docs.google.com/forms/d/e/1FAIpQLSfkAxDSYLEVHVWdcsil99T5CN5R6HrI2BhUY_pSNj81jeEo5g/viewform?usp=sf_link";
const MAIL = "logosyouthphilosophy@gmail.com";

/* ---------- university logo marquee ---------- */
function buildMarquee(){
  const track = document.getElementById("uniTrack");
  if(!track) return;
  function item(file, alt, cls){
    return `<div class="uni"><img class="uni-logo ${cls}" src="logos/${file}" alt="${alt}"></div>`;
  }
  const unit =
    item("columbia.png","Columbia University","l-columbia") +
    item("uchicago.png","University of Chicago","l-uchicago") +
    item("oxford.png","University of Oxford","l-oxford") +
    item("cambridge.png","University of Cambridge","l-cambridge");
  // Repeat the set so one "copy" is wider than any screen, then duplicate that
  // copy once so translateX(-50%) loops seamlessly with no empty gaps.
  const copy = unit + unit + unit;
  track.innerHTML = copy + copy;
}

/* ---------- motion: scroll reveal ---------- */
function initReveal(){
  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const targets = document.querySelectorAll(
    ".hero-copy, .hero-art, .split > div, .card, .founder, .callout, .contact-cta, .empty-note, .quote-band .q-inner, .page-head .wrap > *, .ornament, .langs-badge, .faq details, .guidelines li, .res-card"
  );
  targets.forEach(el=>el.classList.add("reveal"));
  if(reduce || !("IntersectionObserver" in window)){
    targets.forEach(el=>el.classList.add("is-in"));
    return;
  }
  const io = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add("is-in"); io.unobserve(e.target); } });
  }, {threshold:0.12, rootMargin:"0px 0px -8% 0px"});
  targets.forEach(el=>io.observe(el));
}

/* ---------- motion: back-to-top ---------- */
function initBackToTop(){
  const btn = document.createElement("button");
  btn.className = "to-top"; btn.setAttribute("aria-label","Back to top");
  btn.innerHTML = "&#8593;";
  document.body.appendChild(btn);
  btn.addEventListener("click", ()=>window.scrollTo({top:0,behavior:"smooth"}));
  const onScroll = ()=>btn.classList.toggle("show", window.scrollY > 600);
  window.addEventListener("scroll", onScroll, {passive:true}); onScroll();
}

document.addEventListener("DOMContentLoaded", ()=>{
  document.body.classList.add("js");
  buildMarquee();
  initReveal();
  initBackToTop();
  requestAnimationFrame(()=>document.body.classList.add("loaded"));
});

/* ---------- mobile navigation ---------- */
function initMobileNav(){
  const menu = document.querySelector(".menu");
  const btn  = document.querySelector(".nav-toggle");
  if(!menu || !btn) return;

  const close = ()=>{ menu.classList.remove("open"); btn.setAttribute("aria-expanded","false"); };

  btn.addEventListener("click", ()=>{
    const open = menu.classList.toggle("open");
    btn.setAttribute("aria-expanded", open ? "true" : "false");
  });

  menu.querySelectorAll("a").forEach(a=>a.addEventListener("click", close));
  document.addEventListener("keydown", e=>{ if(e.key === "Escape") close(); });
  window.addEventListener("resize", ()=>{ if(window.innerWidth > 860) close(); });
}
document.addEventListener("DOMContentLoaded", initMobileNav);
