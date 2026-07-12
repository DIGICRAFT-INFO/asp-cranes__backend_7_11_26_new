const nodemailer = require('nodemailer');

/**
 * Create transporter using SMTP settings from .env
 * Works with Gmail (App Password), Hostinger mail, or any SMTP provider.
 */
const createTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: parseInt(process.env.SMTP_PORT || '587') === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

/**
 * Send career application confirmation to the applicant
 */
const sendCareerApplicationConfirmation = async ({ to, applicantName, jobTitle, companyEmail }) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('[mailer] SMTP not configured — skipping career confirmation email');
    return;
  }
  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: `"ASP Cranes" <${process.env.SMTP_USER}>`,
      to,
      subject: `Application Received — ${jobTitle} | ASP Cranes`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fff;">
          <div style="background: #dc2626; padding: 24px 32px;">
            <h1 style="color: #fff; margin: 0; font-size: 22px;">ASP Cranes</h1>
            <p style="color: rgba(255,255,255,0.85); margin: 4px 0 0; font-size: 13px;">Aadishakti Projects · Raipur, Chhattisgarh</p>
          </div>
          <div style="padding: 32px;">
            <h2 style="color: #111827; margin-top: 0;">Hi ${applicantName},</h2>
            <p style="color: #374151; line-height: 1.7;">
              Thank you for applying for the <strong>${jobTitle}</strong> position at ASP Cranes.
              We have received your application and our team will review it shortly.
            </p>
            <div style="background: #f9fafb; border-left: 4px solid #dc2626; padding: 16px 20px; margin: 24px 0; border-radius: 4px;">
              <p style="margin: 0; color: #374151;"><strong>Position Applied:</strong> ${jobTitle}</p>
            </div>
            <p style="color: #374151; line-height: 1.7;">
              If your profile matches our requirements, we will get in touch with you for the next steps.
              If you have any questions, feel free to reach us at 
              <a href="mailto:${companyEmail || process.env.CONTACT_RECEIVER}" style="color: #dc2626;">${companyEmail || process.env.CONTACT_RECEIVER}</a>.
            </p>
            <p style="color: #374151; margin-top: 32px;">Best regards,<br/><strong>HR Team</strong><br/>ASP Cranes — Aadishakti Projects</p>
          </div>
          <div style="background: #f3f4f6; padding: 16px 32px; text-align: center;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              This is an automated confirmation. Please do not reply to this email.
            </p>
          </div>
        </div>
      `,
    });
    console.log(`[mailer] Career confirmation sent to ${to}`);
  } catch (err) {
    console.error('[mailer] Failed to send career confirmation:', err.message);
  }
};

module.exports = { sendCareerApplicationConfirmation };
