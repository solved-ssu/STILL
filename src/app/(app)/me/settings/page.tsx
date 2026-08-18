import { redirect } from "next/navigation";

import { PasswordChangeForm } from "@/components/password-change-form";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata = { title: "계정 설정" };

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/landing");

  return (
    <div className="mx-auto max-w-2xl px-5 py-9 md:px-10 md:py-12">
      <header className="border-b border-[#dfe2de] pb-7">
        <p className="text-xs text-[#626863]">{user.name} · {user.studentId}</p>
        <h1 className="mt-2 text-[32px] font-semibold tracking-[-.035em]">계정 설정</h1>
        <p className="mt-2 text-sm leading-6 text-[#626863]">초기 전화번호 비밀번호를 본인만 아는 비밀번호로 변경하세요.</p>
      </header>
      <section aria-labelledby="password-title" className="mt-7 border border-[#dfe2de] bg-white p-5 sm:p-7">
        <h2 id="password-title" className="text-lg font-semibold">비밀번호 변경</h2>
        <p className="mt-1 text-sm text-[#626863]">변경하면 다른 기기의 로그인은 모두 해제됩니다.</p>
        <PasswordChangeForm />
      </section>
    </div>
  );
}
