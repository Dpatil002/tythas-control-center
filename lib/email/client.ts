import { Resend } from 'resend';
import { env } from '@/lib/env';

const resend = env.RESEND_API_KEY && env.RESEND_API_KEY.startsWith('re_') && env.RESEND_API_KEY !== 're_dev_placeholder'
  ? new Resend(env.RESEND_API_KEY)
  : null;

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailOptions): Promise<{ success: boolean; id?: string }> {
  if (!resend) {
    console.log('\n✉️  [LOCAL DEV EMAIL DISPATCHED] ---------------------');
    console.log(`To: ${to}`);
    console.log(`From: ${env.EMAIL_FROM}`);
    console.log(`Subject: ${subject}`);
    console.log('HTML snippet:');
    console.log(html.slice(0, 300) + '...');
    console.log('-----------------------------------------------------\n');
    return { success: true, id: 'mock-email-' + Date.now() };
  }

  try {
    const result = await resend.emails.send({
      from: env.EMAIL_FROM,
      to,
      subject,
      html,
    });

    if (result.error) {
      console.error('Failed to send email via Resend:', result.error);
      return { success: false };
    }

    return { success: true, id: result.data?.id };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false };
  }
}
