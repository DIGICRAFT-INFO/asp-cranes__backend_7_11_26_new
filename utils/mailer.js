const nodemailer = require('nodemailer');

/**
 * Create transporter using SMTP settings from .env
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

const isMailConfigured = () => !!(process.env.SMTP_USER && process.env.SMTP_PASS);

/**
 * Send career application confirmation to the applicant
 */
const sendCareerApplicationConfirmation = async ({ to, applicantName, jobTitle, companyEmail }) => {
  if (!isMailConfigured()) {
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

/**
 * Send a custom reply email to a contact enquiry
 */
const sendContactReply = async ({ to, toName, from, subject, body, cc, bcc }) => {
  if (!isMailConfigured()) {
    throw new Error('SMTP not configured. Please set SMTP_USER and SMTP_PASS in environment variables.');
  }
  const transporter = createTransporter();
  const mailOptions = {
    from: `"ASP Cranes" <${process.env.SMTP_USER}>`,
    to: `"${toName}" <${to}>`,
    subject: subject || 'Reply from ASP Cranes',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fff;">
        <div style="background: #dc2626; padding: 20px 28px;">
          <h1 style="color: #fff; margin: 0; font-size: 20px;">ASP Cranes</h1>
          <p style="color: rgba(255,255,255,0.8); margin: 3px 0 0; font-size: 12px;">Aadishakti Projects · Raipur, Chhattisgarh</p>
        </div>
        <div style="padding: 28px 32px;">
          <p style="color: #374151; line-height: 1.8; white-space: pre-wrap;">${body}</p>
        </div>
        <div style="background: #f3f4f6; padding: 14px 28px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 11px; margin: 0;">
            ASP Cranes | Raipur, Chhattisgarh | info@aspcranes.com
          </p>
        </div>
      </div>
    `,
  };
  if (cc) mailOptions.cc = cc;
  if (bcc) mailOptions.bcc = bcc;
  if (from) mailOptions.replyTo = from;

  await transporter.sendMail(mailOptions);
  console.log(`[mailer] Reply sent to ${to}`);
};

/**
 * Send a bulk/broadcast email to multiple recipients
 */
const sendBulkEmail = async ({ recipients, subject, body, cc, bcc, senderEmail }) => {
  if (!isMailConfigured()) {
    throw new Error('SMTP not configured. Please set SMTP_USER and SMTP_PASS in environment variables.');
  }
  const transporter = createTransporter();
  const results = [];

  for (const recipient of recipients) {
    try {
      const mailOptions = {
        from: `"ASP Cranes" <${process.env.SMTP_USER}>`,
        to: recipient.email,
        subject: subject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fff;">
            <div style="background: #dc2626; padding: 20px 28px;">
              <h1 style="color: #fff; margin: 0; font-size: 20px;">ASP Cranes</h1>
              <p style="color: rgba(255,255,255,0.8); margin: 3px 0 0; font-size: 12px;">Aadishakti Projects · Raipur, Chhattisgarh</p>
            </div>
            <div style="padding: 28px 32px;">
              ${recipient.name ? `<p style="color:#374151;">Dear <strong>${recipient.name}</strong>,</p>` : ''}
              <p style="color: #374151; line-height: 1.8; white-space: pre-wrap;">${body}</p>
            </div>
            <div style="background: #f3f4f6; padding: 14px 28px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 11px; margin: 0;">
                ASP Cranes | Raipur, Chhattisgarh | info@aspcranes.com
              </p>
            </div>
          </div>
        `,
      };
      if (cc) mailOptions.cc = cc;
      if (bcc) mailOptions.bcc = bcc;
      if (senderEmail) mailOptions.replyTo = senderEmail;
      await transporter.sendMail(mailOptions);
      results.push({ email: recipient.email, status: 'sent' });
    } catch (err) {
      results.push({ email: recipient.email, status: 'failed', error: err.message });
    }
  }
  return results;
};

module.exports = { sendCareerApplicationConfirmation, sendContactReply, sendBulkEmail, isMailConfigured };
