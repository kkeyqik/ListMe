import nodemailer from 'nodemailer';
import { prisma } from './prisma';

interface SendMailParams {
  to: string;
  subject: string;
  text: string;
  html?: string;
  metadata?: Record<string, any>;
}

/**
 * Sends an email using Nodemailer SMTP and logs it directly inside the database 'email_logs' table.
 */
export async function sendEmail({ to, subject, text, html, metadata }: SendMailParams) {
  const from = process.env.SMTP_FROM || 'ListMe <no-reply@listme.in>';
  
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587');
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  const isConfigured = !!(host && user && pass);
  let status = 'SENT';
  let errorMsg: string | null = null;

  console.log(`[Email Service] Attempting to send email to: ${to} (Subject: ${subject})`);

  if (!isConfigured) {
    // Simulated Flow
    console.log('-----------------------------------------');
    console.log(`[SIMULATED EMAIL SENT]`);
    console.log(`From: ${from}`);
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Text Body: ${text}`);
    console.log('-----------------------------------------');
    
    status = 'SIMULATED';
  } else {
    // Live SMTP Flow
    try {
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465, // true for 465, false for 587
        auth: {
          user,
          pass,
        },
      });

      await transporter.sendMail({
        from,
        to,
        subject,
        text,
        html: html || text,
      });

      console.log(`[Email Service] Email sent successfully to ${to}`);
    } catch (err: any) {
      console.error(`[Email Service] Error sending email to ${to}:`, err);
      status = 'FAILED';
      errorMsg = err.message || 'Unknown error occurred while sending email';
    }
  }

  // LOG EVERYTHING IN THE DATABASE
  try {
    const log = await prisma.emailLog.create({
      data: {
        to,
        from,
        subject,
        body: html || text,
        status,
        error: errorMsg,
        metadata: metadata ? (metadata as any) : undefined,
      },
    });
    console.log(`[Email Service] Logged email in database. Log ID: ${log.id}`);
  } catch (logErr) {
    console.error('[Email Service] Failed to write email log to database:', logErr);
  }

  return { success: status === 'SENT' || status === 'SIMULATED', status, error: errorMsg };
}
