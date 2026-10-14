// The branded email the contact form sends. Table layout and inline styles
// only: that is what Gmail, Outlook and Apple Mail all render the same way.
// Dark ground, the site's coral, a monospace dossier header, the message as
// the hero, and a reply button that answers the sender directly.

const esc = (s = '') =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const CORAL = '#fb836d';
const PEACH = '#ffd2c4';
const INK = '#fff0f4';
const MUTE = '#9a9499';
const GROUND = '#0e0c0d';
const CARD = '#171416';
const LINE = '#2a2427';
const MONO = "ui-monospace,'SF Mono',Menlo,Consolas,monospace";
const SANS = "-apple-system,'Segoe UI',Helvetica,Arial,sans-serif";
const SERIF = "Georgia,'Times New Roman',serif";

export function contactEmail({ name = '', from = '', message = '' }) {
  const when = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles', weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  }).format(new Date());
  const who = name.trim() || 'Someone';
  const first = who.split(/\s+/)[0];
  const replyHref = `mailto:${encodeURIComponent(from)}?subject=${encodeURIComponent(`Re: your note on davidpuerto.com`)}&body=${encodeURIComponent(`Hi ${first},\n\n`)}`;
  const body = esc(message).replace(/\r?\n/g, '<br>');

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark">
<title>New transmission from ${esc(who)}</title></head>
<body style="margin:0;padding:0;background:${GROUND};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(message.slice(0, 120))}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${GROUND};">
<tr><td align="center" style="padding:40px 16px;">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;">
    <tr><td style="padding:0 4px 18px;font:500 11px/1.4 ${MONO};letter-spacing:2.4px;text-transform:uppercase;color:${MUTE};">
      <span style="color:${CORAL};">&#9679;</span>&nbsp; davidpuerto.com <span style="color:${CORAL};">//</span> new transmission
    </td></tr>
    <tr><td style="background:${CARD};border:1px solid ${LINE};border-top:3px solid ${CORAL};border-radius:14px;padding:36px 36px 32px;">
      <p style="margin:0 0 6px;font:500 11px/1.4 ${MONO};letter-spacing:2px;text-transform:uppercase;color:${MUTE};">From</p>
      <p style="margin:0 0 4px;font:400 34px/1.1 ${SERIF};color:${INK};">${esc(who)}</p>
      <p style="margin:0 0 28px;font:400 15px/1.5 ${SANS};"><a href="mailto:${esc(from)}" style="color:${CORAL};text-decoration:none;">${esc(from)}</a></p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td style="border-left:3px solid ${CORAL};padding:4px 0 4px 18px;font:400 17px/1.65 ${SANS};color:${INK};">${body}</td>
      </tr></table>
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:32px;"><tr>
        <td style="background:${CORAL};border-radius:999px;">
          <a href="${replyHref}" style="display:inline-block;padding:13px 26px;font:600 15px/1 ${SANS};color:#140e0f;text-decoration:none;">Reply to ${esc(first)} &rarr;</a>
        </td>
      </tr></table>
    </td></tr>
    <tr><td style="padding:18px 4px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td style="font:400 11px/1.6 ${MONO};letter-spacing:1px;color:${MUTE};">RECEIVED&nbsp; ${esc(when).toUpperCase()}<br>VIA&nbsp; CONTACT FORM &middot; DAVIDPUERTO.COM</td>
        <td align="right" style="font:italic 400 15px/1.2 ${SERIF};color:${PEACH};">build the thing<br>before it exists.</td>
      </tr></table>
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;

  const text = `New transmission from davidpuerto.com\n\nFrom: ${who} <${from}>\nReceived: ${when}\n\n${message}\n`;
  return { html, text, subject: `New transmission: ${who}`.slice(0, 120) };
}
