/* ===== Logos members hub · demo data =====
   Used only when the page is opened with ?demo (or when Supabase is not
   configured yet). Lets you preview the hub without a database.
   Mirrors supabase/seed.sql. */
(function(){
  const day = 86400000;
  const now = Date.now();
  const iso = (ms)=>new Date(ms).toISOString();
  const S1 = "s-fricker";

  window.LOGOS_DEMO = {
    me: { id:"m-demo", email:"you@example.com", name:"Demo member", role:"team", status:"approved", chapter:null },

    sessions: [
      { id:S1, title:"How to write philosophy", speaker:"Professor Lizzie Fricker",
        speaker_note:"Taught philosophy at Oxford for nearly thirty years · Emeritus Fellow, Magdalen College",
        description:"Our first writing workshop. How to choose a narrow topic, find readings, structure an essay simply, and write plainly. Recording and handout below.",
        starts_at:"2026-10-03T12:30:00Z", duration_min:60, join_url:null, cancelled:false, sort:1 },
      { id:"s-next", title:"Next workshop (to be announced)", speaker:"TBC", speaker_note:null,
        description:"We will post the speaker and topic here first, then on Instagram and by email.",
        starts_at:iso(now + 40*day), duration_min:60, join_url:"https://meet.google.com/", cancelled:false, sort:2 }
    ],

    resources: [
      { id:"r1", session_id:S1, title:"How to Write a Philosophy Essay (handout)", type:"handout", start_here:true, published:true, sort:1,
        description:"Two-page notes from the workshop: choose a narrow topic, find your readings, do not skip the exegesis, work from an outline, structure it simply, write plainly, credit your sources.",
        url:"https://drive.google.com/file/d/1Sdas-YZbJeb7bxNT---VAn0RL0tc2O3C/view" },
      { id:"r2", session_id:S1, title:"Workshop recording", type:"recording", start_here:false, published:true, sort:2,
        description:"Full one-hour recording of the session with Professor Fricker, including the Q&A at the end. Large file; stream it from Drive rather than downloading.",
        url:"https://drive.google.com/file/d/1vw8mHIkn50Gm0H0wTwrbwGAySGY-42n_/view" },
      { id:"r3", session_id:S1, title:"Stanford Encyclopedia of Philosophy", type:"reading", start_here:false, published:true, sort:3,
        description:"Recommended in the workshop as the place to get an overview of a topic. Read a couple of the recent pieces each article cites, or the classic ones.",
        url:"https://plato.stanford.edu/" },
      { id:"r4", session_id:null, title:"Submission guidelines", type:"link", start_here:true, published:true, sort:10,
        description:"The full rules for the journal essay competition: eligibility, length, format, citations and the AI policy.",
        url:"/submit.html" }
    ],

    notices: [
      { id:"n1", title:"Welcome to the members hub", category:"general", pinned:true, author:"Aleesha & Smayan", published_at:iso(now), expires_on:null,
        body:"This is where we will post announcements, workshop recordings and resources from now on. Check back before each deadline, and use **Ask the team** at the bottom of the page if something is unclear." },
      { id:"n2", title:"Workshop recording and handout are up", category:"workshop", pinned:false, author:"Logos team", published_at:iso(now - day), expires_on:null,
        body:"The recording of Professor Fricker's session and the two-page handout are now in the resources section. The handout is the one to read before you plan your essay. Please do not share either outside the programme." },
      { id:"n3", title:"Essay competition closes 15 December", category:"deadline", pinned:false, author:"Logos team", published_at:iso(now - 2*day), expires_on:"2026-12-15",
        body:"Submissions for issue one close on **15 December 2026**. Essays are 1,000 to 3,000 words, in English, as a PDF with APA citations. Any essay containing AI-written text is disqualified automatically. Read the full guidelines on the [Submit page](/submit.html) before you send anything." },
      { id:"n4", title:"Chapter lead applications close 8 November", category:"chapters", pinned:false, author:"Logos team", published_at:iso(now - 5*day), expires_on:"2026-11-08",
        body:"If you applied to lead a chapter in your city, we will be in touch after the deadline. Chapters launch local events in January and February." },
      { id:"n5", title:"An older notice that has expired", category:"general", pinned:false, author:"Logos team", published_at:iso(now - 30*day), expires_on:"2026-10-01",
        body:"This one is past its expiry date, so it only shows under the archive toggle." }
    ],

    key_dates: [
      { id:"d1", label:"Chapter lead applications close", due_on:"2026-11-08", description:"Applications for the international chapters programme close. One chapter lead is chosen per city.", url:null },
      { id:"d2", label:"Essay competition deadline", due_on:"2026-12-15", description:"Submissions for issue one of the journal close. 1,000 to 3,000 words, PDF, APA citations.", url:"/submit.html" }
    ],

    faqs: [
      { id:"f1", sort:1, question:"Who is eligible to enter the competition?", answer:"Any student anywhere in the world who will be in high school on 15 December 2026, from Grade 9 (Year 10) to Grade 12 (Year 13). Your school does not need to teach philosophy." },
      { id:"f2", sort:2, question:"How long should my essay be?", answer:"Between 1,000 and 3,000 words, not counting your reference list." },
      { id:"f3", sort:3, question:"Is there a theme?", answer:"No. Write on any philosophical question you want to argue about. What we ask for is an argument you develop and defend yourself, not a summary of what others have said." },
      { id:"f4", sort:4, question:"Which citation style and format?", answer:"APA style, with a full reference list at the end. Submit as a PDF, in English." },
      { id:"f5", sort:5, question:"Can I use AI?", answer:"Only for early research, such as tracking down sources or checking what a term means. Any AI-written text, including AI text run through a humaniser, disqualifies the essay automatically." },
      { id:"f6", sort:6, question:"When is the next workshop?", answer:"We announce workshops here on the noticeboard first, then on Instagram (@logos_yp) and by email. Workshops are for registered students only." }
    ],

    contacts: [
      { id:"c1", sort:1, name:"Logos team inbox", role:"Anything about the journal, workshops or your account", email:"logosyouthphilosophy@gmail.com", note:"Emails come from this address. Check spam if you are missing one." },
      { id:"c2", sort:2, name:"Aleesha Naeem", role:"Co-Founder", email:"logosyouthphilosophy@gmail.com", note:null },
      { id:"c3", sort:3, name:"Smayan Sethi", role:"Co-Founder", email:"logosyouthphilosophy@gmail.com", note:null }
    ],

    members: [
      { id:"m-demo", email:"you@example.com", name:"Demo member", role:"team", status:"approved", chapter:null, school:null, created_at:iso(now - 10*day) },
      { id:"m2", email:"student@example.com", name:"A Student", role:"member", status:"pending", chapter:null, school:"Example School", created_at:iso(now - day) },
      { id:"m3", email:"lead@example.com", name:"A Chapter Lead", role:"chapter_lead", status:"approved", chapter:"Karachi", school:null, created_at:iso(now - 6*day) }
    ],

    questions: [
      { id:"q1", member_id:"m3", email:"lead@example.com", body:"Can I cite a podcast episode in APA?", answered:false, answer:null, created_at:iso(now - 2*day) }
    ]
  };
})();
