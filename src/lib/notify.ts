/**
 * 알림톡 발송 헬퍼 (Solapi REST API)
 * 샵별 API 키 우선, 없으면 환경변수 fallback → 둘 다 없으면 skip
 */

const SOLAPI_ENDPOINT = "https://api.solapi.com/messages/v4/send";

export interface SolapiCreds {
  apiKey: string;
  apiSecret: string;
  pfId: string;
  templateConfirmed?: string;
  templateCancelled?: string;
  templateReminder?: string;
}

function buildAuth(creds: SolapiCreds): string {
  const date = new Date().toISOString();
  const salt = Math.random().toString(36).slice(2, 12);
  const data = date + salt;
  const crypto = require("crypto") as typeof import("crypto");
  const sig = crypto.createHmac("sha256", creds.apiSecret).update(data).digest("hex");
  return `HMAC-SHA256 apiKey=${creds.apiKey}, date=${date}, salt=${salt}, signature=${sig}`;
}

function resolveSystemCreds(): SolapiCreds | null {
  const apiKey = process.env.SOLAPI_API_KEY;
  const apiSecret = process.env.SOLAPI_API_SECRET;
  if (!apiKey || !apiSecret) return null;
  return {
    apiKey,
    apiSecret,
    pfId: process.env.SOLAPI_PFID ?? "",
    templateConfirmed: process.env.SOLAPI_TEMPLATE_CONFIRMED,
    templateCancelled: process.env.SOLAPI_TEMPLATE_CANCELLED,
    templateReminder: process.env.SOLAPI_TEMPLATE_REMINDER,
  };
}

export interface AlimtalkMessage {
  to: string;
  from: string;
  templateId: string;
  variables: Record<string, string>;
  text: string;
}

export async function sendAlimtalk(
  msg: AlimtalkMessage,
  creds?: SolapiCreds,
): Promise<boolean> {
  const effectiveCreds = creds ?? resolveSystemCreds();
  if (!effectiveCreds) return false;

  try {
    const res = await fetch(SOLAPI_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: buildAuth(effectiveCreds),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          to: msg.to.replace(/\D/g, ""),
          from: msg.from.replace(/\D/g, ""),
          type: "ATA",
          kakaoOptions: {
            pfId: effectiveCreds.pfId,
            templateId: msg.templateId,
            variables: msg.variables,
          },
          text: msg.text,
        },
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** 예약 확정 알림 */
export async function notifyBookingConfirmed(params: {
  phone: string;
  senderPhone: string;
  customerName: string;
  shopName: string;
  serviceName: string;
  dateTime: string;
  creds?: SolapiCreds;
}): Promise<void> {
  const templateId =
    params.creds?.templateConfirmed ??
    process.env.SOLAPI_TEMPLATE_CONFIRMED ??
    "BEAUTICA_CONFIRM";

  await sendAlimtalk(
    {
      to: params.phone,
      from: params.senderPhone,
      templateId,
      variables: {
        "#{고객명}": params.customerName,
        "#{샵명}": params.shopName,
        "#{시술명}": params.serviceName,
        "#{일시}": params.dateTime,
      },
      text: `[beautica] ${params.shopName}\n${params.customerName}님의 예약이 확정되었습니다.\n시술: ${params.serviceName}\n일시: ${params.dateTime}`,
    },
    params.creds,
  );
}

/** 예약 D-1 리마인더 알림 */
export async function notifyBookingReminder(params: {
  phone: string;
  senderPhone: string;
  customerName: string;
  shopName: string;
  serviceName: string;
  dateTime: string;
  creds?: SolapiCreds;
}): Promise<void> {
  const templateId =
    params.creds?.templateReminder ??
    process.env.SOLAPI_TEMPLATE_REMINDER ??
    "BEAUTICA_REMINDER";

  await sendAlimtalk(
    {
      to: params.phone,
      from: params.senderPhone,
      templateId,
      variables: {
        "#{고객명}": params.customerName,
        "#{샵명}": params.shopName,
        "#{시술명}": params.serviceName,
        "#{일시}": params.dateTime,
      },
      text: `[beautica] ${params.shopName}\n${params.customerName}님, 내일 예약이 있습니다.\n시술: ${params.serviceName}\n일시: ${params.dateTime}`,
    },
    params.creds,
  );
}

/** 예약 취소 알림 */
export async function notifyBookingCancelled(params: {
  phone: string;
  senderPhone: string;
  customerName: string;
  shopName: string;
  dateTime: string;
  creds?: SolapiCreds;
}): Promise<void> {
  const templateId =
    params.creds?.templateCancelled ??
    process.env.SOLAPI_TEMPLATE_CANCELLED ??
    "BEAUTICA_CANCEL";

  await sendAlimtalk(
    {
      to: params.phone,
      from: params.senderPhone,
      templateId,
      variables: {
        "#{고객명}": params.customerName,
        "#{샵명}": params.shopName,
        "#{일시}": params.dateTime,
      },
      text: `[beautica] ${params.shopName}\n${params.customerName}님의 예약이 취소되었습니다.\n일시: ${params.dateTime}`,
    },
    params.creds,
  );
}
