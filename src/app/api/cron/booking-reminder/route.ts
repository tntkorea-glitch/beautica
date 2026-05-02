import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyBookingReminder, SolapiCreds } from "@/lib/notify";

export const runtime = "nodejs";
export const maxDuration = 60;

function kstTomorrowRange(hoursAhead: number): { start: string; end: string } {
  const nowKst = new Date(Date.now() + 9 * 3600 * 1000);
  const daysAhead = Math.max(1, Math.round(hoursAhead / 24));
  const targetKst = new Date(nowKst);
  targetKst.setUTCDate(targetKst.getUTCDate() + daysAhead);

  // midnight KST → subtract 9h for UTC
  const start = new Date(
    Date.UTC(
      targetKst.getUTCFullYear(),
      targetKst.getUTCMonth(),
      targetKst.getUTCDate(),
    ) -
      9 * 3600 * 1000,
  );
  const end = new Date(start.getTime() + 24 * 3600 * 1000);
  return { start: start.toISOString(), end: end.toISOString() };
}

function formatKstDateTime(iso: string): string {
  const d = new Date(new Date(iso).toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export async function GET(req: NextRequest) {
  // Vercel Cron 인증 확인
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const admin = createAdminClient();

  // 리마인더 활성화된 샵 조회
  const { data: shops, error: shopErr } = await admin
    .from("shops")
    .select(
      "id, name, notification_phone, reminder_hours_before, solapi_api_key, solapi_api_secret, solapi_pfid, solapi_template_reminder",
    )
    .eq("reminder_enabled", true)
    .eq("kakao_notify_enabled", true)
    .not("notification_phone", "is", null);

  if (shopErr) {
    console.error("[reminder-cron] shops query error:", shopErr.message);
    return NextResponse.json({ error: shopErr.message }, { status: 500 });
  }

  let totalSent = 0;
  let totalSkipped = 0;

  for (const shop of shops ?? []) {
    const hoursAhead = (shop.reminder_hours_before as number) ?? 24;
    const { start, end } = kstTomorrowRange(hoursAhead);

    const { data: bookings } = await admin
      .from("bookings")
      .select(
        "id, start_at, customer:customers(name, phone), service:services(name)",
      )
      .eq("shop_id", shop.id)
      .eq("status", "CONFIRMED")
      .gte("start_at", start)
      .lt("start_at", end);

    if (!bookings?.length) continue;

    const creds: SolapiCreds | undefined =
      shop.solapi_api_key && shop.solapi_api_secret
        ? {
            apiKey: shop.solapi_api_key as string,
            apiSecret: shop.solapi_api_secret as string,
            pfId: (shop.solapi_pfid as string) ?? "",
            templateReminder: (shop.solapi_template_reminder as string) ?? undefined,
          }
        : undefined;

    for (const booking of bookings) {
      const customer = (booking.customer as unknown) as { name: string; phone: string } | null;
      const service = (booking.service as unknown) as { name: string } | null;

      if (!customer?.phone) {
        totalSkipped++;
        continue;
      }

      await notifyBookingReminder({
        phone: customer.phone,
        senderPhone: (shop.notification_phone as string),
        customerName: customer.name ?? "고객",
        shopName: (shop.name as string) ?? "",
        serviceName: service?.name ?? "시술",
        dateTime: formatKstDateTime(booking.start_at as string),
        creds,
      });
      totalSent++;
    }
  }

  console.log(`[reminder-cron] sent=${totalSent} skipped=${totalSkipped}`);
  return NextResponse.json({ ok: true, sent: totalSent, skipped: totalSkipped });
}
