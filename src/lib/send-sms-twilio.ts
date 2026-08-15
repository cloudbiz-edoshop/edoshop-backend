const normalizeSmsPhone = (phoneNumber: string) =>
  phoneNumber.replace(/[^\d+]/g, "");

export async function sendSmsTwilio(options: {
  phoneNumber: string;
  message: string;
}) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    return { skipped: true as const };
  }

  const body = new URLSearchParams({
    To: normalizeSmsPhone(options.phoneNumber),
    From: fromNumber,
    Body: options.message,
  });

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    },
  );

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(`Twilio SMS failed: ${response.status} ${responseText}`);
  }

  return response.json();
}

export default sendSmsTwilio;
