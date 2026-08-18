import { BookMarked, FileText, Home, Plus, Settings } from "lucide-react";
import Link from "next/link";

import type { TopicSummary } from "@/lib/db/pages";
import type { SafeUser } from "@/lib/db/users";
import { LogoutButton } from "./logout-button";

const nav = [
  { href: "/home", label: "홈", icon: Home },
  { href: "/me/pages", label: "내 문서", icon: FileText },
  { href: "/me/bookmarks", label: "북마크", icon: BookMarked },
  { href: "/me/settings", label: "계정 설정", icon: Settings },
];

export function AppShell({ user, topics, children }: { user: SafeUser; topics: TopicSummary[]; children: React.ReactNode }) {
  const mobileNav = user.role === "admin"
    ? [...nav, { href: "/admin", label: "관리자", icon: Settings }]
    : nav;

  return (
    <div className="min-h-screen bg-[#f6f7f5] md:pl-[232px]">
      <aside aria-label="주 탐색" className="desktop-sidebar fixed inset-y-0 left-0 z-30 flex w-[232px] flex-col border-r border-[#dfe2de] bg-[#eef0ed] px-3 py-4">
        <Link href="/home" className="flex h-9 items-center gap-2 px-2"><span className="text-[15px] font-bold tracking-[.14em]">STILL</span><span className="h-3 w-px bg-[#cdd1cd]" /><span className="text-[9px] leading-tight text-[#5b615c]">Solved Today I Learned Log</span></Link>
        <nav aria-label="개인 메뉴" className="mt-5 space-y-0.5">
          {nav.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className="flex h-8 items-center gap-2.5 px-2 text-[13px] font-medium text-[#545a55] hover:bg-[#e2e5e1] hover:text-[#202522]"><Icon aria-hidden="true" size={15} strokeWidth={1.8} />{label}</Link>)}
          <Link href="/editor/new" className="flex h-8 items-center gap-2.5 px-2 text-[13px] font-medium text-[#315c50] hover:bg-[#e2e8e4]"><Plus aria-hidden="true" size={15} strokeWidth={1.8} />새 문서</Link>
        </nav>
        <div className="mt-7 px-2 text-[10px] font-semibold tracking-[.08em] text-[#5b615c]">분야 바로가기</div>
        <nav aria-label="워크스페이스 주제" className="mt-2 space-y-0.5 text-[13px]">
          {topics.map((topic) => (
            <Link key={topic.slug} href={`/topics/${topic.slug}`} className="flex items-center gap-2.5 px-2 py-1.5 text-[#5d635e] hover:bg-[#e2e5e1]">
              <span aria-hidden="true" className="w-4 shrink-0 text-center text-[11px] font-semibold text-[#315c50]">{topic.icon}</span>
              <span className="min-w-0 flex-1 truncate">{topic.title}</span>
              <small className="tabular-nums text-[#868b87]">{topic.pageCount}</small>
            </Link>
          ))}
        </nav>
        <div className="mt-auto">
          {user.role === "admin" && <Link href="/admin" className="mb-2 flex h-8 items-center gap-2.5 px-2 text-[13px] font-medium text-[#5d635e] hover:bg-[#e2e5e1]"><Settings aria-hidden="true" size={15} />관리자</Link>}
          <div className="flex items-center gap-2 border-t border-[#d5d8d4] px-2 pt-3"><span className="grid h-7 w-7 place-items-center bg-[#dce4e0] text-xs font-semibold text-[#315c50]">{user.name.slice(0, 1)}</span><div className="min-w-0 flex-1"><p className="truncate text-[12px] font-semibold">{user.name}</p><p className="truncate text-[10px] text-[#5b615c]">{user.studentId}</p></div><LogoutButton /></div>
        </div>
      </aside>
      <header className="sticky top-0 z-20 flex h-12 items-center justify-between border-b border-[#dfe2de] bg-[#f6f7f5] px-4 md:hidden"><Link href="/home" className="flex min-w-0 items-center gap-2"><span className="text-sm font-bold tracking-[.14em]">STILL</span><span className="h-3 w-px bg-[#cdd1cd]" /><span className="truncate text-[8px] text-[#5b615c]">Solved Today I Learned Log</span></Link><div className="ml-2 flex shrink-0 items-center gap-1"><Link href="/editor/new" aria-label="새 문서" className="grid h-8 w-8 place-items-center bg-[#315c50] text-white"><Plus aria-hidden="true" size={15} /></Link><LogoutButton /></div></header>
      <nav aria-label="모바일 주 탐색" className={`sticky top-12 z-20 grid h-11 border-b border-[#dfe2de] bg-white md:hidden ${user.role === "admin" ? "grid-cols-5" : "grid-cols-4"}`}>
        {mobileNav.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} aria-label={label === "계정 설정" ? "설정" : label} className="flex items-center justify-center gap-1.5 text-[11px] font-medium text-[#5b615c] hover:bg-[#f0f2ef]">
            <Icon aria-hidden="true" size={13} strokeWidth={1.8} />{label === "계정 설정" ? "설정" : label}
          </Link>
        ))}
      </nav>
      <main className="min-h-screen">{children}</main>
    </div>
  );
}
