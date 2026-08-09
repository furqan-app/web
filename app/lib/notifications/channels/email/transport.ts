export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export type EmailTransport = {
  send: (message: EmailMessage) => Promise<void>;
};
