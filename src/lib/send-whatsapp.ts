/**
 * Sends a WhatsApp message to the specified phone number
 *
 * Currently a placeholder that logs the message details to the console.
 * Implementation should be replaced with actual WhatsApp API integration.
 *
 * @param options - WhatsApp message options
 * @param options.phoneNumber - Recipient phone number
 * @param options.message - Message content to send
 * @returns A Promise that resolves when the message is sent or logged
 */
export async function sendWhatsapp(options: {
  phoneNumber: string;
  message: string;
}) {
  // eslint-disable-next-line no-console
  console.log(options);
}

export default sendWhatsapp;
