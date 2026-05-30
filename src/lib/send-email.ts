import nodeMailer from "nodemailer";

import { env } from "@/config";

/**
 * Sends an email using the configured SMTP service
 *
 * Creates a transporter with the SMTP credentials from environment variables
 * and sends an email to the specified recipient.
 *
 * @param options - Email sending options
 * @param options.email - Recipient email address
 * @param options.subject - Email subject line
 * @param options.html - Optional HTML content for the email
 * @param options.message - Optional plain text content (used if html is not provided)
 * @returns A Promise that resolves when the email is sent
 */
export async function sendEmail(options: {
  email: string;
  subject: string;
  html?: string;
  message?: string;
}) {
  // eslint-disable-next-line no-console
  console.log(
    env.SMPT_SERVICE,
    "--",
    env.SMPT_MAIL,
    "00",
    env.SMPT_PASSWORD,
    env.SMPT_HOST,
    env.SMPT_PORT,
  );
  const transporter = nodeMailer.createTransport({
    service: env.SMPT_SERVICE,
    auth: {
      user: env.SMPT_MAIL,
      pass: env.SMPT_PASSWORD,
    },
    authMethod: "PLAIN", // specify the authentication method
  });

  // check if html is provided
  const mailOptions = {
    from: env.SMPT_MAIL,
    to: options?.email,
    subject: options?.subject,
    text: options?.message,
    html: options?.html,
  };
  if (options?.html) {
    mailOptions.html = options?.html;
  } else {
    mailOptions.text = options?.message;
  }

  await transporter.sendMail(mailOptions);
}

export default sendEmail;
