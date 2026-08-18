import { redirect } from "next/navigation";

import { AdminPanel } from "@/components/admin-panel";
import { ContributorDashboard } from "@/components/contributor-dashboard";
import { getCurrentUser } from "@/lib/auth/session";
import { getAdminStats, listReports } from "@/lib/db/admin";
import { getDatabase } from "@/lib/db/database";
import { listContributorStats, listSubtopics, listTopics } from "@/lib/db/pages";

export const metadata = { title: "관리자" };

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") redirect("/home");
  const database = getDatabase();
  const stats = getAdminStats(database);
  const contributors = listContributorStats(database);
  const cards = [
    { label: "등록 회원", value: stats.users },
    { label: "전체 문서", value: stats.pages },
    { label: "미처리 신고", value: stats.openReports },
  ];
  return <div className="mx-auto max-w-[1080px] px-5 py-9 md:px-10 md:py-12"><header className="border-b border-[#dfe2de] pb-7"><p className="text-xs text-[#626863]">워크스페이스 설정</p><h1 className="mt-2 text-[32px] font-semibold tracking-[-.035em]">관리자</h1><p className="mt-2 text-sm text-[#626863]">계정, 분야, 신고를 관리합니다.</p></header><dl className="mt-7 grid border border-[#dfe2de] bg-white sm:grid-cols-3">{cards.map(({ label, value }, index) => <div key={label} className={`px-5 py-4 ${index > 0 ? "border-t border-[#dfe2de] sm:border-l sm:border-t-0" : ""}`}><dt className="text-xs text-[#626863]">{label}</dt><dd className="mt-1 text-2xl font-semibold tabular-nums">{value}</dd></div>)}</dl><ContributorDashboard contributors={contributors} /><AdminPanel topics={listTopics(database)} subtopics={listSubtopics(database)} reports={listReports(database)} /></div>;
}
