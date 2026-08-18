type WritingGuideProps = {
  variant?: "full" | "compact";
};

const steps = [
  {
    title: "주제와 질문을 하나로 정하기",
    body: "대주제와 소주제를 먼저 고른 뒤, 한 문서에서 답할 질문을 한 문장으로 적으세요. 이미 있는 노트와 겹치면 다른 관점·실험·오류 해결 과정을 중심으로 좁힙니다.",
  },
  {
    title: "권장 문서 구조",
    body: "제목과 한 줄 요약 다음에 ‘문제·질문’, ‘핵심 내용’, ‘직접 해 본 것’, ‘참고 자료’, ‘다음에 확인할 점’ 순서로 정리하면 읽는 사람이 빠르게 따라갈 수 있습니다.",
  },
  {
    title: "근거와 출처 남기기",
    body: "공식 문서, 논문, 강의, 실험 로그처럼 확인 가능한 근거를 ‘참고 자료’에 링크와 함께 남기세요. 다른 글의 문장을 그대로 옮겼다면 인용임을 분명히 표시합니다.",
  },
  {
    title: "노트 연결하기",
    body: "이미 공개된 노트를 언급할 때는 본문에서 [[를 입력해 제목을 찾아 연결하세요. 연결 이유를 한 문장으로 덧붙이면 그래프에서도 배움의 흐름이 더 잘 보입니다.",
  },
  {
    title: "저장·공개 전 확인",
    body: "제목·분류·한 줄 요약을 확인하고, 코드·이미지·링크가 실제로 열리는지 점검하세요. 초안으로 먼저 저장한 뒤 피드백을 반영해 공개해도 됩니다.",
  },
];

export function WritingGuide({ variant = "full" }: WritingGuideProps) {
  const compact = variant === "compact";
  return (
    <aside aria-label="문서 작성 방법" className={compact ? "border border-[#dfe2de] bg-[#f8f9f7] p-4" : "border-y border-[#dfe2de] bg-white p-5 md:p-6"}>
      <div className="max-w-3xl">
        <p className="text-[11px] font-semibold tracking-[.12em] text-[#315c50]">MEMBER WRITING</p>
        <h2 className="mt-1 text-lg font-semibold tracking-[-.02em]">문서 작성 가이드</h2>
        <p className="mt-2 text-sm leading-6 text-[#626863]">예시 문서 대신 이 기준을 참고해, 부원 각자의 학습·실험·문제 해결 기록을 남겨 주세요.</p>
      </div>
      <ol className={compact ? "mt-4 grid gap-3" : "mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3"}>
        {steps.map((step, index) => (
          <li key={step.title} className="min-w-0 border-l-2 border-[#9bb5a8] pl-3">
            <p className="text-xs font-semibold text-[#315c50]">0{index + 1}</p>
            <h3 className="mt-1 text-sm font-semibold text-[#303532]">{step.title}</h3>
            <p className="mt-1 text-xs leading-5 text-[#626863]">{step.body}</p>
          </li>
        ))}
      </ol>
    </aside>
  );
}
