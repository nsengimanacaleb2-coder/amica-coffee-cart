// Wraps nodemailer so the rest of the app can call sendMail() without caring
// whether SMTP credentials have actually been configured yet.
// Add SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS / SMTP_FROM to your .env to activate it.
require('dotenv').config();
const nodemailer = require('nodemailer');

const isConfigured = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

const transporter = isConfigured
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  : null;

async function sendMail(to, subject, html) {
  if (!transporter) {
    console.log(`[mailer] SMTP not configured — skipping email "${subject}" to ${to}. Add SMTP_* vars to .env to send real emails.`);
    return { skipped: true };
  }
  try {
    return await transporter.sendMail({ from: process.env.SMTP_FROM || process.env.SMTP_USER, to, subject, html });
  } catch (err) {
    console.error('[mailer] Failed to send email:', err.message);
    return { skipped: true, error: err.message };
  }
}

module.exports = { sendMail };
