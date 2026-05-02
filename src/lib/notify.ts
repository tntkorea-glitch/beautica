/**
 * 알림톡 발송 헬퍼 (Solapi REST API)
 * 환경변수 없으면 silently skip
 */

const SOLAPI_ENDPOINT = "https://api.solapi.com/messages/v4/send";

function solapiAuth(): string | null {
  const apiKey = process.env.SOLAPI_API_KEY;
  const apiSecret = process.env.SOLAPI_API_SECRET;
  if (!apiKey || !apiSecret) return null;

  // HMAC-SHA256 signature
  const date = new Date().toISOString();
  const salt = Math.random().toString(36).slice(2, 12);
  const data = date + salt;

  // Node built-in crypto
  const crypto = require("crypto") as typeof import("crypto");
  const signature = crypto.createHmac("sha256", apiSecret).update(data).digest("hex");
  return `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`;
}

export interface AlimtalkMessage {
  to: string;           // 수신자 전화번호
  from: string;         // 발신번호 (Solapi 등록된 번호)
  templateId: string;   // 카카오 알림톡 템플릿 코드
  variables: Record<string, string>;
  text: string;         // fallback SMS
}

export async function sendAlimtalk(msg: AlimtalkMessage): Promise<boolean> {
  const auth = solapiAuth();
  if (!auth) return false;

  try {
    const res = await fetch(SOLAPI_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: auth,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          to: msg.to.replace(/\D/g, ""),
          from: msg.from.replace(/\D/g, ""),
          type: "ATA",
          kakaoOptions: {
            pfId: process.env.SOLAPI_PFID ?? "",
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
}): Promise<void> {
  await sendAlimtalk({
    to: params.phone,
    from: params.senderPhone,
    templateId: process.env.SOLAPI_TEMPLATE_CONFIRMED ?? "BEAUTICA_CONFIRM",
    variables: {
      "#{고객명}": params.customerName,
      "#{샵명}": params.shopName,
      "#{시술명}": params.serviceName,
      "#{일시}": params.dateTime,
    },
    text: `[beautica] ${params.shopName}\n${params.customerName}님의 예약이 확정되었습니다.\n시술: ${params.serviceName}\n일시: ${params.dateTime}`,
  });
}

/** 예약 취소 알림 */
export async function notifyBookingCancelled(params: {
  phone: string;
  senderPhone: string;
  customerName: string;
  shopName: string;
  dateTime: string;
}): Promise<void> {
  await sendAlimtalk({
    to: params.phone,
    from: params.senderPhone,
    templateId: process.env.SOLAPI_TEMPLATE_CANCELLED ?? "BEAUTICA_CANCEL",
    variables: {
      "#{고객명}": params.customerName,
      "#{샵명}": params.shopName,
      "#{일시}": params.dateTime,
    },
    text: `[beautica] ${params.shopName}\n${params.customerName}님의 예약이 취소되었습니다.\n일시: ${params.dateTime}`,
  });
}
