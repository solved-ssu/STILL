"use client";

import { KeyRound, LoaderCircle } from "lucide-react";
import { useState, type FormEvent } from "react";

export function PasswordChangeForm() {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [succeeded, setSucceeded] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setPending(true);
    setMessage("");
    setSucceeded(false);

    try {
      const response = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          currentPassword: data.get("currentPassword"),
          newPassword: data.get("newPassword"),
          confirmPassword: data.get("confirmPassword"),
        }),
      });
      const result = await response.json().catch(() => ({})) as { message?: string };
      setMessage(result.message ?? (response.ok ? "비밀번호를 변경했습니다." : "비밀번호를 변경하지 못했습니다."));
      setSucceeded(response.ok);
      if (response.ok) form.reset();
    } catch {
      setMessage("서버에 연결하지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
    } finally {
      setPending(false);
    }
  }

  const inputClassName = "mt-2 h-11 w-full border border-[#cfd3cf] bg-white px-3 outline-none";

  return (
    <form onSubmit={submit} className="mt-6 space-y-5">
      <label className="block text-sm font-semibold text-[#4f5550]">
        현재 비밀번호
        <input name="currentPassword" type="password" autoComplete="current-password" required maxLength={128} className={inputClassName} />
      </label>
      <label className="block text-sm font-semibold text-[#4f5550]">
        새 비밀번호
        <input name="newPassword" type="password" autoComplete="new-password" required minLength={10} maxLength={128} aria-describedby="new-password-help" className={inputClassName} />
      </label>
      <p id="new-password-help" className="-mt-3 text-xs leading-5 text-[#626863]">문자와 숫자를 포함해 10자 이상 입력하세요. 전화번호만으로는 변경할 수 없습니다.</p>
      <label className="block text-sm font-semibold text-[#4f5550]">
        새 비밀번호 확인
        <input name="confirmPassword" type="password" autoComplete="new-password" required minLength={10} maxLength={128} className={inputClassName} />
      </label>
      <button type="submit" disabled={pending} className="inline-flex h-11 w-full items-center justify-center gap-2 bg-[#315c50] px-4 text-sm font-semibold text-white disabled:opacity-60">
        {pending ? <LoaderCircle size={17} className="animate-spin" /> : <KeyRound size={17} />}
        비밀번호 변경
      </button>
      {message && <p role={succeeded ? "status" : "alert"} className={`border-l-2 px-3 py-2 text-sm ${succeeded ? "border-[#315c50] bg-[#edf2ef] text-[#315c50]" : "border-red-600 bg-red-50 text-red-700"}`}>{message}</p>}
    </form>
  );
}
