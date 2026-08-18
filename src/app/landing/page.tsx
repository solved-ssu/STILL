import { LoginForm } from "@/components/login-form";

export const metadata = { title: "로그인" };

const indexRows = [
  ["01", "알고리즘 / 자료구조", "문제 풀이와 핵심 개념"],
  ["02", "AI", "모델, 논문, 실험 기록"],
  ["03", "Programming 언어", "문법과 구현 패턴"],
  ["04", "Web / Database", "서비스를 만드는 기술"],
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#f6f7f5] px-5 py-6 md:px-10 md:py-8">
      <header className="mx-auto flex max-w-[1120px] items-center justify-between border-b border-[#dfe2de] pb-5">
        <div className="flex items-baseline gap-3"><span className="text-lg font-bold tracking-[.12em]">STILL</span><span className="text-[10px] text-[#606661] sm:text-xs">Solved Today I Learned Log</span></div>
        <span className="hidden text-xs text-[#606661] sm:block">members only</span>
      </header>

      <section className="mx-auto grid min-h-[calc(100vh-7rem)] max-w-[1120px] items-center gap-14 py-14 lg:grid-cols-[1fr_400px]">
        <div>
          <p className="text-xs font-medium text-[#315c50]">STUDY INDEX / 2026</p>
          <h1 className="mt-4 max-w-2xl text-[42px] font-semibold leading-[1.18] tracking-[-.045em] text-[#202522] md:text-[54px]"><span className="block text-[13px] font-semibold tracking-[.06em] text-[#315c50] md:text-[15px]">STILL · Solved Today I Learned Log</span><span className="mt-3 block">오늘 공부한걸 기록하세요</span></h1>
          <p className="mt-6 max-w-lg text-[15px] leading-7 text-[#626863]">개인 노트를 분야별로 정리하고, 다른 구성원의 자료와 연결하는 내부 학습 공간입니다.</p>
          <div className="mt-10 max-w-2xl border-y border-[#dfe2de]">
            {indexRows.map(([number, title, description]) => (
              <div key={number} className="grid grid-cols-[36px_1fr] gap-3 border-b border-[#e7e9e6] py-3.5 last:border-b-0 sm:grid-cols-[40px_190px_1fr]"><span className="text-xs tabular-nums text-[#626863]">{number}</span><strong className="text-sm font-medium">{title}</strong><span className="hidden text-sm text-[#606661] sm:block">{description}</span></div>
            ))}
          </div>
        </div>

        <aside className="border border-[#d8dbd7] bg-white p-7 md:p-8">
          <p className="text-xs text-[#626863]">로그인</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-.03em]">기록을 이어서 작성하세요.</h2>
          <p className="mt-2 text-sm leading-6 text-[#666c67]">학번과 비밀번호를 사용합니다. 첫 비밀번호는 등록된 전화번호입니다.</p>
          <LoginForm />
        </aside>
      </section>
    </main>
  );
}
