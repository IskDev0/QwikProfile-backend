import MailGun from "mailgun.js";
import FormData from "form-data";

const mailgun = new MailGun(FormData);

const mailGunClient = mailgun.client({
  username: "api",
  key: process.env.MAILGUN_API_KEY || "",
});

export default async function sendResetEmail(
  email: string,
  resetToken: string,
) {
  const resetUrl = `${process.env.FRONTEND_URL}/auth/reset-password?token=${resetToken}`;

  try {
    const data = await mailGunClient.messages.create(
      process.env.MAILGUN_DOMAIN ||
        "sandbox427754dbfbd247cb89a70f4ff9345826.mailgun.org",
      {
        from: `QwikProfile <postmaster@${process.env.MAILGUN_DOMAIN || "sandbox427754dbfbd247cb89a70f4ff9345826.mailgun.org"}>`,
        to: [email],
        subject: "Password Reset Request",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Password Reset Request</h2>
            <p>You requested to reset your password. Click the link below to proceed:</p>
            <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
            <p style="margin-top: 20px;">This link will expire in 1 hour.</p>
            <p>If you didn't request this, please ignore this email.</p>
          </div>
        `,
        text: `You requested to reset your password. Click the link below to proceed:\n\n${resetUrl}\n\nThis link will expire in 1 hour.\n\nIf you didn't request this, please ignore this email.`,
      },
    );

    return data;
  } catch (error) {
    console.error("Error sending reset email:", error);
    throw error;
  }
}
