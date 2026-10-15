const nodemailer = require("nodemailer");

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
      text: options.message || "", // Send text if provided
      html: options.html || "",    // Send HTML if provided
      attachments: options.attachments || [],
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully to:", options.email, "Message ID:", info.messageId);
    return info;
  } catch (error) {
    console.error("Error in sendEmail:", error);
    throw error;
  }
};

/**
 * Send Email OTP exclusively via SMTP (Nodemailer) - no MSG91 dependency or fallback
 */
exports.sendEmailOTP = async (email, otp, name = "User") => {
  try {
    const subject = `Your Prajwal Verification Code: ${otp}`;
    const message = `Hello,\n\nYour One-Time Password (OTP) for Prajwal email verification is: ${otp}\n\nThis OTP is valid for 10 minutes.\n\nBest regards,\nTeam Prajwal`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; border: 1px solid #eee; border-radius: 8px; padding: 32px 24px; background: #fafbfc;">
        <h2 style="color: #1e88e5; text-align: center;">Verify Your Email</h2>
        <p style="font-size: 16px; color: #222;">Hello,</p>
        <p style="font-size: 16px; color: #222;">Your One-Time Password (OTP) for Prajwal email verification is:</p>
        <div style="text-align: center; margin: 24px 0;">
          <span style="display: inline-block; background: #e3f2fd; color: #0d47a1; padding: 14px 28px; border-radius: 6px; font-size: 28px; font-weight: bold; letter-spacing: 6px;">${otp}</span>
        </div>
        <p style="font-size: 14px; color: #666; text-align: center;">This code is valid for 10 minutes. Please do not share it with anyone.</p>
        <p style="font-size: 14px; color: #888;">If you didn't request this code, you can safely ignore this email.</p>
        <p style="font-size: 16px; color: #222; margin-top: 24px;">Best regards,<br><b>Team Prajwal</b></p>
      </div>
    `;

    await exports.sendEmail({
      email,
      subject,
      message,
      html,
    });

    console.log("Email OTP successfully delivered via SMTP to:", email);
    return { success: true, message: "OTP sent successfully via SMTP" };
  } catch (smtpErr) {
    console.error("Failed to send OTP via SMTP:", smtpErr);
    return { success: false, message: smtpErr.message || "Failed to send email OTP" };
  }
};

