const nodemailer = require('nodemailer');

// Create reusable transporter
const createTransporter = () => {
  // Use environment variables for email config
  // Supports SMTP (SendGrid, Mailgun, Gmail, etc.)
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

const fromEmail = process.env.FROM_EMAIL || 'noreply@snappi.vip';
const fromName = process.env.FROM_NAME || 'Snappi';

/**
 * Send an email notification
 * @param {Object} options - { to, subject, text, html }
 */
const sendEmail = async (options) => {
  try {
    // Skip if SMTP is not configured
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.log('[Email] SMTP not configured, skipping email:', options.subject);
      return { success: false, message: 'SMTP not configured' };
    }

    const transporter = createTransporter();

    const mailOptions = {
      from: `${fromName} <${fromEmail}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('[Email] Sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('[Email] Failed to send:', error.message);
    return { success: false, message: error.message };
  }
};

/**
 * Notify brand when content is submitted for approval
 */
const notifyContentSubmitted = async (brandEmail, brandName, influencerName, campaignName, postUrl) => {
  return sendEmail({
    to: brandEmail,
    subject: `New Content Submitted - ${campaignName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a2e;">Content Submitted for Approval</h2>
        <p>Hi ${brandName},</p>
        <p><strong>${influencerName}</strong> has submitted content for your campaign <strong>"${campaignName}"</strong>.</p>
        <p><strong>Post URL:</strong> <a href="${postUrl}">${postUrl}</a></p>
        <p>Please log in to Snappi to review and approve the submission.</p>
        <a href="${process.env.FRONTEND_URL || 'https://snappi.vip'}/campaigns"
           style="display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 16px;">
          Review Submission
        </a>
        <p style="margin-top: 24px; color: #666; font-size: 12px;">— The Snappi Team</p>
      </div>
    `,
    text: `Hi ${brandName}, ${influencerName} has submitted content for "${campaignName}". Post URL: ${postUrl}. Log in to Snappi to review.`
  });
};

/**
 * Notify influencer when content is approved
 */
const notifyContentApproved = async (influencerEmail, influencerName, campaignName) => {
  return sendEmail({
    to: influencerEmail,
    subject: `Content Approved - ${campaignName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a2e;">Your Content Has Been Approved!</h2>
        <p>Hi ${influencerName},</p>
        <p>Great news! Your content submission for the campaign <strong>"${campaignName}"</strong> has been approved.</p>
        <p>The brand will now begin tracking the performance metrics of your post.</p>
        <p style="margin-top: 24px; color: #666; font-size: 12px;">— The Snappi Team</p>
      </div>
    `,
    text: `Hi ${influencerName}, your content for "${campaignName}" has been approved!`
  });
};

/**
 * Notify influencer when content is rejected
 */
const notifyContentRejected = async (influencerEmail, influencerName, campaignName, reason) => {
  return sendEmail({
    to: influencerEmail,
    subject: `Content Review Update - ${campaignName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a2e;">Content Review Update</h2>
        <p>Hi ${influencerName},</p>
        <p>Your content submission for the campaign <strong>"${campaignName}"</strong> needs revision.</p>
        ${reason ? `<p><strong>Feedback:</strong> ${reason}</p>` : ''}
        <p>Please review the feedback and resubmit your content.</p>
        <p style="margin-top: 24px; color: #666; font-size: 12px;">— The Snappi Team</p>
      </div>
    `,
    text: `Hi ${influencerName}, your content for "${campaignName}" needs revision. ${reason || ''}`
  });
};

/**
 * Notify brand when influencer is contacted
 */
const notifyInfluencerContacted = async (brandEmail, brandName, influencerName, campaignName) => {
  return sendEmail({
    to: brandEmail,
    subject: `Influencer Contacted - ${campaignName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a2e;">Influencer Contacted</h2>
        <p>Hi ${brandName},</p>
        <p>You have successfully contacted <strong>${influencerName}</strong> for the campaign <strong>"${campaignName}"</strong>.</p>
        <p>You will be notified once they respond.</p>
        <p style="margin-top: 24px; color: #666; font-size: 12px;">— The Snappi Team</p>
      </div>
    `,
    text: `Hi ${brandName}, you've contacted ${influencerName} for "${campaignName}".`
  });
};

/**
 * Notify about overdue submission
 */
const notifyOverdueSubmission = async (influencerEmail, influencerName, campaignName, dueDate) => {
  return sendEmail({
    to: influencerEmail,
    subject: `Submission Overdue - ${campaignName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #e53e3e;">Submission Overdue</h2>
        <p>Hi ${influencerName},</p>
        <p>Your content submission for the campaign <strong>"${campaignName}"</strong> was due on <strong>${new Date(dueDate).toLocaleDateString()}</strong>.</p>
        <p>Please submit your content as soon as possible.</p>
        <p style="margin-top: 24px; color: #666; font-size: 12px;">— The Snappi Team</p>
      </div>
    `,
    text: `Hi ${influencerName}, your submission for "${campaignName}" was due on ${new Date(dueDate).toLocaleDateString()}. Please submit ASAP.`
  });
};

module.exports = {
  sendEmail,
  notifyContentSubmitted,
  notifyContentApproved,
  notifyContentRejected,
  notifyInfluencerContacted,
  notifyOverdueSubmission
};
