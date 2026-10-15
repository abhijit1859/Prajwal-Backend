const nodemailer = require("nodemailer");
const { sendOTPEmail } = require("../services/msg91EmailService");

/**
 * Generic email sending utility using Nodemailer
 * Note: Free-tier cloud providers like Render block outbound SMTP ports (25, 465, 587).
 * For OTP and authentication emails, sendEmailOTP uses MSG91 Email Connections HTTPS API.
 */
exports.sendEmail = async (options) => {
  try {
    const port = Number(process.env.SMTP_PORT) || 465;
    const isSecure = port === 465;
    const pass = (process.env.SMTP_PASS || "").replace(/\s+/g, "");

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: port,
      secure: isSecure,
      auth: {
        user: process.env.SMTP_MAIL,
        pass: pass,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    const mailOptions = {
      from: `"Prajwal Support" <${process.env.SMTP_MAIL}>`,
      to: options.email,
      subject: options.subject,
      text: options.message || "",
      html: options.html || "",
      attachments: options.attachments || [],
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(
      "Email sent successfully via SMTP to:",
      options.email,
      "Message ID:",
      info.messageId
    );
    return info;
  } catch (error) {
    console.error("Error in sendEmail:", error);
    throw error;
  }
};

/**
 * Send Email OTP via MSG91 Email Connections over HTTPS
 * Connects directly through MSG91's Gmail connection using integration_id
 */
exports.sendEmailOTP = async (email, otp, name = "User", expiryMinutes = 5) => {
  return await sendOTPEmail(email, otp, name, expiryMinutes);
};
