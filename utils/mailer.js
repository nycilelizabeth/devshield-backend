// ============================================
// utils/mailer.js — Email Notification System
//
// Uses Nodemailer with Gmail to send real emails.
//
// Setup: Add these to your .env file:
//   EMAIL_USER=yourgmail@gmail.com
//   EMAIL_PASS=your_gmail_app_password
//
// HOW TO GET GMAIL APP PASSWORD:
//   1. Go to myaccount.google.com
//   2. Security → 2-Step Verification (enable it)
//   3. Security → App Passwords
//   4. Create app password for "Mail"
//   5. Copy the 16-character password to EMAIL_PASS
// ============================================

const nodemailer = require('nodemailer')

// Create reusable transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    }
  })
}

// ── SEND EMAIL ──
// Returns true if sent, false if failed (never throws)
const sendEmail = async ({ to, subject, html, text }) => {
  // Skip if email not configured
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log('📧 Email skipped — EMAIL_USER or EMAIL_PASS not set in .env')
    console.log(`   Would have sent: "${subject}" to ${to}`)
    return false
  }

  try {
    const transporter = createTransporter()
    const info = await transporter.sendMail({
      from:    `"DevShield 🛡" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
      text: text || subject
    })
    console.log(`✅ Email sent: ${info.messageId}`)
    return true
  } catch (err) {
    // Never crash the main request because of email failure
    console.error('❌ Email failed:', err.message)
    return false
  }
}

// ── PRE-BUILT EMAIL TEMPLATES ──

const sendBreachAlert = async ({ to, userName, email, breachCount, breaches }) => {
  return sendEmail({
    to,
    subject: `🚨 Data Breach Alert — ${email} found in ${breachCount} breach(es)`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1e293b, #7f1d1d); padding: 30px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 22px;">🛡 DevShield Security Alert</h1>
          <p style="color: #fca5a5; margin: 8px 0 0;">Data Breach Detected</p>
        </div>
        <div style="background: #fff8f8; border: 2px solid #fca5a5; border-radius: 0 0 12px 12px; padding: 30px;">
          <p style="font-size: 16px; color: #1e293b;">Hi <strong>${userName}</strong>,</p>
          <div style="background: #fef2f2; border: 1px solid #fca5a5; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="color: #dc2626; font-weight: bold; font-size: 18px; margin: 0;">
              🚨 ${email} was found in ${breachCount} data breach(es)
            </p>
          </div>
          <p style="color: #64748b; font-size: 14px;">The following services were breached:</p>
          <ul style="color: #1e293b; font-size: 14px;">
            ${breaches.slice(0,5).map(b => `<li style="margin-bottom: 6px;"><strong>${b.title || b.name}</strong> — ${b.date || 'Date unknown'}</li>`).join('')}
          </ul>
          <div style="background: #1e293b; color: white; border-radius: 8px; padding: 16px; margin-top: 20px;">
            <p style="margin: 0 0 8px; font-weight: bold;">⚡ Immediate Actions Required:</p>
            <ol style="margin: 0; padding-left: 20px; font-size: 14px; color: #94a3b8;">
              <li>Change your password on ALL affected services immediately</li>
              <li>Enable two-factor authentication on those accounts</li>
              <li>Check if you reused that password anywhere else</li>
              <li>Save your new strong passwords in DevShield Vault</li>
            </ol>
          </div>
          <a href="http://localhost:5173/breach" style="display:inline-block;margin-top:20px;background:#dc2626;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">
            View in DevShield →
          </a>
        </div>
      </div>
    `
  })
}

const sendWelcomeEmail = async ({ to, userName }) => {
  return sendEmail({
    to,
    subject: '🛡 Welcome to DevShield — Your Security Platform',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1e293b, #1e3a5f); padding: 30px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">🛡 DevShield</h1>
          <p style="color: #60a5fa; margin: 8px 0 0; font-size: 14px;">Developer Security Platform</p>
        </div>
        <div style="background: white; border: 1px solid #e2e8f0; border-radius: 0 0 12px 12px; padding: 30px;">
          <h2 style="color: #1e293b;">Welcome, ${userName}! 👋</h2>
          <p style="color: #64748b; line-height: 1.6;">Your DevShield account is ready. Here's what you can do:</p>
          <div style="display: grid; gap: 12px; margin: 20px 0;">
            ${[
              ['🐛', 'Bug Tracker', 'Report and track bugs across your projects'],
              ['✅', 'Test Cases', 'Write and run test cases, track pass rates'],
              ['🔑', 'Password Vault', 'Store credentials with AES-256 encryption'],
              ['🛡', 'Breach Monitor', 'Check if your email was in a data breach'],
              ['🎣', 'Phishing Scanner', 'Analyze suspicious URLs before clicking'],
            ].map(([icon, title, desc]) => `
              <div style="display:flex;gap:12px;padding:12px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;">
                <span style="font-size:20px;">${icon}</span>
                <div><p style="margin:0;font-weight:bold;color:#1e293b;">${title}</p><p style="margin:4px 0 0;font-size:13px;color:#64748b;">${desc}</p></div>
              </div>
            `).join('')}
          </div>
          <a href="http://localhost:5173/dashboard" style="display:inline-block;background:#2563eb;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:8px;">
            Open DevShield →
          </a>
        </div>
      </div>
    `
  })
}

module.exports = { sendEmail, sendBreachAlert, sendWelcomeEmail }
