import { Resend } from 'resend';
import { env } from '@/lib/config/env';
import { logError, logUserAction } from '@/lib/logger';

const resend = new Resend(env.RESEND_API_KEY);

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

export interface OrderConfirmationData {
  customerEmail: string;
  customerName?: string;
  kitTitle: string;
  planType: 'solo' | 'pro';
  amount: number;
  downloadUrl?: string;
  orderNumber: string;
}

export interface ApprovalNotificationData {
  customerEmail: string;
  customerName?: string;
  kitTitle: string;
  downloadUrl: string;
  adminNotes?: string;
}

export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const { data, error } = await resend.emails.send({
      from: options.from || `Hiring Kit <noreply@${env.NEXT_PUBLIC_APP_URL.replace('https://', '').replace('http://', '')}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    if (error) {
      logError(new Error(error.message), {
        context: 'email_send_error',
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
      });
      
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      messageId: data?.id,
    };
  } catch (error) {
    logError(error as Error, {
      context: 'email_send_exception',
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
    });
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function sendOrderConfirmationEmail(data: OrderConfirmationData): Promise<{ success: boolean; error?: string }> {
  const subject = `Order Confirmation - ${data.kitTitle}`;
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; margin-top: 20px; margin-bottom: 20px; }
    .header { text-align: center; margin-bottom: 32px; }
    .logo { font-size: 24px; font-weight: bold; color: #1F4B99; margin-bottom: 8px; }
    .title { font-size: 28px; font-weight: bold; color: #1F4B99; margin-bottom: 16px; }
    .subtitle { font-size: 16px; color: #666; }
    .content { margin: 32px 0; }
    .order-details { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .detail-row { display: flex; justify-content: space-between; margin: 8px 0; }
    .detail-label { font-weight: 600; }
    .button { display: inline-block; background: #1F4B99; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
    .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">${env.NEXT_PUBLIC_APP_NAME}</div>
      <h1 class="title">Order Confirmed! 🎉</h1>
      <p class="subtitle">Your hiring kit is ready</p>
    </div>
    
    <div class="content">
      <p>Hi${data.customerName ? ` ${data.customerName}` : ''},</p>
      
      <p>Thank you for your order! Your hiring kit has been successfully generated and is ready for download.</p>
      
      <div class="order-details">
        <h3 style="margin-top: 0; color: #1F4B99;">Order Details</h3>
        <div class="detail-row">
          <span class="detail-label">Order Number:</span>
          <span>${data.orderNumber}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Kit:</span>
          <span>${data.kitTitle}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Plan:</span>
          <span>${data.planType === 'pro' ? 'Pro Kit + Human Review' : 'Solo Kit'}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Amount Paid:</span>
          <span>$${(data.amount / 100).toFixed(2)}</span>
        </div>
      </div>
      
      ${data.planType === 'pro' ? `
        <p><strong>Pro Plan Benefits:</strong> Your kit will be reviewed by our hiring experts and enhanced within 4 business hours. You'll receive another email when the review is complete.</p>
      ` : ''}
      
      ${data.downloadUrl ? `
        <div style="text-align: center;">
          <a href="${data.downloadUrl}" class="button">Download Your Kit</a>
        </div>
      ` : ''}
      
      <p>Your hiring kit includes:</p>
      <ul>
        <li>✓ Role Scorecard</li>
        <li>✓ Job Post</li>
        <li>✓ 3-Stage Interview Guide with Rubrics</li>
        <li>✓ Work Sample Assignment</li>
        <li>✓ Reference Check Script</li>
        <li>✓ Process Map</li>
        <li>✓ EEO Guidelines</li>
      </ul>
      
      <p>If you have any questions or need assistance, please don't hesitate to reach out to our support team.</p>
    </div>
    
    <div class="footer">
      <p>© ${new Date().getFullYear()} ${env.NEXT_PUBLIC_APP_NAME}. All rights reserved.</p>
      <p>This email was sent regarding your order. Please add our email to your contacts to ensure delivery.</p>
    </div>
  </div>
</body>
</html>`;

  const text = `
Order Confirmation - ${data.kitTitle}

Hi${data.customerName ? ` ${data.customerName}` : ''},

Thank you for your order! Your hiring kit has been successfully generated.

Order Details:
- Order Number: ${data.orderNumber}
- Kit: ${data.kitTitle}
- Plan: ${data.planType === 'pro' ? 'Pro Kit + Human Review' : 'Solo Kit'}
- Amount Paid: $${(data.amount / 100).toFixed(2)}

${data.planType === 'pro' ? 'Pro Plan: Your kit will be reviewed by our experts within 4 business hours.' : ''}

${data.downloadUrl ? `Download your kit: ${data.downloadUrl}` : ''}

Your kit includes:
- Role Scorecard
- Job Post  
- 3-Stage Interview Guide with Rubrics
- Work Sample Assignment
- Reference Check Script
- Process Map
- EEO Guidelines

Best regards,
The ${env.NEXT_PUBLIC_APP_NAME} Team
`;

  const result = await sendEmail({
    to: data.customerEmail,
    subject,
    html,
    text,
  });

  if (result.success) {
    logUserAction('EMAIL_SENT', 'system', {
      type: 'order_confirmation',
      to: data.customerEmail,
      kitTitle: data.kitTitle,
      planType: data.planType,
      messageId: result.messageId,
    });
  }

  return result;
}

export async function sendApprovalNotificationEmail(data: ApprovalNotificationData): Promise<{ success: boolean; error?: string }> {
  const subject = `Your Kit is Ready! - ${data.kitTitle}`;
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; margin-top: 20px; margin-bottom: 20px; }
    .header { text-align: center; margin-bottom: 32px; }
    .logo { font-size: 24px; font-weight: bold; color: #1F4B99; margin-bottom: 8px; }
    .title { font-size: 28px; font-weight: bold; color: #1F4B99; margin-bottom: 16px; }
    .subtitle { font-size: 16px; color: #666; }
    .content { margin: 32px 0; }
    .highlight-box { background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #1F4B99; }
    .button { display: inline-block; background: #1F4B99; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
    .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">${env.NEXT_PUBLIC_APP_NAME}</div>
      <h1 class="title">Your Kit is Ready! ✨</h1>
      <p class="subtitle">Expert review completed</p>
    </div>
    
    <div class="content">
      <p>Hi${data.customerName ? ` ${data.customerName}` : ''},</p>
      
      <p>Great news! Our hiring experts have completed their review of your <strong>${data.kitTitle}</strong> hiring kit.</p>
      
      <div class="highlight-box">
        <h3 style="margin-top: 0; color: #1F4B99;">✅ Expert Review Complete</h3>
        <p style="margin-bottom: 0;">Your kit has been enhanced with professional insights and is now ready for download. Our experts have refined the content to ensure it meets industry best practices and reduces hiring bias.</p>
      </div>
      
      ${data.adminNotes ? `
        <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; margin: 20px 0;">
          <h4 style="margin-top: 0; color: #333;">Review Notes:</h4>
          <p style="margin-bottom: 0;">${data.adminNotes}</p>
        </div>
      ` : ''}
      
      <div style="text-align: center;">
        <a href="${data.downloadUrl}" class="button">Download Your Enhanced Kit</a>
      </div>
      
      <p>Your enhanced hiring kit is valid for 30 days from the date of purchase. We recommend downloading and saving your kit files locally.</p>
      
      <p>Thank you for choosing ${env.NEXT_PUBLIC_APP_NAME} for your hiring needs. If you have any feedback or questions, please don't hesitate to reach out.</p>
    </div>
    
    <div class="footer">
      <p>© ${new Date().getFullYear()} ${env.NEXT_PUBLIC_APP_NAME}. All rights reserved.</p>
      <p>This email was sent regarding your order completion.</p>
    </div>
  </div>
</body>
</html>`;

  const text = `
Your Kit is Ready! - ${data.kitTitle}

Hi${data.customerName ? ` ${data.customerName}` : ''},

Great news! Our hiring experts have completed their review of your "${data.kitTitle}" hiring kit.

Expert Review Complete ✅
Your kit has been enhanced with professional insights and is now ready for download.

${data.adminNotes ? `Review Notes: ${data.adminNotes}` : ''}

Download your enhanced kit: ${data.downloadUrl}

Your kit is valid for 30 days from purchase. Please download and save locally.

Best regards,
The ${env.NEXT_PUBLIC_APP_NAME} Team
`;

  const result = await sendEmail({
    to: data.customerEmail,
    subject,
    html,
    text,
  });

  if (result.success) {
    logUserAction('EMAIL_SENT', 'system', {
      type: 'approval_notification',
      to: data.customerEmail,
      kitTitle: data.kitTitle,
      messageId: result.messageId,
    });
  }

  return result;
}