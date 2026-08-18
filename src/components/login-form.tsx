"use client";

import { ArrowRight, LoaderCircle, LockKeyhole } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export function LoginForm() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: data.get("studentId"), password: data.get("password") }),
      });
      const result = (await response.json()) as { message?: string };
      if (!response.ok) {
        setMessage(result.message ?? "로그인하지 못했습니다.");
        return;
      }
      router.replace("/home");
      router.refresh();
    } catch {
      setMessage("서버에 연결하지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-4">
      <label className="block">
        <span className="mb-2 block text-sm font-semibold text-stone-700">학번</span>
        <input name="studentId" inputMode="numeric" autoComplete="username" required placeholder="20261234" className="h-11 w-full border border-[#cfd3cf] bg-white px-3 outline-none transition focus:border-[#315c50]" />
      </label>
      <label className="block">
        <span className="mb-2 block text-sm font-semibold text-stone-700">비밀번호</span>
        <input name="password" type="password" autoComplete="current-password" required maxLength={128} placeholder="비밀번호" className="h-11 w-full border border-[#cfd3cf] bg-white px-3 outline-none transition focus:border-[#315c50]" />
      </label>
      {message && <p role="alert" className="border-l-2 border-red-600 bg-red-50 px-3 py-2 text-sm text-red-700">{message}</p>}
      <button disabled={pending} className="flex h-11 w-full items-center justify-center gap-2 bg-[#315c50] text-sm font-semibold text-white transition hover:bg-[#254a40] disabled:opacity-60">
        {pending ? <LoaderCircle size={18} className="animate-spin" /> : <><span>STILL 시작하기</span><ArrowRight size={18} /></>}
      </button>
      <p className="flex items-start gap-2 text-xs leading-5 text-stone-500"><LockKeyhole size={14} className="mt-0.5 shrink-0" />첫 로그인은 관리자가 등록한 전화번호를 사용하고, 로그인 후 계정 설정에서 변경하세요.</p>
    </form>
  );
}
