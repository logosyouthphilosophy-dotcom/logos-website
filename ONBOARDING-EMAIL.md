# Logos member emails

Two emails, both plain text, both sent by Apps Script with `GmailApp`.

1. **Onboarding** — fires on every `register-interest` submission.
2. **Portal reminder** — fires four days later, only to people who registered
   and never created a portal account. Run by `apps-script/PortalReminder.gs`.

Both use `{{name}}` and nothing else dynamic.

Structure and voice follow the "Welcome to Logos: Essay Competition Details"
email: the opening line that promises next steps, the two paragraphs of context,
bare section titles, flowing prose rather than bullets for what you get out of
it, hyphen bullets only for the guidelines, and the signature block with the
address and reply-to-unsubscribe line.

No mention of chapter leads or ambassador places anywhere, since neither has
been announced.

---

## 1. Onboarding email

### Subject

```
Welcome to Logos: your membership and the members portal
```

### Body

```
Hi {{name}},

Thanks for registering with Logos. Here's some useful information, and what
we'd love for you to do next.

Logos is a youth-led philosophy organization founded in the UAE. Philosophy
usually gets locked behind a university door, even though it's one of the most
useful subjects there is: as a way to think clearly, and as a way to figure out
what you actually believe which is why we want more highschoolers to have
access to it.

We're Aleesha Naeem and Smayan Sethi, the founders of Logos, and we started it
in Dubai. Philosophy faces a lot of stigma here, and when it does come up,
people tend to treat it like a hobby rather than a real skill. We wanted that
to change, starting with the region we're from and then going global.

Set up your members portal account

This is the one thing we need from you, and it takes no more than thirty
seconds. Go to logosjournal.org/members, choose "Create account" and use this
same email address, the one we're writing to, so we can match your account to
your membership. Pick a password and explore the portal. The portal is where
all member opportunities are managed: workshop recordings and handouts, reading
lists, and a noticeboard with announcements and deadlines.

The competition

Write an essay on any philosophical topic you want. This can include Ethics,
metaphysics, the nature of time, or anything that fascinates you. Our main
requirement is that you make an original contribution to the field rather than
a summary of what other philosophers have already said. That's how new ideas in
philosophy actually happen, and we want students getting that experience early.

Guidelines:
- 1,000 to 3,000 words, not counting your reference list
- Any topic, no set theme
- An original, sustained argument, not a summary of existing ideas
- Judged by a panel that includes Oxford PPE graduates, on the quality of your
  writing and the strength of your argument
- Written in English, submitted as a PDF
- Cited in APA style with a full reference list
- The writing has to be yours. Essays with AI-written text, including AI text
  run through a humanizer, are disqualified automatically.

Deadline: December 15.

What do you get out of being a member?

Every member gets access to writing and subject workshops with professors and
working philosophers. Our first, a one-hour online session on how to write
philosophically with Professor Lizzie Fricker, who taught philosophy at Oxford
for nearly thirty years, ran on 3 October. The recording and her two-page
handout are in the portal, and the handout is the one to read before you plan
your essay. We'll announce the next session on the noticeboard and on our
Instagram (https://www.instagram.com/logos_yp/). Don't worry if this is the
first time you've written anything like this. You'll also get updates on the
competition, including what the judges are actually looking for, before they go
out anywhere else. Top essays get published in our peer-reviewed journal. First
place gets an interview on our podcast, where we talk with professors and
experts in the field. First, second, and third place all win cash prizes. We're
also putting together a reference letter from us for top entrants to use on
university applications, plus a spot on our editorial team for the next round.

Stuck on a topic? Check our Instagram (https://www.instagram.com/logos_yp/), we
post prompts there. Or just email one of us. If you want to talk through an idea
before committing to it, or you have a question about the rules, send it over.
We'd rather help you land on a good argument than have you sit on a bad one. We
look forward to hearing your responses and keep an eye on this space for further
updates.

Aleesha & Smayan
Logos

--
Logos Youth Philosophy, Arabian Ranches, Dubai, United Arab Emirates
Don't want these emails? Just reply with the word unsubscribe.
```

---

## 2. Portal reminder email

Sent once, four days after registering, only if no portal account exists for
that address. Nobody gets it twice. Shorter than the onboarding email on
purpose: it has one job, and the person has already had the long version.

### Subject

```
Your Logos portal account isn't set up yet
```

### Body

```
Hi {{name}},

You registered with Logos a few days ago but haven't set up your members portal
account yet, so this is a nudge.

It takes no more than thirty seconds. Go to logosjournal.org/members, choose
"Create account" and use this same email address, the one we're writing to, so
we can match your account to your membership.

The portal is where all member opportunities are managed: workshop recordings
and handouts, reading lists, and a noticeboard with announcements and deadlines.
Professor Fricker's one-hour session on how to write philosophically is in there
now, with her two-page handout, and the handout is the one to read before you
plan your essay.

The competition deadline is December 15, and the full guidelines are at
logosjournal.org/submit.

If something went wrong when you tried to sign up, or you'd rather we just set
the account up for you, reply to this and we'll sort it.

Aleesha & Smayan
Logos

--
Logos Youth Philosophy, Arabian Ranches, Dubai, United Arab Emirates
Don't want these emails? Just reply with the word unsubscribe.
```

---

## Notes

**Send as plain text.** No `htmlBody`. The voice depends on it, and Gmail,
Outlook and Apple Mail all turn bare URLs into links on their own.

**The footer is on both.** Matching the signature block already in use. The
onboarding email is arguably transactional and would not need it, but having one
format for both is simpler to maintain and costs nothing.

**Keep `reminderBody_()` in `apps-script/PortalReminder.gs` in step with the
reminder text above.** The script holds the copy it actually sends; this file is
the reference.

**Word range.** 1,000 to 3,000, which is the current range. The earlier email
draft still says 2,500; that one is out of date.

**The workshop is past.** Both emails treat the Fricker session as held on
3 October with its recording in the portal, which is also the strongest reason
to go and create an account.
