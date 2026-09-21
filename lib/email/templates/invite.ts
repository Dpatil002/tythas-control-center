export function renderInviteEmail({
  orgName,
  inviterEmail,
  acceptUrl,
  expiresAt,
}: {
  orgName: string;
  inviterEmail: string;
  acceptUrl: string;
  expiresAt: Date;
}) {
  const formattedExpiry = expiresAt.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invitation to join ${orgName}</title>
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
    <div class="header">Join ${orgName} on Tythas Control Center</div>
    <div class="content">
      <p>Hello,</p>
      <p><strong>${inviterEmail}</strong> has invited you to join the <strong>${orgName}</strong> team as a <strong>Manager</strong> on Tythas Control Center.</p>
      <p>Click the button below to set your password and configure your authenticator app.</p>
      <p><a href="${acceptUrl}" class="btn" target="_blank">Accept Invitation & Setup Account</a></p>
      <p>This invitation link will expire on <strong>${formattedExpiry}</strong>.</p>
    </div>
    <div class="footer">
      If you did not expect this invitation, you can safely ignore this email.
    </div>
  </div>
</body>
</html>
  `.trim();
}
