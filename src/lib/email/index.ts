import "server-only";
import { consoleEmailProvider } from "./console-email-provider";
import type { EmailService } from "./email-service";
import { resendEmailProvider } from "./resend-email-provider";

// The only place that decides which provider is active. Everything else in the
// app depends only on the EmailService interface.
export const emailService: EmailService = process.env.RESEND_API_KEY ? resendEmailProvider : consoleEmailProvider;

export type { EmailService, OtpEmailPurpose } from "./email-service";
