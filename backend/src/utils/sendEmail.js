const nodemailer = require("nodemailer")

// Shared HTML layout with inline styles so it looks great in any mail client.
const wrapper = (content, { title }) => `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
  </head>
  <body style="margin:0;padding:0;background:#f6f2f3;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f2f3;padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 24px 60px rgba(200,16,46,0.10);">
            <tr>
              <td align="center" style="background:linear-gradient(135deg,#7f0f22 0%,#c8102e 60%,#ff5c74 100%);padding:36px 24px 30px;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="center">
                      <table role="presentation" cellpadding="0" cellspacing="0" style="width:56px;height:56px;border-radius:50%;background:rgba(255,255,255,0.16);">
                        <tr>
                          <td align="center" style="font-size:30px;line-height:56px;">🩸</td>
                        </tr>
                      </table>
                      <div style="font-family:Arial,Helvetica,sans-serif;color:#ffffff;font-size:30px;font-weight:800;letter-spacing:1px;margin-top:12px;">Redora</div>
                      <div style="font-family:Arial,Helvetica,sans-serif;color:#ffd0d9;font-size:13px;letter-spacing:3px;text-transform:uppercase;margin-top:4px;">Blood Donation Platform</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:36px 36px 30px;">
                ${content}
              </td>
            </tr>
            <tr>
              <td style="background:#fdf6f7;padding:20px 36px;border-top:1px solid #f3d9de;">
                <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#9c7c84;line-height:1.6;text-align:center;">
                  You received this email because someone used this address on Redora.<br />
                  If that wasn't you, you can safely ignore this message.<br />
                  <span style="color:#c8102e;font-weight:bold;">Redora — every drop counts 🩸</span>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
`

const otpTemplate = ({ otp, expiresIn = "10 minutes" }) => wrapper(
  `
    <div style="text-align:center;">
      <div style="font-family:Arial,Helvetica,sans-serif;color:#241a1d;font-size:22px;font-weight:800;margin:0 0 8px;">Almost there! 👋</div>
      <p style="font-family:Arial,Helvetica,sans-serif;color:#6b7280;font-size:15px;line-height:1.7;margin:0 0 24px;">
        We've sent you this one-time password to verify your email address.<br />
        Use it to complete your Redora registration.
      </p>
      <div style="font-family:Arial,Helvetica,sans-serif;color:#6b7280;font-size:13px;font-weight:600;letter-spacing:2px;text-transform:uppercase;margin-bottom:12px;">Your verification code</div>
      <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="border-collapse:collapse;margin:0 auto;">
        <tr>
          <td style="background:linear-gradient(135deg,#fde8ec,#fff);border:2px solid #c8102e;border-radius:16px;padding:16px 24px;font-family:'Courier New',monospace;font-size:34px;font-weight:800;letter-spacing:8px;color:#c8102e;">
            <span style="-webkit-user-select:all;user-select:all;mso-user-select:all;">${otp}</span>
          </td>
        </tr>
      </table>
      <p style="font-family:Arial,Helvetica,sans-serif;color:#9ca3af;font-size:12.5px;margin:18px 0 0;">
        If you can't read the code, just select it with your mouse and press <strong style="color:#c8102e;">Ctrl&nbsp;+&nbsp;C</strong>.
      </p>
      <p style="font-family:Arial,Helvetica,sans-serif;color:#9ca3af;font-size:13px;margin:14px 0 0;">
        ⏳ This code is valid for <strong style="color:#c8102e;">${expiresIn}</strong>. Please don't share it with anyone.
      </p>
    </div>
  `,
  { title: "Redora — Verify your email" },
)

const resetPasswordTemplate = ({ name, resetLink, expiresIn = "1 hour" }) => wrapper(
  `
    <div style="text-align:center;">
      <div style="font-family:Arial,Helvetica,sans-serif;color:#241a1d;font-size:22px;font-weight:800;margin:0 0 8px;">Password reset 🔐</div>
      <p style="font-family:Arial,Helvetica,sans-serif;color:#6b7280;font-size:15px;line-height:1.7;margin:0 0 24px;">
        Hello <strong style="color:#241a1d;">${name}</strong>, a password reset was requested for your Redora account.
        Click the button below to set a new password.
      </p>
      <a href="${resetLink}" target="_blank" rel="noopener" style="display:inline-block;background:linear-gradient(135deg,#c8102e 0%,#ff5c74 100%);color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;text-decoration:none;padding:16px 44px;border-radius:50px;box-shadow:0 10px 24px rgba(200,16,46,0.30);">
        Reset your password
      </a>
      <p style="font-family:Arial,Helvetica,sans-serif;color:#9ca3af;font-size:13px;line-height:1.7;margin:24px 0 0;word-break:break-all;">
        Or copy this link:<br /><a href="${resetLink}" style="color:#c8102e;">${resetLink}</a>
      </p>
      <p style="font-family:Arial,Helvetica,sans-serif;color:#9ca3af;font-size:13px;margin:24px 0 0;">
        ⏳ This link is valid for <strong style="color:#c8102e;">${expiresIn}</strong>. If you didn't request this, you can safely ignore this email.
      </p>
    </div>
  `,
  { title: "Redora — Reset your password" },
)

// FREE dev mode: if EMAIL_USER/EMAIL_PASS are empty, the OTP is printed to
// the backend console so you can test without any paid service.
const sendEmail = async ({ to, subject, text, html }) => {
  const emailUser = process.env.EMAIL_USER
  const emailPass = process.env.EMAIL_PASS

  if (!emailUser || !emailPass) {
    console.log(`\n[DEV MODE EMAIL] To: ${to}`)
    console.log(`[DEV MODE EMAIL] Subject: ${subject}`)
    console.log(`[DEV MODE EMAIL] Body:\n${html || text}\n`)
    return { delivered: false, devMode: true }
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: emailUser, pass: emailPass },
  })

  await transporter.sendMail({
    from: `"Redora" <${emailUser}>`,
    to,
    subject,
    text: text || html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim(),
    html,
  })

  return { delivered: true, devMode: false }
}

module.exports = { sendEmail, otpTemplate, resetPasswordTemplate }
