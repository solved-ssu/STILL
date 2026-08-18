import type { ContributorStat } from "@/lib/db/pages";

export function ContributorDashboard({ contributors }: { contributors: ContributorStat[] }) {
  return (
    <section className="mt-10" aria-labelledby="contributor-title">
      <div className="mb-3">
        <h2 id="contributor-title" className="text-lg font-semibold tracking-[-.02em]">작성 현황</h2>
        <p className="mt-1 text-xs text-[#626863]">회원별 이번 달 공개 포스팅 수</p>
      </div>
      <div className="grid border border-[#dfe2de] bg-white sm:grid-cols-2 lg:grid-cols-3">
        {contributors.map((contributor, index) => (
          <div key={contributor.studentId} aria-label={`${contributor.name}: 이번 달 ${contributor.monthlyPostCount}개, 전체 ${contributor.postCount}개`} className="flex items-center gap-3 border-b border-[#e7e9e6] px-4 py-3 sm:[&:nth-last-child(-n+2)]:border-b-0 lg:[&:nth-last-child(-n+3)]:border-b-0">
            <span className="w-5 text-[11px] tabular-nums text-[#626863]">{String(index + 1).padStart(2, "0")}</span>
            <span aria-hidden="true" className="grid h-8 w-8 place-items-center bg-[#e8eeeb] text-xs font-semibold text-[#315c50]">{contributor.name.slice(0, 1)}</span>
            <strong className="min-w-0 flex-1 truncate text-[13px] font-medium">{contributor.name}</strong>
            <span className="text-right text-[10px] tabular-nums text-[#626863]"><b className="block text-base font-semibold text-[#315c50]">{contributor.monthlyPostCount}개</b>전체 {contributor.postCount}개</span>
          </div>
        ))}
      </div>
    </section>
  );
}
