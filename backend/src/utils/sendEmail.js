const nodemailer = require("nodemailer")

// FREE dev mode: if EMAIL_USER/EMAIL_PASS are empty, the OTP is printed to
// the backend console so you can test without any paid service.
const sendEmail = async ({ to, subject, text }) => {
  const emailUser = process.env.EMAIL_USER
  const emailPass = process.env.EMAIL_PASS

  if (!emailUser || !emailPass) {
    console.log(`\n[DEV MODE EMAIL] To: ${to}`)
    console.log(`[DEV MODE EMAIL] Subject: ${subject}`)
    console.log(`[DEV MODE EMAIL] Body:\n${text}\n`)
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
    text,
  })

  return { delivered: true, devMode: false }
}

module.exports = sendEmail
