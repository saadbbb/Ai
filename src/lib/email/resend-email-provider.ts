import "server-only";
import { Resend } from "resend";
import { AppError } from "@/lib/errors/app-error";
import type { EmailService } from "./email-service";

// Constructed lazily so merely importing this module (e.g. transitively, via any
// route that touches the auth feature) never throws when RESEND_API_KEY is unset.
let resendClient: Resend | undefined;
function getResendClient(): Resend {
  resendClient ??= new Resend(process.env.RESEND_API_KEY);
  return resendClient;
}

export const resendEmailProvider: EmailService = {
  async sendNotificationEmail({ to, subject, text }) {
    const from = process.env.EMAIL_FROM;
    if (!from) {
      throw new AppError("INTERNAL_ERROR", "EMAIL_FROM is not configured.");
    }

    const { error } = await getResendClient().emails.send({ from, to, subject, text });

    if (error) {
      console.error("[resend] failed to send notification email:", error);
      throw new AppError("INTERNAL_ERROR", "Failed to send email. Please try again.");
    }
  },
};
