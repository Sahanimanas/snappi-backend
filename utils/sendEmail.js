const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  // Create transporter
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  // Define email options
  const mailOptions = {
    from: `${process.env.FROM_NAME || 'Snappi'} <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text
  };

  // Send email
  const info = await transporter.sendMail(mailOptions);

  console.log('Email sent: %s', info.messageId);

  return info;
};

// Email templates
const generateContractEmail = ({
  influencerName,
  brandName,
  campaignName,
  contractTitle,
  contractContent,
  responseUrl
}) => {
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  return {
    subject: `Contract from ${brandName}${campaignName ? ` - ${campaignName}` : ''}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Contract from ${brandName}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background: #fff; }
          .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 30px; text-align: center; }
          .header h1 { color: #fff; margin: 0; font-size: 24px; }
          .content { padding: 30px; }
          .contract-box { background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; padding: 20px; margin: 20px 0; white-space: pre-wrap; font-family: inherit; }
          .contract-title { font-size: 18px; font-weight: 600; color: #1f2937; margin-bottom: 10px; }
          .buttons { text-align: center; margin: 30px 0; }
          .btn { display: inline-block; padding: 12px 24px; margin: 5px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px; }
          .btn-accept { background: #10b981; color: #fff; }
          .btn-reject { background: #ef4444; color: #fff; }
          .btn-connect { background: #3b82f6; color: #fff; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Contract from ${brandName}</h1>
          </div>
          <div class="content">
            <p>Hi ${influencerName},</p>
            <p>You have received a contract from <strong>${brandName}</strong>${campaignName ? ` for the campaign <strong>${campaignName}</strong>` : ''}.</p>

            <div class="contract-title">${contractTitle}</div>
            <div class="contract-box">${contractContent.replace(/\n/g, '<br>')}</div>

            <p>Please respond by clicking one of the options below:</p>

            <div class="buttons">
              <a href="${responseUrl}?action=accept" class="btn btn-accept">Accept Contract</a>
              <a href="${responseUrl}?action=reject" class="btn btn-reject">Reject Contract</a>
              <a href="${responseUrl}?action=connect" class="btn btn-connect">Connect with Brand</a>
            </div>

            <p style="font-size: 14px; color: #6b7280;">Or copy this link to respond: ${responseUrl}</p>
          </div>
          <div class="footer">
            <p>This email was sent via Snappi - Influencer Marketing Platform</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Hi ${influencerName},

You have received a contract from ${brandName}${campaignName ? ` for the campaign ${campaignName}` : ''}.

Contract: ${contractTitle}
---
${contractContent}
---

Please respond by visiting this link: ${responseUrl}

Best regards,
${brandName}
    `
  };
};

const generateAcceptanceNotificationEmail = ({
  brandName,
  brandEmail,
  influencerName,
  influencerEmail,
  campaignName,
  contractTitle
}) => {
  return {
    subject: `${influencerName} accepted your contract!`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background: #fff; }
          .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; }
          .header h1 { color: #fff; margin: 0; font-size: 24px; }
          .content { padding: 30px; }
          .success-box { background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Contract Accepted!</h1>
          </div>
          <div class="content">
            <div class="success-box">
              <h2 style="color: #059669; margin: 0 0 10px 0;">Great News!</h2>
              <p style="margin: 0;"><strong>${influencerName}</strong> has accepted your contract.</p>
            </div>

            <p><strong>Contract:</strong> ${contractTitle}</p>
            ${campaignName ? `<p><strong>Campaign:</strong> ${campaignName}</p>` : ''}
            <p><strong>Influencer Email:</strong> ${influencerEmail}</p>

            <p>You can now proceed with the collaboration. Consider reaching out to ${influencerName} to discuss next steps.</p>
          </div>
          <div class="footer">
            <p>This notification was sent via Snappi</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Great News!

${influencerName} has accepted your contract "${contractTitle}"${campaignName ? ` for the campaign "${campaignName}"` : ''}.

Influencer Email: ${influencerEmail}

You can now proceed with the collaboration.
    `
  };
};

module.exports = {
  sendEmail,
  generateContractEmail,
  generateAcceptanceNotificationEmail
};
