import { PageList } from "@/components/page-list";
import { getCurrentUser } from "@/lib/auth/session";
import { getDatabase } from "@/lib/db/database";
import { listBookmarkedPages } from "@/lib/db/pages";
import { redirect } from "next/navigation";

export const metadata = { title: "북마크" };

export default async function BookmarksPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/landing");
  const pages = listBookmarkedPages(getDatabase(), user.studentId);
  return <div className="mx-auto max-w-[980px] px-5 py-9 md:px-10 md:py-12"><header className="border-b border-[#dfe2de] pb-7"><p className="text-xs text-[#626863]">저장한 자료</p><h1 className="mt-2 text-[32px] font-semibold tracking-[-.035em]">북마크</h1><p className="mt-2 text-sm text-[#626863]">다시 읽을 문서를 모아둔 목록입니다.</p></header><section className="mt-7"><PageList pages={pages} empty="북마크한 문서가 없습니다." /></section></div>;
}
