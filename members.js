/* ===== Logos members hub · page logic ===== */
(function(){
  const D = window.LogosData;
  const $ = (s, el=document)=>el.querySelector(s);
  const $$ = (s, el=document)=>Array.from(el.querySelectorAll(s));

  const views = { auth:$("#authView"), welcome:$("#welcomeView"), pending:$("#pendingView"), hub:$("#hubView"), loading:$("#loadingView") };
  // Set once the member has chosen to enter this tab's session, so a reload
  // inside the hub does not show the welcome gate again.
  const ENTERED_KEY = "logos.members.entered";
  const hasEntered = ()=>{ try{ return sessionStorage.getItem(ENTERED_KEY) === "1"; }catch(e){ return false; } };
  const setEntered = (on)=>{ try{ on ? sessionStorage.setItem(ENTERED_KEY, "1") : sessionStorage.removeItem(ENTERED_KEY); }catch(e){} };
  function show(name){
    Object.keys(views).forEach(k=>{ views[k].hidden = k !== name; });
    document.body.classList.toggle("mh-app-on", name === "hub");
    window.scrollTo({top:0});
  }

  /* ---------- tiny helpers ---------- */
  const esc = (s)=>String(s==null?"":s).replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  // minimal safe markdown: paragraphs, **bold**, *italic*, [text](url), bare urls
  function md(text){
    const safe = esc(text).replace(/\r/g,"");
    const inline = (s)=>s
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*([^*\n]+?)\*/g, "$1<em>$2</em>")
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]*)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
      .replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, '$1<a href="$2" target="_blank" rel="noopener">$2</a>')
      .replace(/\n/g, "<br>");
    return safe.split(/\n{2,}/).map(p=>"<p>"+inline(p)+"</p>").join("");
  }
  const DAY = 86400000;
  const fmtDate = (d, opts)=>new Date(d).toLocaleDateString("en-GB", opts || {day:"numeric", month:"long", year:"numeric"});
  const fmtTime = (d)=>new Date(d).toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"});
  function daysUntil(dateStr){
    const today = new Date(); today.setHours(0,0,0,0);
    const d = new Date(dateStr + "T00:00:00");
    return Math.round((d - today) / DAY);
  }
  function countdown(n){
    if(n < 0) return "Passed";
    if(n === 0) return "Today";
    if(n === 1) return "Tomorrow";
    if(n < 14) return "In " + n + " days";
    return "In " + Math.round(n/7) + " weeks";
  }
  function icsHref(label, dateStr, desc){
    const d = dateStr.replace(/-/g,"");
    const next = new Date(dateStr + "T00:00:00"); next.setDate(next.getDate()+1);
    const d2 = next.toISOString().slice(0,10).replace(/-/g,"");
    const body = ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Logos Youth Philosophy//Members hub//EN","BEGIN:VEVENT",
      "UID:"+d+"-"+label.replace(/\W+/g,"").toLowerCase()+"@logos",
      "DTSTAMP:"+new Date().toISOString().replace(/[-:]/g,"").slice(0,15)+"Z",
      "DTSTART;VALUE=DATE:"+d, "DTEND;VALUE=DATE:"+d2,
      "SUMMARY:Logos: "+label.replace(/[,;]/g," "),
      "DESCRIPTION:"+(desc||"").replace(/[\n,;]/g," "),
      "END:VEVENT","END:VCALENDAR"].join("\r\n");
    return "data:text/calendar;charset=utf-8," + encodeURIComponent(body);
  }
  function gcalHref(label, dateStr, desc){
    const d = dateStr.replace(/-/g,"");
    const next = new Date(dateStr + "T00:00:00"); next.setDate(next.getDate()+1);
    const d2 = next.toISOString().slice(0,10).replace(/-/g,"");
    return "https://calendar.google.com/calendar/render?action=TEMPLATE&text=" + encodeURIComponent("Logos: "+label) +
      "&dates=" + d + "/" + d2 + "&details=" + encodeURIComponent(desc||"");
  }
  const TYPE_LABEL = {handout:"Handout", slides:"Slides", recording:"Recording", reading:"Reading", exercise:"Exercise", template:"Template", link:"Link"};
  const CAT_LABEL = {general:"General", deadline:"Deadline", workshop:"Workshop", journal:"Journal", chapters:"Chapters"};
  const KIND_LABEL = {news:"News", paper:"Paper", video:"Video", essay:"Essay", podcast:"Podcast", link:"Link"};
  const PANE_TITLE = {board:"Noticeboard", dates:"Key dates", sessions:"Workshops", resources:"Resources",
    updates:"Explore philosophy beyond Logos", quickref:"Submitting", faq:"FAQ", contact:"The team", ask:"Ask the team"};

  /* ---------- auth view ---------- */
  const authMsg = $("#authMsg");
  function setMsg(el, text, err){ el.textContent = text || ""; el.classList.toggle("is-err", !!err); }
  function showTab(name){
    $$("[data-tabpane]").forEach(f=>{ f.hidden = f.dataset.tabpane !== name; });
    $$(".mh-tab").forEach(b=>b.classList.toggle("is-on", b.dataset.tab === name));
    setMsg(authMsg, "");
  }
  $$("[data-tab]").forEach(b=>b.addEventListener("click", ()=>showTab(b.dataset.tab)));
  $("#forgotBtn").addEventListener("click", ()=>showTab("reset"));

  async function withBusy(form, fn){
    const btn = form.querySelector("button[type=submit]");
    btn.disabled = true;
    try{ await fn(); }
    catch(e){ setMsg(authMsg, friendly(e.message), true); }
    finally{ btn.disabled = false; }
  }
  function friendly(m){
    m = m || "Something went wrong.";
    if(/invalid login credentials/i.test(m)) return "Wrong email or password. If you have not created an account yet, use the Create account tab.";
    if(/already registered/i.test(m)) return "There is already an account with that email. Sign in instead, or use Forgot your password.";
    if(/rate limit/i.test(m)) return "Too many attempts for now. Wait a few minutes and try again.";
    return m;
  }

  $("#signinForm").addEventListener("submit", e=>{
    e.preventDefault();
    const f = e.target;
    withBusy(f, async ()=>{
      await D.signIn(f.email.value.trim(), f.password.value);
      await route({gate:false});
    });
  });
  $("#signupForm").addEventListener("submit", e=>{
    e.preventDefault();
    const f = e.target;
    withBusy(f, async ()=>{
      await D.signUp(f.email.value.trim(), f.password.value, f.name.value.trim());
      const session = await D.getSession();
      if(session){ await route({gate:false}); }
      else { setMsg(authMsg, "Account created. Check your email to confirm it, then sign in."); showTab("signin"); }
    });
  });
  $("#resetForm").addEventListener("submit", e=>{
    e.preventDefault();
    const f = e.target;
    withBusy(f, async ()=>{
      await D.resetPassword(f.email.value.trim());
      setMsg(authMsg, "If that email has an account, a reset link is on its way. Check spam too.");
    });
  });
  $("#newPasswordForm").addEventListener("submit", e=>{
    e.preventDefault();
    const f = e.target;
    withBusy(f, async ()=>{
      await D.updatePassword(f.password.value);
      setMsg(authMsg, "Password saved.");
      await route({gate:false});
    });
  });
  $$("[data-signout]").forEach(b=>b.addEventListener("click", async ()=>{ setEntered(false); await D.signOut(); show("auth"); showTab("signin"); }));

  /* ---------- routing ---------- */
  let recovering = false;
  let pendingMe = null;
  /* opts.gate: when true (the default, used on page load) a returning member
     with a live session sees the welcome step instead of landing straight in
     the hub. Sign-in and sign-up pass gate:false because the member just acted. */
  async function route(opts){
    const gate = !(opts && opts.gate === false);
    show("loading");
    try{
      const session = await D.getSession();
      if(!session){ show("auth"); showTab(recovering ? "recovery" : "signin"); return; }
      if(recovering){ show("auth"); showTab("recovery"); return; }
      const me = await D.me();
      if(!me || me.status !== "approved"){
        $("#pendingEmail").textContent = (me && me.email) || (session.user && session.user.email) || "";
        $("#pendingText").textContent = me && me.status === "blocked"
          ? "This account does not have access to the hub. If you think that is a mistake, email the team."
          : "Your account is waiting for approval. The team checks new accounts against the registration list, usually within a day or two.";
        show("pending"); return;
      }
      if(gate && !hasEntered()){
        pendingMe = me;
        $("#welcomeName").textContent = (me.name || me.email.split("@")[0]).split(" ")[0];
        $("#welcomeEmail").textContent = me.email || (session.user && session.user.email) || "";
        show("welcome"); return;
      }
      setEntered(true);
      await renderHub(me);
      show("hub");
    }catch(e){
      console.error(e);
      show("auth"); setMsg(authMsg, friendly(e.message), true);
    }
  }
  $("#enterHubBtn").addEventListener("click", async ()=>{
    const btn = $("#enterHubBtn"); btn.setAttribute("aria-busy", "true");
    try{
      setEntered(true);
      const me = pendingMe || await D.me();
      await renderHub(me);
      show("hub");
    }catch(e){ console.error(e); show("auth"); setMsg(authMsg, friendly(e.message), true); }
    finally{ btn.removeAttribute("aria-busy"); }
  });
  D.onAuthChange((session, event)=>{
    if(event === "PASSWORD_RECOVERY"){ recovering = true; show("auth"); showTab("recovery"); }
    if(event === "SIGNED_OUT"){ recovering = false; }
  });
  if(location.hash && /type=recovery/.test(location.hash)) recovering = true;

  /* ---------- hub rendering ---------- */
  let data = null;
  let noticeCat = "all", showArchive = false, resType = "all", resQuery = "";
  const LAST_KEY = "logos.members.lastVisit";
  const lastVisit = Number(localStorage.getItem(LAST_KEY) || 0);

  async function renderHub(me){
    $("#helloName").textContent = (me.name || me.email.split("@")[0]).split(" ")[0];
    $("#adminLink").hidden = me.role !== "team";
    $("#demoBanner").hidden = !D.isDemo;
    data = await D.fetchAll();
    renderDates(); renderNotices(); renderResources(); renderSessions(); renderLinks(); renderFaq(); renderContacts(); initChecklist(); initPanes();
    localStorage.setItem(LAST_KEY, String(Date.now()));
  }

  function renderDates(){
    const el = $("#datesGrid");
    const items = (data.key_dates||[]).filter(d=>daysUntil(d.due_on) >= -14);
    if(!items.length){ el.innerHTML = '<p class="mh-empty">No upcoming dates.</p>'; return; }
    el.innerHTML = items.map(d=>{
      const n = daysUntil(d.due_on);
      const cls = n < 0 ? "is-past" : (n <= 7 ? "is-soon" : "");
      return `<div class="mh-date ${cls}">
        <span class="when">${esc(fmtDate(d.due_on+"T00:00:00", {weekday:"short", day:"numeric", month:"short"}))}</span>
        <span class="label">${esc(d.label)}</span>
        ${d.description ? `<p class="desc">${esc(d.description)}</p>` : ""}
        <span class="count">${countdown(n)}</span>
        <span class="acts">
          ${d.url ? `<a href="${esc(d.url)}">Details</a>` : ""}
          <a href="${gcalHref(d.label, d.due_on, d.description)}" target="_blank" rel="noopener">Google Calendar</a>
          <a href="${icsHref(d.label, d.due_on, d.description)}" download="logos-${esc(d.due_on)}.ics">.ics</a>
        </span>
      </div>`;
    }).join("");
  }

  function renderNotices(){
    const el = $("#noticeList");
    const today = new Date().toISOString().slice(0,10);
    let all = (data.notices||[]).filter(n=>new Date(n.published_at) <= new Date());
    const isExpired = (n)=>n.expires_on && n.expires_on < today;
    const expiredCount = all.filter(isExpired).length;
    let items = all.filter(n=>showArchive ? true : !isExpired(n));
    if(noticeCat !== "all") items = items.filter(n=>n.category === noticeCat);
    items.sort((a,b)=>(b.pinned - a.pinned) || (new Date(b.published_at) - new Date(a.published_at)));
    const tog = $("#archiveToggle");
    tog.hidden = expiredCount === 0;
    tog.textContent = showArchive ? "Hide expired notices" : `Show ${expiredCount} expired notice${expiredCount===1?"":"s"}`;
    if(!items.length){ el.innerHTML = '<p class="mh-empty">Nothing here yet.</p>'; return; }
    el.innerHTML = items.map(n=>{
      const isNew = lastVisit && new Date(n.published_at).getTime() > lastVisit;
      return `<article class="mh-notice ${esc(n.category)} ${n.pinned?"is-pinned":""} ${isExpired(n)?"is-expired":""}">
        <div class="meta">
          ${n.pinned ? '<span class="mh-pill">Pinned</span>' : ""}
          <span class="mh-pill ${esc(n.category)}">${esc(CAT_LABEL[n.category]||n.category)}</span>
          ${isNew ? '<span class="mh-pill new">New</span>' : ""}
          <span class="date">${esc(fmtDate(n.published_at))}${isExpired(n) ? " · expired" : ""}</span>
        </div>
        <h3>${esc(n.title)}</h3>
        <div class="body">${md(n.body)}</div>
        ${n.author ? `<p class="by">${esc(n.author)}</p>` : ""}
      </article>`;
    }).join("");
  }
  $("#noticeFilters").addEventListener("click", e=>{
    const b = e.target.closest("[data-cat]"); if(!b) return;
    noticeCat = b.dataset.cat;
    $$("#noticeFilters .mh-chip").forEach(c=>c.classList.toggle("is-on", c === b));
    renderNotices();
  });
  $("#archiveToggle").addEventListener("click", ()=>{ showArchive = !showArchive; renderNotices(); });

  function renderResources(){
    const el = $("#resourceGroups");
    let items = (data.resources||[]).filter(r=>r.published !== false);
    if(resType === "start") items = items.filter(r=>r.start_here);
    else if(resType !== "all") items = items.filter(r=>r.type === resType);
    if(resQuery){
      const q = resQuery.toLowerCase();
      items = items.filter(r=>(r.title+" "+(r.description||"")).toLowerCase().includes(q));
    }
    if(!items.length){ el.innerHTML = '<p class="mh-empty">No resources match. Try another filter.</p>'; return; }
    const sessions = data.sessions || [];
    const byId = Object.fromEntries(sessions.map(s=>[s.id, s]));
    const groups = new Map();
    items.forEach(r=>{
      const key = r.session_id && byId[r.session_id] ? r.session_id : "_general";
      if(!groups.has(key)) groups.set(key, []);
      groups.get(key).push(r);
    });
    const order = sessions.map(s=>s.id).filter(id=>groups.has(id)).concat(groups.has("_general") ? ["_general"] : []);
    el.innerHTML = order.map(key=>{
      const s = byId[key];
      const head = s
        ? `<h3>${esc(s.title)}</h3><span class="sub">${esc(s.speaker||"")}${s.starts_at ? " · " + esc(fmtDate(s.starts_at)) : ""}</span>`
        : `<h3>General resources</h3><span class="sub">Not tied to one workshop</span>`;
      const cards = groups.get(key).sort((a,b)=>a.sort-b.sort).map(r=>`
        <a class="mh-res" href="${esc(r.url)}" target="_blank" rel="noopener">
          <div class="top"><span class="type">${esc(TYPE_LABEL[r.type]||r.type)}</span>${r.start_here ? '<span class="mh-pill start">Start here</span>' : ""}</div>
          <h4>${esc(r.title)}</h4>
          ${r.description ? `<p>${esc(r.description)}</p>` : ""}
          <span class="open">Open &rarr;</span>
        </a>`).join("");
      return `<div class="mh-group" id="session-${esc(key)}"><div class="mh-group-head">${head}</div><div class="mh-res-grid">${cards}</div></div>`;
    }).join("");
  }
  $("#resTypeFilters").addEventListener("click", e=>{
    const b = e.target.closest("[data-type]"); if(!b) return;
    resType = b.dataset.type;
    $$("#resTypeFilters .mh-chip").forEach(c=>c.classList.toggle("is-on", c === b));
    renderResources();
  });
  $("#resSearch").addEventListener("input", e=>{ resQuery = e.target.value.trim(); renderResources(); });

  function renderSessions(){
    const el = $("#sessionList");
    const items = (data.sessions||[]).filter(s=>!s.cancelled);
    if(!items.length){ el.innerHTML = '<p class="mh-empty">No workshops scheduled yet. We post them here first.</p>'; return; }
    const now = Date.now();
    const up = items.filter(s=>s.starts_at && new Date(s.starts_at) > now).sort((a,b)=>new Date(a.starts_at)-new Date(b.starts_at));
    const past = items.filter(s=>!s.starts_at || new Date(s.starts_at) <= now).sort((a,b)=>new Date(b.starts_at||0)-new Date(a.starts_at||0));
    const hasRes = (s)=>(data.resources||[]).some(r=>r.session_id === s.id && r.published !== false);
    const card = (s, upcoming)=>`<div class="mh-session ${upcoming?"is-upcoming":""}">
      <div class="when">${s.starts_at ? esc(fmtDate(s.starts_at, {weekday:"short", day:"numeric", month:"short", year:"numeric"})) + `<small>${esc(fmtTime(s.starts_at))} your time${s.duration_min ? " · " + s.duration_min + " min" : ""}</small>` : "Date TBC"}</div>
      <div>
        <h3>${esc(s.title)}</h3>
        ${s.speaker ? `<p class="spk">${esc(s.speaker)}${s.speaker_note ? " · " + esc(s.speaker_note) : ""}</p>` : ""}
        ${s.description ? `<p>${esc(s.description)}</p>` : ""}
      </div>
      <div class="acts">
        ${upcoming && s.join_url ? `<a class="btn btn-solid" href="${esc(s.join_url)}" target="_blank" rel="noopener">Join link &rarr;</a>` : ""}
        ${upcoming && !s.join_url ? '<span class="mh-small">Join link posted nearer the time</span>' : ""}
        ${!upcoming && hasRes(s) ? `<a class="btn btn-outline" href="#session-${esc(s.id)}">Resources &rarr;</a>` : ""}
        ${!upcoming && !hasRes(s) ? '<span class="mh-small">Resources coming</span>' : ""}
      </div>
    </div>`;
    el.innerHTML =
      (up.length ? `<p class="mh-small" style="margin-bottom:4px;">Upcoming</p>` + up.map(s=>card(s,true)).join("") : `<p class="mh-empty">No upcoming workshop yet. We announce the next one here first.</p>`) +
      (past.length ? `<p class="mh-small" style="margin:22px 0 4px;">Past</p>` + past.map(s=>card(s,false)).join("") : "");
  }

  function renderLinks(){
    const el = $("#linkList");
    const items = (data.links||[]).slice().sort((a,b)=>(b.pinned - a.pinned) || (String(b.posted_on).localeCompare(String(a.posted_on))));
    if(!items.length){ el.innerHTML = '<p class="mh-empty">Nothing posted yet. The team adds things worth reading here.</p>'; return; }
    el.innerHTML = items.map(l=>`<a class="mh-link-card" href="${esc(l.url)}" target="_blank" rel="noopener">
      <span class="kind">${esc(KIND_LABEL[l.kind]||l.kind)}</span>
      ${l.pinned ? '<span class="mh-pill new" style="margin-left:6px;">Pinned</span>' : ""}
      <h3>${esc(l.title)}</h3>
      ${l.source ? `<p class="src">${esc(l.source)}${l.posted_on ? " &middot; " + esc(fmtDate(l.posted_on+"T00:00:00", {day:"numeric", month:"short"})) : ""}</p>` : ""}
      ${l.note ? `<p class="note">${esc(l.note)}</p>` : ""}
      <span class="go">Open</span>
    </a>`).join("");
  }

  function renderFaq(){
    const el = $("#faqList");
    const items = (data.faqs||[]).slice().sort((a,b)=>a.sort-b.sort);
    el.innerHTML = items.length ? items.map(f=>`<details><summary>${esc(f.question)}</summary><div class="faq-a">${md(f.answer)}</div></details>`).join("")
      : '<p class="mh-empty">No questions added yet.</p>';
  }

  function renderContacts(){
    const el = $("#contactList");
    const items = (data.contacts||[]).slice().sort((a,b)=>a.sort-b.sort);
    el.innerHTML = items.length ? items.map(c=>`<div class="mh-contact">
      <h3>${esc(c.name)}</h3>
      ${c.role ? `<p class="role">${esc(c.role)}</p>` : ""}
      ${c.email ? `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>` : ""}
      ${c.note ? `<p class="note">${esc(c.note)}</p>` : ""}
    </div>`).join("") : '<p class="mh-empty">Email logosyouthphilosophy@gmail.com.</p>';
  }

  let panesReady = false;
  function openPane(name, pushHash){
    if(!PANE_TITLE[name]) name = "board";
    $$(".mh-pane").forEach(s=>{ s.hidden = s.dataset.pane !== name; s.classList.toggle("is-on", s.dataset.pane === name); });
    $$(".mh-nav-item").forEach(b=>b.classList.toggle("is-on", b.dataset.pane === name));
    const title = $("#paneTitle"); if(title) title.textContent = PANE_TITLE[name];
    closeDrawer();
    if(pushHash !== false && location.hash.slice(1) !== name){
      history.replaceState(null, "", "#" + name);
    }
    window.scrollTo({top:0});
  }
  function closeDrawer(){
    const side = $("#mhSide"), scrim = $("#mhScrim"), burger = $("#mhBurger");
    if(side) side.classList.remove("is-open");
    if(scrim) scrim.hidden = true;
    if(burger) burger.setAttribute("aria-expanded", "false");
  }
  function initPanes(){
    if(panesReady){ openPane(location.hash.slice(1) || "board", false); return; }
    panesReady = true;
    $$(".mh-nav-item").forEach(b=>b.addEventListener("click", ()=>openPane(b.dataset.pane)));
    const burger = $("#mhBurger"), side = $("#mhSide"), scrim = $("#mhScrim");
    if(burger) burger.addEventListener("click", ()=>{
      const open = side.classList.toggle("is-open");
      scrim.hidden = !open;
      burger.setAttribute("aria-expanded", open ? "true" : "false");
    });
    if(scrim) scrim.addEventListener("click", closeDrawer);
    document.addEventListener("keydown", e=>{ if(e.key === "Escape") closeDrawer(); });
    // a resource anchor lives in another pane, so switch first and then scroll
    document.addEventListener("click", e=>{
      const a = e.target.closest('a[href^="#session-"]');
      if(!a) return;
      e.preventDefault();
      openPane("resources");
      const target = $(a.getAttribute("href"));
      if(target) target.scrollIntoView({behavior:"smooth", block:"start"});
    });
    window.addEventListener("hashchange", ()=>{
      const h = location.hash.slice(1);
      if(PANE_TITLE[h]) openPane(h, false);
    });
    openPane(location.hash.slice(1) || "board", false);
  }

  function initChecklist(){
    const KEY = "logos.members.checklist";
    let state = {};
    try{ state = JSON.parse(localStorage.getItem(KEY) || "{}"); }catch(e){}
    $$("#checklist input").forEach(cb=>{
      cb.checked = !!state[cb.dataset.key];
      cb.onchange = ()=>{ state[cb.dataset.key] = cb.checked; try{ localStorage.setItem(KEY, JSON.stringify(state)); }catch(e){} };
    });
  }

  $("#askForm").addEventListener("submit", async e=>{
    e.preventDefault();
    const f = e.target, msg = $("#askMsg");
    const btn = f.querySelector("button"); btn.disabled = true;
    try{
      await D.askQuestion(f.body.value.trim());
      f.reset(); setMsg(msg, "Sent. We will reply to the email on your account.");
    }catch(err){ setMsg(msg, err.message, true); }
    finally{ btn.disabled = false; }
  });

  /* ---------- go ---------- */
  document.addEventListener("DOMContentLoaded", ()=>{
    if(D.unconfigured && !D.isDemo){ setMsg(authMsg, "The hub is not connected to a database yet.", true); }
    route();
  });
})();
