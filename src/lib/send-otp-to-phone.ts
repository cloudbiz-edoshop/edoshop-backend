import sendSmsTwilio from "@/lib/send-sms-twilio";
import sendWhatsapp from "@/lib/send-whatsapp";

export type OtpDeliveryResult = {
  delivered: boolean;
  channel?: "whatsapp_template" | "whatsapp" | "sms_twilio";
  skipped?: boolean;
  attemptedTargets?: string[];
};

const normalizePhoneDigits = (phoneNumber: string) =>
  phoneNumber.replace(/[^\d]/g, "");

const buildDeliveryTargets = (phoneNumber: string) => {
  const targets = new Set<string>([phoneNumber]);
  const relayPhone = process.env.OTP_TEST_RELAY_PHONE?.trim();

  if (relayPhone) {
    targets.add(relayPhone);
  }

  return [...targets];
};

async function sendWhatsappOtpTemplate(options: {
  phoneNumber: string;
  code: string;
}) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const templateName = process.env.WHATSAPP_OTP_TEMPLATE_NAME;
  const templateLanguage =
    process.env.WHATSAPP_OTP_TEMPLATE_LANGUAGE || "en_US";
  const apiVersion = process.env.WHATSAPP_API_VERSION || "v21.0";

  if (!phoneNumberId || !accessToken || !templateName) {
    return { skipped: true as const };
  }

  const apiUrl =
    process.env.WHATSAPP_API_URL ||
    `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: normalizePhoneDigits(options.phoneNumber),
      type: "template",
      template: {
        name: templateName,
        language: { code: templateLanguage },
        components: [
          {
            type: "body",
            parameters: [{ type: "text", text: options.code }],
          },
          ...(process.env.WHATSAPP_OTP_TEMPLATE_HAS_BUTTON === "true"
            ? [
                {
                  type: "button",
                  sub_type: "url",
                  index: "0",
                  parameters: [{ type: "text", text: options.code }],
                },
              ]
            : []),
        ],
      },
    }),
  });

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(
      `WhatsApp OTP template failed: ${response.status} ${responseText}`,
    );
  }

  return response.json();
}

export async function sendOtpToPhone(options: {
  phoneNumber: string;
  code: string;
}): Promise<OtpDeliveryResult> {
  const message = `Your Edoshop verification code is: ${options.code}. It expires in 30 minutes.`;
  const targets = buildDeliveryTargets(options.phoneNumber);
  const templateName = process.env.WHATSAPP_OTP_TEMPLATE_NAME?.trim();
  let lastError: Error | undefined;

  for (const target of targets) {
    if (templateName) {
      try {
        const templateResult = await sendWhatsappOtpTemplate({
          phoneNumber: target,
          code: options.code,
        });

        if (!templateResult?.skipped) {
          return {
            delivered: true,
            channel: "whatsapp_template",
            attemptedTargets: targets,
          };
        }
      } catch (error) {
        lastError =
          error instanceof Error ? error : new Error("WhatsApp template failed");
      }
    }

    try {
      const whatsappResult = await sendWhatsapp({
        phoneNumber: target,
        message,
      });

      if (!whatsappResult?.skipped) {
        return {
          delivered: true,
          channel: "whatsapp",
          attemptedTargets: targets,
        };
      }
    } catch (error) {
      lastError =
        error instanceof Error ? error : new Error("WhatsApp delivery failed");
    }

    try {
      const smsResult = await sendSmsTwilio({
        phoneNumber: target,
        message,
      });

      if (!smsResult?.skipped) {
        return {
          delivered: true,
          channel: "sms_twilio",
          attemptedTargets: targets,
        };
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("SMS delivery failed");
    }
  }

  if (lastError) {
    throw lastError;
  }

  return {
    delivered: false,
    skipped: true,
    attemptedTargets: targets,
  };
}

export function shouldReturnDebugOtp(phoneNumber?: string) {
  if (process.env.OTP_DEBUG_RETURN !== "true") {
    return false;
  }

  const testPhone = process.env.OTP_TEST_PHONE?.trim();
  if (!testPhone || !phoneNumber) {
    return process.env.NODE_ENV !== "production";
  }

  return normalizePhoneDigits(phoneNumber) === normalizePhoneDigits(testPhone);
}

export default sendOtpToPhone;
