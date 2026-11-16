// Runs on every verified Netlify form submission (Netlify calls any function
// named "submission-created" automatically). For register-interest it hands the
// submission to the Apps Script that sends the onboarding email.
//
// This replaces the outgoing webhook. Apps Script answers every POST with a
// redirect, which the webhook counted as a failure: it retried, and after six
// "failures" Netlify switched the hook off without telling anyone. A function
// has no retries and nothing to switch off.
//
// LOGOS_ONBOARDING_URL is set in Netlify (Project configuration > Environment
// variables): the Apps Script web app URL including ?key=. It stays out of the
// repo because the repo is public and the key is what stops strangers using the
// script to send email.

export const handler = async (event) => {
  let payload;
  try {
    payload = JSON.parse(event.body).payload;
  } catch {
    console.error('submission-created: could not parse event body');
    return { statusCode: 200 };
  }

  if (!payload || payload.form_name !== 'register-interest') return { statusCode: 200 };

  const url = process.env.LOGOS_ONBOARDING_URL;
  if (!url) {
    console.error('submission-created: LOGOS_ONBOARDING_URL is not set, onboarding email not sent');
    return { statusCode: 200 };
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      redirect: 'follow',
    });
    const text = (await res.text()).slice(0, 100);
    console.log(`submission-created: ${payload.email || 'no email'} -> ${res.status} ${text}`);
  } catch (err) {
    console.error('submission-created: request to Apps Script failed', err);
  }
  return { statusCode: 200 };
};
