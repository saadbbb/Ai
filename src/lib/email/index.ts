import "server-only";
import { consoleEmailProvider } from "./console-email-provider";
import type { EmailService } from "./email-service";

// Swap this in one place once a real provider (e.g. Resend) is configured.
// Everything else in the app depends only on the EmailService interface.
export const emailService: EmailService = consoleEmailProvider;

export type { EmailService, OtpEmailPurpose } from "./email-service";
