/* ===== Logos members hub · data layer =====
   One small API used by members.html and members-admin.html.
   Backend is Supabase when members-config.js is filled in,
   or the in-memory demo data when the page is opened with ?demo. */
(function(){
  const cfg = window.LOGOS_SUPABASE || {};
  const params = new URLSearchParams(location.search);
  const UNCONFIGURED = !cfg.url || !cfg.anonKey;
  const DEMO = params.has("demo");
  // Not configured and not in demo mode: a locked backend that signs nobody in.
  let LOCKED = !DEMO && UNCONFIGURED;

  const CONTENT_TABLES = ["sessions","resources","notices","key_dates","faqs","contacts","links"];

  /* ---------------- demo backend ---------------- */
  function demoBackend(){
    const db = JSON.parse(JSON.stringify(window.LOGOS_DEMO || {}));
    let signedIn = !LOCKED;
    const locked = ()=>{ if(LOCKED) throw new Error(UNCONFIGURED ? "The hub is not connected to its database yet. Fill in members-config.js (see MEMBERS-HUB.md)." : "The sign-in library could not be loaded. Check your connection and reload the page."); };
    const listeners = [];
    const uid = ()=>"demo-" + Math.random().toString(36).slice(2,9);
    const clone = (x)=>JSON.parse(JSON.stringify(x));
    const notify = ()=>listeners.forEach(cb=>cb(signedIn ? {user:{email:db.me.email}} : null));
    return {
      mode:"demo",
      async getSession(){ return signedIn ? {user:{email:db.me.email}} : null; },
      onAuthChange(cb){ listeners.push(cb); },
      async signIn(){ locked(); signedIn = true; notify(); },
      async signUp(){ locked(); signedIn = true; notify(); },
      async signOut(){ signedIn = false; notify(); },
      async resetPassword(){ },
      async updatePassword(){ },
      async me(){ return signedIn ? clone(db.me) : null; },
      async fetchAll(){
        const out = {};
        CONTENT_TABLES.forEach(t=>out[t] = clone(db[t] || []));
        return out;
      },
      async askQuestion(body){
        db.questions.push({ id:uid(), member_id:db.me.id, email:db.me.email, body, answered:false, answer:null, created_at:new Date().toISOString() });
      },
      async list(table){ return clone(db[table] || []); },
      async insert(table, row){ const r = Object.assign({id:uid(), created_at:new Date().toISOString()}, row); (db[table] = db[table] || []).push(r); return clone(r); },
      async update(table, id, patch){ const r = (db[table]||[]).find(x=>x.id===id); if(r) Object.assign(r, patch); return clone(r); },
      async remove(table, id){ db[table] = (db[table]||[]).filter(x=>x.id!==id); }
    };
  }

  /* ---------------- supabase backend ---------------- */
  function supabaseBackend(){
    if(!window.supabase || !window.supabase.createClient){
      throw new Error("Supabase client library did not load.");
    }
    const sb = window.supabase.createClient(cfg.url, cfg.anonKey);
    const fail = (err)=>{ if(err) throw new Error(err.message || String(err)); };
    const ORDER = {
      sessions:  [["sort",{ascending:true}],["starts_at",{ascending:true}]],
      resources: [["sort",{ascending:true}],["created_at",{ascending:true}]],
      notices:   [["pinned",{ascending:false}],["published_at",{ascending:false}]],
      key_dates: [["due_on",{ascending:true}]],
      faqs:      [["sort",{ascending:true}]],
      contacts:  [["sort",{ascending:true}]],
      members:   [["status",{ascending:true}],["created_at",{ascending:false}]],
      questions: [["answered",{ascending:true}],["created_at",{ascending:false}]],
      links:     [["pinned",{ascending:false}],["posted_on",{ascending:false}]]
    };
    function q(table){
      let s = sb.from(table).select("*");
      (ORDER[table]||[]).forEach(([col,opt])=>{ s = s.order(col, opt); });
      return s;
    }
    return {
      mode:"supabase",
      async getSession(){ const {data} = await sb.auth.getSession(); return data.session; },
      onAuthChange(cb){ sb.auth.onAuthStateChange((event, session)=>cb(session, event)); },
      async signIn(email, password){ const {error} = await sb.auth.signInWithPassword({email, password}); fail(error); },
      async signUp(email, password, name){
        const {error} = await sb.auth.signUp({email, password, options:{data:{name}}}); fail(error);
      },
      async signOut(){ await sb.auth.signOut(); },
      async resetPassword(email){
        const redirect = location.origin + location.pathname;
        const {error} = await sb.auth.resetPasswordForEmail(email, {redirectTo: redirect}); fail(error);
      },
      async updatePassword(password){ const {error} = await sb.auth.updateUser({password}); fail(error); },
      async me(){
        const {data, error} = await sb.rpc("my_membership"); fail(error);
        return (data && data[0]) || null;
      },
      async fetchAll(){
        const results = await Promise.all(CONTENT_TABLES.map(t=>q(t)));
        const out = {};
        CONTENT_TABLES.forEach((t,i)=>{
          const err = results[i].error;
          // A table that has not been created yet should not take the whole hub
          // down: that section renders empty and everything else still works.
          if(err && (err.code === "42P01" || /does not exist|schema cache/i.test(err.message || ""))){
            console.warn("Table " + t + " is missing. Run the SQL in supabase/schema.sql.");
            out[t] = [];
            return;
          }
          fail(err);
          out[t] = results[i].data || [];
        });
        return out;
      },
      async askQuestion(body){
        const me = await this.me(); if(!me) throw new Error("Not signed in.");
        const {error} = await sb.from("questions").insert({member_id:me.id, email:me.email, body}); fail(error);
      },
      async list(table){ const {data, error} = await q(table); fail(error); return data || []; },
      async insert(table, row){ const {data, error} = await sb.from(table).insert(row).select().single(); fail(error); return data; },
      async update(table, id, patch){ const {data, error} = await sb.from(table).update(patch).eq("id", id).select().single(); fail(error); return data; },
      async remove(table, id){ const {error} = await sb.from(table).delete().eq("id", id); fail(error); }
    };
  }

  try{
    window.LogosData = (DEMO || LOCKED) ? demoBackend() : supabaseBackend();
  }catch(e){
    // Library failed to load: lock the page rather than fall back to demo data.
    console.error(e);
    LOCKED = true;
    window.LogosData = Object.assign(demoBackend(), {mode:"demo", loadError:e.message});
  }
  window.LogosData.isDemo = DEMO;
  window.LogosData.unconfigured = UNCONFIGURED;
})();
