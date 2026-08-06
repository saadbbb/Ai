export interface EmailService {
  sendNotificationEmail(params: { to: string; subject: string; text: string }): Promise<void>;
}
