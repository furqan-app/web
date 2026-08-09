import nodemailer from "nodemailer";
import type { EmailTransport } from "@/app/lib/notifications/channels/email/transport";

export const createSmtpEmailTransport = (config: {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
}): EmailTransport => {
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: { user: config.user, pass: config.pass },
  });

  return {
    send: async (message) => {
      await transporter.sendMail({
        from: config.from,
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
      });
    },
  };
};
