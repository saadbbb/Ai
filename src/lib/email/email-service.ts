export type OtpEmailPurpose = "registration" | "password_reset";

export interface EmailService {
  sendOtpEmail(params: { to: string; code: string; purpose: OtpEmailPurpose }): Promise<void>;
  sendNotificationEmail(params: { to: string; subject: string; text: string }): Promise<void>;
}
