import "server-only";
import type { EmailService } from "./email-service";

/**
 * Logs the email to the server console instead of sending it. Used until a
 * RESEND_API_KEY is configured; swapping to ResendEmailProvider later only
 * requires changing the export in `./index.ts`, not any of its callers.
 */
export const consoleEmailProvider: EmailService = {
  async sendOtpEmail({ to, code, purpose }) {
    const subject = purpose === "registration" ? "Verify your email" : "Reset your password";
    console.log(
      `\n[email:mock] To: ${to}\nSubject: ${subject}\nYour verification code is: ${code}\n(Expires in 10 minutes.)\n`,
    );
  },
};
