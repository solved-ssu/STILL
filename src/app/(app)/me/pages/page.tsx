import { Plus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PageList } from "@/components/page-list";
import { getCurrentUser } from "@/lib/auth/session";
import { getDatabase } from "@/lib/db/database";
import { listPagesByAuthor } from "@/lib/db/pages";

export const metadata = { title: "내 문서" };

export default async function MyPagesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/landing");
  const pages = listPagesByAuthor(getDatabase(), user.studentId);
  return <div className="mx-auto max-w-[980px] px-5 py-9 md:px-10 md:py-12"><header className="flex items-end justify-between border-b border-[#dfe2de] pb-7"><div><p className="text-xs text-[#626863]">개인 작업 공간</p><h1 className="mt-2 text-[32px] font-semibold tracking-[-.035em]">내 문서</h1><p className="mt-2 text-sm text-[#626863]">초안과 공개한 자료를 관리합니다.</p></div><Link href="/editor/new" className="hidden h-9 items-center gap-2 border border-[#315c50] bg-[#315c50] px-3 text-sm font-semibold text-white sm:inline-flex"><Plus size={15} />새 문서</Link></header><section className="mt-7"><PageList pages={pages} empty="작성한 문서가 없습니다." /></section></div>;
}
