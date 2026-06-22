export async function sendWhatsapp(options: {
  phoneNumber: string;
  message: string;
}) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const apiVersion = process.env.WHATSAPP_API_VERSION || "v21.0";
  const apiUrl =
    process.env.WHATSAPP_API_URL ||
    (phoneNumberId
      ? `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`
      : "");

  if (!apiUrl || !accessToken) {
    // eslint-disable-next-line no-console
    console.warn("WhatsApp message skipped: missing WhatsApp API configuration", {
      phoneNumber: options.phoneNumber,
      message: options.message,
    });
    return { skipped: true };
  }

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: options.phoneNumber.replace(/[^\d]/g, ""),
      type: "text",
      text: {
        preview_url: false,
        body: options.message,
      },
    }),
  });

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(`WhatsApp send failed: ${response.status} ${responseText}`);
  }

  return response.json();
}

export default sendWhatsapp;
