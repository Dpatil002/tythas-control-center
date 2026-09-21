export function renderPasswordResetEmail({
  resetUrl,
  expiresAt,
}: {
  resetUrl: string;
  expiresAt: Date;
}) {
  const formattedExpiry = expiresAt.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Reset Your Tythas Control Center Password</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F4F6FB; color: #0E1220; padding: 24px; margin: 0; }
    .container { max-width: 520px; margin: 0 auto; background: #FFFFFF; border: 1px solid #DEE3EE; border-radius: 12px; padding: 32px; }
    .header { font-size: 20px; font-weight: 600; color: #0E1220; margin-bottom: 16px; }
    .content { font-size: 14px; line-height: 22px; color: #565F76; margin-bottom: 24px; }
    .btn { display: inline-block; background-color: #2F62E0; color: #FFFFFF !important; font-weight: 600; font-size: 14px; text-decoration: none; padding: 12px 24px; border-radius: 8px; margin: 8px 0 24px 0; }
    .footer { font-size: 12px; color: #8991A6; border-top: 1px solid #DEE3EE; padding-top: 16px; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">Reset Your Password</div>
    <div class="content">
      <p>Hello,</p>
      <p>We received a request to reset your password for Tythas Control Center. Click the button below to choose a new password.</p>
      <p><a href="${resetUrl}" class="btn" target="_blank">Reset Password</a></p>
      <p>This password reset link is valid until <strong>${formattedExpiry}</strong>.</p>
    </div>
    <div class="footer">
      If you did not request a password reset, you can safely ignore this email. Your password will not change.
    </div>
  </div>
</body>
</html>
  `.trim();
}
