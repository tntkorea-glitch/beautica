import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { ProfileForm } from "./ProfileForm";

type ProfileRow = {
  user_id: string;
  display_name: string | null;
  personal_phone: string | null;
  profile_image_path: string | null;
  notification_channels: { email: boolean; kakao: boolean; push: boolean };
  notification_types: {
    booking: boolean;
    consultation: boolean;
    upgrade: boolean;
    order: boolean;
  };
  deletion_requested_at: string | null;
  deletion_reason: string | null;
};

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();

  const { data: profile, error: profileError } = await admin
    .from("user_profiles")
    .select(
      "user_id, display_name, personal_phone, profile_image_path, notification_channels, notification_types, deletion_requested_at, deletion_reason",
    )
    .eq("user_id", user.id)
    .maybeSingle();

  // user_profiles 테이블 미배포 케이스 안내
  const tableMissing =
    !!profileError && (profileError.message?.includes("relation") ?? false);

  // auth identities (Google/Kakao 등)
  const { data: ownerData } = await admin.auth.admin.getUserById(user.id);
  const identities = ownerData?.user?.identities ?? [];
  const providers = identities.map((i) => i.provider);

  // 프로필 이미지 signed URL
  const p = profile as ProfileRow | null;
  let profileImageUrl: string | null = null;
  if (p?.profile_image_path) {
    const { data } = await admin.storage
      .from("profile-images")
      .createSignedUrl(p.profile_image_path, 60 * 60);
    profileImageUrl = data?.signedUrl ?? null;
  }

  const initial = {
    displayName: p?.display_name ?? "",
    personalPhone: p?.personal_phone ?? "",
    profileImagePath: p?.profile_image_path ?? null,
    profileImageUrl,
    notificationChannels: p?.notification_channels ?? {
      email: true,
      kakao: false,
      push: false,
    },
    notificationTypes: p?.notification_types ?? {
      booking: true,
      consultation: true,
      upgrade: true,
      order: true,
    },
    deletionRequestedAt: p?.deletion_requested_at ?? null,
    deletionReason: p?.deletion_reason ?? null,
  };

  return (
    <main className="mx-auto max-w-3xl">
      <h1 className="mb-2 text-2xl font-bold">내 프로필</h1>
      <p className="mb-6 text-sm text-gray-600">
        본인 계정 정보 + 알림 설정. (매장 정보는{" "}
        <a href="/dashboard/settings" className="text-blue-600 hover:underline">
          설정
        </a>{" "}
        에서 별도 관리)
      </p>

      {tableMissing && (
        <div className="mb-6 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          ⚠ user_profiles 테이블이 배포되지 않았습니다. Supabase SQL Editor 에서{" "}
          <code className="rounded bg-amber-100 px-1">data-file/09-user-profile.sql</code> 을
          실행하세요.
        </div>
      )}

      <ProfileForm
        userId={user.id}
        email={user.email ?? ""}
        joinedAt={user.created_at}
        identityProviders={providers}
        initial={initial}
      />
    </main>
  );
}
