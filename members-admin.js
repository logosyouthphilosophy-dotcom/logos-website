/* ===== Logos members hub · team admin =====
   Config-driven CRUD: each section below describes a table, its columns,
   and how to show each row. Add a field here and it appears in the form. */
(function(){
  const D = window.LogosData;
  const $ = (s, el=document)=>el.querySelector(s);
  const $$ = (s, el=document)=>Array.from(el.querySelectorAll(s));
  const esc = (s)=>String(s==null?"":s).replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const fmt = (d)=>d ? new Date(d).toLocaleDateString("en-GB", {day:"numeric", month:"short", year:"numeric"}) : "";
  const toLocalInput = (iso)=>{ if(!iso) return ""; const d = new Date(iso); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0,16); };

  let sessionsCache = [];

  /* ---------- section definitions ---------- */
  const SECTIONS = [
    {
      key:"notices", label:"Notices", title:"Noticeboard",
      intro:"Pinned notices stay at the top. A notice with an expiry date drops into the archive after that day. Body supports **bold**, *italic* and [links](https://...). Blank line for a new paragraph.",
      fields:[
        {name:"title", label:"Title", type:"text", required:true},
        {name:"body", label:"Body", type:"textarea", required:true},
        {row:[
          {name:"category", label:"Category", type:"select", options:["general","deadline","workshop","journal","chapters"], default:"general"},
          {name:"author", label:"Signed by", type:"text", placeholder:"Logos team"}
        ]},
        {row:[
          {name:"published_at", label:"Publish at", type:"datetime-local", hint:"Leave blank to publish now. A future time schedules it."},
          {name:"expires_on", label:"Expires on", type:"date", hint:"Optional. Hidden from the main list after this day."}
        ]},
        {name:"pinned", label:"Pin to the top", type:"checkbox"}
      ],
      columns:["Notice","Category","Published","Expires"],
      row:(n)=>[
        `<span class="t">${esc(n.title)}</span><span class="sub">${esc(n.body).slice(0,120)}${n.body.length>120?"...":""}</span>`,
        `<span class="mh-pill ${esc(n.category)}">${esc(n.category)}</span>${n.pinned ? ' <span class="mh-pill">Pinned</span>' : ""}`,
        esc(fmt(n.published_at)), esc(n.expires_on ? fmt(n.expires_on+"T00:00:00") : "")
      ],
      prepare:(v)=>{ if(!v.published_at) delete v.published_at; else v.published_at = new Date(v.published_at).toISOString(); if(!v.expires_on) v.expires_on = null; }
    },
    {
      key:"resources", label:"Resources", title:"Workshop resources",
      intro:"Upload the file to the Logos Google Drive first (set sharing to anyone with the link, viewer), then paste the link here. Pick the workshop it belongs to so it groups correctly.",
      fields:[
        {name:"title", label:"Title", type:"text", required:true},
        {name:"description", label:"Description", type:"textarea", rows:3},
        {name:"url", label:"Link", type:"url", required:true, placeholder:"https://drive.google.com/..."},
        {row:[
          {name:"type", label:"Type", type:"select", options:["handout","slides","recording","reading","exercise","template","link"], default:"handout"},
          {name:"session_id", label:"Workshop", type:"select", optionsFrom:"sessions", allowNone:"General (no workshop)"}
        ]},
        {row:[
          {name:"sort", label:"Order", type:"number", default:0, hint:"Lower numbers first within a group."},
          {name:"start_here", label:"Mark as Start here", type:"checkbox"}
        ]},
        {name:"published", label:"Visible to members", type:"checkbox", default:true}
      ],
      columns:["Resource","Type","Workshop","Visible"],
      row:(r)=>[
        `<span class="t">${esc(r.title)}</span><span class="sub"><a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.url).slice(0,70)}</a></span>`,
        `${esc(r.type)}${r.start_here ? ' <span class="mh-pill start">Start here</span>' : ""}`,
        esc((sessionsCache.find(s=>s.id===r.session_id)||{}).title || "General"),
        r.published === false ? "Hidden" : "Yes"
      ],
      prepare:(v)=>{ v.sort = Number(v.sort||0); if(!v.session_id) v.session_id = null; }
    },
    {
      key:"sessions", label:"Workshops", title:"Workshops",
      intro:"A workshop with a future date shows as upcoming with its join link. After the date it moves to past and links to its resources. Times are entered in your local time.",
      fields:[
        {name:"title", label:"Title", type:"text", required:true},
        {row:[
          {name:"speaker", label:"Speaker", type:"text"},
          {name:"speaker_note", label:"Speaker note", type:"text", placeholder:"Emeritus Fellow, Magdalen College"}
        ]},
        {name:"description", label:"Description", type:"textarea", rows:3},
        {row:[
          {name:"starts_at", label:"Starts", type:"datetime-local"},
          {name:"duration_min", label:"Length (minutes)", type:"number", default:60}
        ]},
        {name:"join_url", label:"Join link", type:"url", placeholder:"Zoom or Meet link; can be added later"},
        {row:[
          {name:"sort", label:"Order", type:"number", default:0},
          {name:"cancelled", label:"Cancelled", type:"checkbox"}
        ]}
      ],
      columns:["Workshop","Speaker","When","Status"],
      row:(s)=>[
        `<span class="t">${esc(s.title)}</span>`, esc(s.speaker||""), esc(s.starts_at ? new Date(s.starts_at).toLocaleString("en-GB", {dateStyle:"medium", timeStyle:"short"}) : "TBC"),
        s.cancelled ? "Cancelled" : (s.starts_at && new Date(s.starts_at) > new Date() ? "Upcoming" : "Past")
      ],
      prepare:(v)=>{ v.sort = Number(v.sort||0); v.duration_min = v.duration_min ? Number(v.duration_min) : null; v.starts_at = v.starts_at ? new Date(v.starts_at).toISOString() : null; if(!v.join_url) v.join_url = null; }
    },
    {
      key:"key_dates", label:"Key dates", title:"Key dates",
      intro:"These appear in the strip at the top of the hub with a countdown. Dates older than two weeks disappear automatically.",
      fields:[
        {name:"label", label:"Label", type:"text", required:true},
        {name:"due_on", label:"Date", type:"date", required:true},
        {name:"description", label:"Description", type:"textarea", rows:2},
        {name:"url", label:"Details link", type:"text", placeholder:"/submit.html or a full URL"}
      ],
      columns:["Date","Label","Description"],
      row:(d)=>[esc(fmt(d.due_on+"T00:00:00")), `<span class="t">${esc(d.label)}</span>`, esc(d.description||"")],
      prepare:(v)=>{ if(!v.url) v.url = null; }
    },
    {
      key:"faqs", label:"FAQ", title:"FAQ",
      intro:"Short answers. If a question keeps arriving in the inbox, add it here.",
      fields:[
        {name:"question", label:"Question", type:"text", required:true},
        {name:"answer", label:"Answer", type:"textarea", required:true, rows:3},
        {name:"sort", label:"Order", type:"number", default:0}
      ],
      columns:["Question","Answer","Order"],
      row:(f)=>[`<span class="t">${esc(f.question)}</span>`, esc(f.answer).slice(0,140), esc(f.sort)],
      prepare:(v)=>{ v.sort = Number(v.sort||0); }
    },
    {
      key:"contacts", label:"Contacts", title:"Who to contact",
      intro:"Use the shared Logos inbox for anything members should write to. Personal emails do not need to be here.",
      fields:[
        {row:[
          {name:"name", label:"Name", type:"text", required:true},
          {name:"role", label:"Role or what to ask about", type:"text"}
        ]},
        {row:[
          {name:"email", label:"Email", type:"email"},
          {name:"sort", label:"Order", type:"number", default:0}
        ]},
        {name:"note", label:"Note", type:"text"}
      ],
      columns:["Name","Role","Email"],
      row:(c)=>[`<span class="t">${esc(c.name)}</span>`, esc(c.role||""), esc(c.email||"")],
      prepare:(v)=>{ v.sort = Number(v.sort||0); }
    },
    {
      key:"links", label:"Updates", title:"Philosophy updates",
      intro:"Outside philosophy worth a member's time: papers, essays, talks, videos, news. Not our own resources, those go under Workshop resources. Keep the note to one or two sentences saying why it is worth opening.",
      fields:[
        {name:"title", label:"Title", type:"text", required:true},
        {name:"url", label:"Link", type:"url", required:true, placeholder:"https://..."},
        {row:[
          {name:"source", label:"Source", type:"text", placeholder:"Aeon, Stanford Encyclopedia, a professor's name"},
          {name:"kind", label:"Kind", type:"select", options:["news","paper","video","essay","podcast","link"], default:"link"}
        ]},
        {name:"note", label:"Why it is worth reading", type:"textarea", rows:3},
        {row:[
          {name:"posted_on", label:"Posted on", type:"date", hint:"Leave blank for today."},
          {name:"sort", label:"Order", type:"number", default:0}
        ]},
        {name:"pinned", label:"Pin to the top", type:"checkbox"}
      ],
      columns:["Update","Kind","Source","Posted"],
      row:(l)=>[
        `<span class="t">${esc(l.title)}</span><span class="sub"><a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.url).slice(0,70)}</a></span>`,
        `${esc(l.kind)}${l.pinned ? ' <span class="mh-pill">Pinned</span>' : ""}`,
        esc(l.source || ""),
        esc(l.posted_on ? fmt(l.posted_on+"T00:00:00") : "")
      ],
      prepare:(v)=>{ if(!v.posted_on) delete v.posted_on; }
    }
  ];

  /* ---------- generic CRUD pane ---------- */
  function fieldHtml(f, value){
    const v = value === undefined || value === null ? (f.default !== undefined ? f.default : "") : value;
    const hint = f.hint ? `<span class="mh-small" style="text-transform:none;letter-spacing:0;font-weight:400;">${esc(f.hint)}</span>` : "";
    if(f.type === "checkbox"){
      return `<label class="mh-check"><input type="checkbox" name="${f.name}" ${v ? "checked" : ""}> ${esc(f.label)}</label>`;
    }
    if(f.type === "textarea"){
      return `<label>${esc(f.label)}<textarea name="${f.name}" rows="${f.rows||5}" ${f.required?"required":""}>${esc(v)}</textarea>${hint}</label>`;
    }
    if(f.type === "select"){
      let opts = f.options ? f.options.map(o=>({value:o, label:o})) : [];
      if(f.optionsFrom === "sessions") opts = sessionsCache.map(s=>({value:s.id, label:s.title}));
      const none = f.allowNone ? `<option value="">${esc(f.allowNone)}</option>` : "";
      return `<label>${esc(f.label)}<select name="${f.name}">${none}${opts.map(o=>`<option value="${esc(o.value)}" ${String(o.value)===String(v)?"selected":""}>${esc(o.label)}</option>`).join("")}</select>${hint}</label>`;
    }
    let val = v;
    if(f.type === "datetime-local") val = toLocalInput(v);
    return `<label>${esc(f.label)}<input type="${f.type}" name="${f.name}" value="${esc(val)}" ${f.required?"required":""} ${f.placeholder?`placeholder="${esc(f.placeholder)}"`:""}>${hint}</label>`;
  }
  function formHtml(sec, row){
    const parts = sec.fields.map(f=>f.row ? `<div class="mh-row">${f.row.map(x=>fieldHtml(x, row && row[x.name])).join("")}</div>` : fieldHtml(f, row && row[f.name]));
    return `<form class="mh-form" data-edit="${row ? esc(row.id) : ""}">
      ${parts.join("")}
      <div class="mh-actions">
        <button type="submit" class="btn btn-solid">${row ? "Save changes" : "Add"} &rarr;</button>
        ${row ? '<button type="button" class="mh-link" data-cancel>Cancel</button>' : ""}
        <span class="mh-msg" data-msg></span>
      </div>
    </form>`;
  }
  function readForm(sec, form){
    const v = {};
    const all = [];
    sec.fields.forEach(f=>f.row ? all.push(...f.row) : all.push(f));
    all.forEach(f=>{
      const el = form.elements[f.name];
      if(f.type === "checkbox") v[f.name] = el.checked;
      else v[f.name] = el.value.trim();
    });
    if(sec.prepare) sec.prepare(v);
    return v;
  }

  async function renderCrud(sec){
    const pane = $("#adminPane");
    const rows = await D.list(sec.key);
    if(sec.key === "sessions") sessionsCache = rows;
    pane.innerHTML = `
      <h2>${esc(sec.title)}</h2>
      <p class="intro">${esc(sec.intro)}</p>
      <div class="mh-card mh-editor" id="editor"><h3>New</h3>${formHtml(sec)}</div>
      <div class="mh-table-wrap"><table class="mh-table">
        <thead><tr>${sec.columns.map(c=>`<th>${esc(c)}</th>`).join("")}<th></th></tr></thead>
        <tbody>${rows.length ? rows.map(r=>`<tr data-id="${esc(r.id)}">${sec.row(r).map(c=>`<td>${c}</td>`).join("")}
          <td class="acts"><button type="button" class="mh-link" data-act="edit">Edit</button><button type="button" class="mh-link danger" data-act="delete">Delete</button></td></tr>`).join("")
          : `<tr><td colspan="${sec.columns.length+1}" class="mh-small" style="padding:22px;">Nothing yet.</td></tr>`}</tbody>
      </table></div>`;
    bindEditor(sec, rows);
  }
  function bindEditor(sec, rows){
    const pane = $("#adminPane");
    const editor = $("#editor");
    const hook = (form)=>{
      form.addEventListener("submit", async e=>{
        e.preventDefault();
        const msg = form.querySelector("[data-msg]"); const btn = form.querySelector("button[type=submit]");
        btn.disabled = true; msg.textContent = "Saving...";
        try{
          const v = readForm(sec, form);
          if(form.dataset.edit) await D.update(sec.key, form.dataset.edit, v);
          else await D.insert(sec.key, v);
          await renderCrud(sec);
        }catch(err){ msg.textContent = err.message; msg.classList.add("is-err"); btn.disabled = false; }
      });
      const cancel = form.querySelector("[data-cancel]");
      if(cancel) cancel.addEventListener("click", ()=>renderCrud(sec));
    };
    hook(editor.querySelector("form"));
    pane.querySelectorAll("[data-act]").forEach(b=>b.addEventListener("click", async ()=>{
      const id = b.closest("tr").dataset.id;
      const row = rows.find(r=>r.id === id);
      if(b.dataset.act === "edit"){
        editor.innerHTML = `<h3>Edit</h3>${formHtml(sec, row)}`;
        hook(editor.querySelector("form"));
        editor.scrollIntoView({behavior:"smooth", block:"start"});
      }else{
        if(!confirm("Delete this? This cannot be undone.")) return;
        try{ await D.remove(sec.key, id); await renderCrud(sec); }
        catch(err){ alert(err.message); }
      }
    }));
  }

  /* ---------- members pane ---------- */
  async function renderMembers(){
    const pane = $("#adminPane");
    const rows = await D.list("members");
    const pending = rows.filter(m=>m.status === "pending");
    const badge = (s)=>`<span class="mh-status ${esc(s)}">${esc(s.replace("_"," "))}</span>`;
    pane.innerHTML = `
      <h2>Members</h2>
      <p class="intro">Everyone who has created an account, plus any emails you pre-approve. Approve against the registration list. Roles: member (default), chapter lead (reserved for the chapters programme), team (can use this admin page).</p>
      <div class="mh-card mh-editor"><h3>Pre-approve emails</h3>
        <form class="mh-form" id="preapproveForm">
          <label>Emails, one per line or comma separated<textarea name="emails" rows="3" required placeholder="student@school.edu"></textarea></label>
          <div class="mh-row">
            <label>Role<select name="role"><option value="member">member</option><option value="chapter_lead">chapter lead</option><option value="team">team</option></select></label>
            <label>Chapter (optional)<input type="text" name="chapter" placeholder="City"></label>
          </div>
          <div class="mh-actions"><button type="submit" class="btn btn-solid">Approve these emails &rarr;</button><span class="mh-msg" data-msg></span></div>
        </form>
      </div>
      ${pending.length ? `<p class="mh-small" style="margin-bottom:8px;"><strong>${pending.length}</strong> waiting for approval.</p>` : ""}
      <div class="mh-table-wrap"><table class="mh-table">
        <thead><tr><th>Member</th><th>Status</th><th>Role</th><th>Chapter</th><th>Joined</th><th></th></tr></thead>
        <tbody>${rows.map(m=>`<tr data-id="${esc(m.id)}">
          <td><span class="t">${esc(m.name||"(no name yet)")}</span><span class="sub">${esc(m.email)}${m.school ? " · " + esc(m.school) : ""}</span></td>
          <td>${badge(m.status)}</td>
          <td><select class="mh-inline" data-role>${["member","chapter_lead","team"].map(r=>`<option value="${r}" ${m.role===r?"selected":""}>${r.replace("_"," ")}</option>`).join("")}</select></td>
          <td><input class="mh-inline" data-chapter value="${esc(m.chapter||"")}" placeholder="City" style="width:110px;"></td>
          <td>${esc(fmt(m.created_at))}</td>
          <td class="acts">
            ${m.status !== "approved" ? '<button type="button" class="mh-link" data-act="approve">Approve</button>' : ""}
            ${m.status !== "blocked" ? '<button type="button" class="mh-link danger" data-act="block">Block</button>' : ""}
            <button type="button" class="mh-link danger" data-act="delete">Remove</button>
          </td></tr>`).join("")}</tbody>
      </table></div>
      <p class="mh-small" style="margin-top:12px;">Role and chapter changes save when you leave the field.</p>`;
    $("#preapproveForm").addEventListener("submit", async e=>{
      e.preventDefault();
      const f = e.target, msg = f.querySelector("[data-msg]");
      const emails = f.emails.value.split(/[\s,;]+/).map(s=>s.trim().toLowerCase()).filter(s=>/@/.test(s));
      if(!emails.length){ msg.textContent = "No valid emails."; return; }
      msg.textContent = "Saving...";
      try{
        for(const email of emails){
          const existing = rows.find(m=>m.email === email);
          const patch = {role:f.role.value, status:"approved", chapter:f.chapter.value.trim() || null};
          if(existing) await D.update("members", existing.id, patch);
          else await D.insert("members", Object.assign({email}, patch));
        }
        await renderMembers();
      }catch(err){ msg.textContent = err.message; }
    });
    pane.querySelectorAll("[data-act]").forEach(b=>b.addEventListener("click", async ()=>{
      const id = b.closest("tr").dataset.id;
      try{
        if(b.dataset.act === "approve") await D.update("members", id, {status:"approved"});
        if(b.dataset.act === "block")   await D.update("members", id, {status:"blocked"});
        if(b.dataset.act === "delete"){ if(!confirm("Remove this member row? They will need to be approved again if they sign in.")) return; await D.remove("members", id); }
        await renderMembers();
      }catch(err){ alert(err.message); }
    }));
    pane.querySelectorAll("[data-role]").forEach(s=>s.addEventListener("change", async ()=>{
      try{ await D.update("members", s.closest("tr").dataset.id, {role:s.value}); }catch(err){ alert(err.message); }
    }));
    pane.querySelectorAll("[data-chapter]").forEach(i=>i.addEventListener("change", async ()=>{
      try{ await D.update("members", i.closest("tr").dataset.id, {chapter:i.value.trim() || null}); }catch(err){ alert(err.message); }
    }));
  }

  /* ---------- questions pane ---------- */
  async function renderQuestions(){
    const pane = $("#adminPane");
    const rows = await D.list("questions");
    pane.innerHTML = `
      <h2>Questions from members</h2>
      <p class="intro">Reply by email, then mark the question answered. If the same thing keeps coming up, add it to the FAQ.</p>
      ${rows.length ? rows.map(q=>`<div class="mh-q ${q.answered?"is-done":""}" data-id="${esc(q.id)}">
        <div class="from">${esc(q.email||"")} · ${esc(fmt(q.created_at))}${q.answered ? " · answered" : ""}</div>
        <p class="body">${esc(q.body)}</p>
        <div class="acts">
          ${q.email ? `<a href="mailto:${esc(q.email)}?subject=${encodeURIComponent("Your question to Logos")}">Reply by email</a>` : ""}
          <button type="button" class="mh-link" data-act="toggle">${q.answered ? "Mark unanswered" : "Mark answered"}</button>
          <button type="button" class="mh-link danger" data-act="delete">Delete</button>
        </div>
      </div>`).join("") : '<p class="mh-empty">No questions yet.</p>'}`;
    pane.querySelectorAll("[data-act]").forEach(b=>b.addEventListener("click", async ()=>{
      const el = b.closest(".mh-q"); const id = el.dataset.id; const q = rows.find(x=>x.id===id);
      try{
        if(b.dataset.act === "toggle") await D.update("questions", id, {answered:!q.answered});
        if(b.dataset.act === "delete"){ if(!confirm("Delete this question?")) return; await D.remove("questions", id); }
        await renderQuestions();
      }catch(err){ alert(err.message); }
    }));
  }

  /* ---------- nav ---------- */
  const PANES = [
    {key:"notices", label:"Notices"},
    {key:"resources", label:"Resources"},
    {key:"sessions", label:"Workshops"},
    {key:"key_dates", label:"Key dates"},
    {key:"faqs", label:"FAQ"},
    {key:"contacts", label:"Contacts"},
    {key:"links", label:"Updates"},
    {key:"members", label:"Members", render:renderMembers},
    {key:"questions", label:"Questions", render:renderQuestions}
  ];
  async function openPane(key){
    $$("#adminNav button").forEach(b=>b.classList.toggle("is-on", b.dataset.key === key));
    history.replaceState(null, "", "#" + key);
    $("#adminPane").innerHTML = '<p class="mh-loading">Loading</p>';
    try{
      const p = PANES.find(x=>x.key === key);
      if(p.render) await p.render();
      else{
        if(!sessionsCache.length) sessionsCache = await D.list("sessions");
        await renderCrud(SECTIONS.find(s=>s.key === key));
      }
    }catch(e){ $("#adminPane").innerHTML = `<p class="mh-msg is-err">${esc(e.message)}</p>`; }
  }
  async function buildNav(){
    const nav = $("#adminNav");
    let pendingN = 0, openQ = 0;
    try{
      const [m, q] = await Promise.all([D.list("members"), D.list("questions")]);
      pendingN = m.filter(x=>x.status === "pending").length;
      openQ = q.filter(x=>!x.answered).length;
    }catch(e){}
    nav.innerHTML = PANES.map(p=>{
      const n = p.key === "members" ? pendingN : (p.key === "questions" ? openQ : 0);
      return `<button type="button" data-key="${p.key}">${p.label}${n ? `<span class="n">${n}</span>` : ""}</button>`;
    }).join("");
    nav.addEventListener("click", e=>{ const b = e.target.closest("button"); if(b) openPane(b.dataset.key); });
  }

  /* ---------- boot ---------- */
  document.addEventListener("DOMContentLoaded", async ()=>{
    try{
      const session = await D.getSession();
      const me = session ? await D.me() : null;
      if(!me || me.status !== "approved" || me.role !== "team"){
        $("#loadingView").hidden = true;
        $("#deniedText").innerHTML = session
          ? 'This page is for the Logos team. <a href="members.html">Back to the members hub</a>.'
          : 'Sign in on the <a href="members.html">members hub</a> first.';
        $("#deniedView").hidden = false; return;
      }
      $("#demoBanner").hidden = !D.isDemo;
      $("#loadingView").hidden = true; $("#adminView").hidden = false;
      await buildNav();
      const start = (location.hash || "#notices").slice(1);
      openPane(PANES.some(p=>p.key === start) ? start : "notices");
    }catch(e){
      $("#loadingView").innerHTML = `<div class="wrap"><p class="mh-msg is-err">${esc(e.message)}</p></div>`;
    }
  });
})();
