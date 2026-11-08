/* ===== Logos Youth Philosophy, shared script =====
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

/* ---------- submit feedback on the registration forms ---------- */
function initFormFeedback(){
  document.querySelectorAll("form[data-netlify]").forEach(form=>{
    form.addEventListener("submit", ()=>{
      const btn = form.querySelector("button[type=submit]");
      if(!btn || btn.getAttribute("aria-busy") === "true") return;
      btn.setAttribute("aria-busy","true");
      btn.textContent = "Registering";
    });
  });
}
document.addEventListener("DOMContentLoaded", initFormFeedback);

/* ---------- Scroll reveal ----------------------------------------------
   Safety first, because an earlier version of this hid whole sections on the
   live site. The rule: nothing is ever hidden by CSS alone. This function adds
   the `reveal` class AND the `has-reveal` scope only after it has confirmed
   IntersectionObserver exists and the visitor has not asked for reduced
   motion. If the script never runs, fails to parse, or throws, no class is
   added and every section renders normally. A watchdog reveals everything if
   the observer has not reported within 1.5s, and any throw reveals all. */
var REVEAL_SEL = [
  ".hero > .wrap > *",
  ".page-head > .wrap > *",
  "section.block > .wrap > h2",
  "section.block > .wrap > p",
  ".split > div",
  ".index-head",
  ".index-body > *",
  ".cards > .card",
  ".benefits > .benefit",
  ".res-grid > .res-card",
  ".stats .stat",
  ".founders > .founder",
  ".ws-facts > div",
  ".guidelines > li",
  ".faq details",
  ".notice", ".callout", ".contact-cta", ".empty-note",
  ".portal-step", ".reg-panel", ".ornament",
  ".quote-band .q-inner", ".partners .label"
].join(",");

/* Count a stat up to the number already written in the markup. If this never
   runs the final figure is simply there, because that is what the HTML says. */
function countUp(stat){
  var el = stat.querySelector(".num");
  if(!el || el.dataset.counted) return;
  var m = String(el.textContent).trim().match(/^(\d[\d,]*)(.*)$/);
  if(!m) return;
  el.dataset.counted = "1";
  var target = parseInt(m[1].replace(/,/g, ""), 10), suffix = m[2], final = m[1] + suffix;
  if(!isFinite(target) || target <= 0) return;
  var dur = 1100, t0 = performance.now();
  (function step(t){
    var p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(target * e).toLocaleString() + suffix;
    if(p < 1) requestAnimationFrame(step); else el.textContent = final;
  })(t0);
}

function initReveal(){
  try{
    if(document.getElementById("hubView")) return;          // portal has its own flow
    if(!("IntersectionObserver" in window)) return;
    if(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    var els = Array.prototype.slice.call(document.querySelectorAll(REVEAL_SEL));
    if(!els.length) return;

    els.forEach(function(el){
      el.classList.add("reveal");
      var sibs = el.parentElement
        ? Array.prototype.filter.call(el.parentElement.children, function(c){ return c.classList.contains("reveal"); })
        : [];
      var i = sibs.indexOf(el);
      if(i > 0) el.style.transitionDelay = Math.min(i, 5) * 70 + "ms";
    });
    document.documentElement.classList.add("has-reveal");

    var showAll = function(){ els.forEach(function(el){ el.classList.add("is-in"); }); };
    var reported = false;
    var io = new IntersectionObserver(function(entries){
      reported = true;
      entries.forEach(function(e){
        if(!e.isIntersecting) return;
        e.target.classList.add("is-in");
        if(e.target.classList.contains("stat")) countUp(e.target);
        io.unobserve(e.target);
      });
    }, {rootMargin: "0px 0px -8% 0px", threshold: 0.04});
    els.forEach(function(el){ io.observe(el); });

    setTimeout(function(){ if(!reported){ io.disconnect(); showAll(); } }, 1500);
    window.addEventListener("beforeprint", showAll);
  }catch(e){
    document.documentElement.classList.remove("has-reveal");
    Array.prototype.forEach.call(document.querySelectorAll(".reveal"), function(el){
      el.classList.add("is-in");
    });
  }
}

/* nav lifts off the page once you scroll */
function initStickyNav(){
  var bar = document.querySelector(".topbar");
  if(!bar) return;
  var on = function(){ bar.classList.toggle("is-stuck", window.scrollY > 8); };
  window.addEventListener("scroll", on, {passive: true});
  on();
}

/* run now, not on DOMContentLoaded: this file is loaded at the end of <body>,
   so the markup is ready and the first paint already shows the hidden state,
   which avoids a flash of content that then disappears */
initReveal();
initStickyNav();
