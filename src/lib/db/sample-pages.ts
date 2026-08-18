export interface SamplePageSeed {
  id: string;
  slug: string;
  title: string;
  icon: string;
  excerpt: string;
  topicSlug: string;
  subtopicSlug: string;
  viewCount: number;
  contentJson: string;
  targetSlugs: string[];
}

type SampleDefinition = Omit<SamplePageSeed, "contentJson" | "targetSlugs"> & {
  introduction: string;
  points: string[];
  related: Array<{ slug: string; title: string }>;
  code?: { language: string; value: string };
};

const legacySegmentTreeContent = [
  { type: "heading", props: { level: 1 }, content: [{ type: "text", text: "세그먼트 트리", styles: {} }] },
  { type: "paragraph", content: [{ type: "text", text: "구간 질의와 점 갱신을 O(log N)에 처리하는 자료구조입니다.", styles: {} }] },
  { type: "heading", props: { level: 2 }, content: [{ type: "text", text: "언제 사용하나요?", styles: {} }] },
  { type: "bulletListItem", content: [{ type: "text", text: "배열의 구간 합·최솟값·최댓값 질의", styles: {} }] },
  { type: "bulletListItem", content: [{ type: "text", text: "값이 자주 바뀌는 온라인 쿼리", styles: {} }] },
];

export const LEGACY_SEGMENT_TREE_CONTENT = JSON.stringify(legacySegmentTreeContent);

function text(value: string) {
  return { type: "text", text: value, styles: {} };
}

function guideContent(definition: SampleDefinition): unknown[] {
  const relatedContent = definition.related.flatMap((page, index) => [
    ...(index > 0 ? [text(" · ")] : []),
    { type: "link", href: `/pages/${page.slug}`, content: page.title },
  ]);
  return [
    { type: "paragraph", content: [text(definition.introduction)] },
    { type: "heading", props: { level: 2 }, content: [text("핵심 포인트")] },
    ...definition.points.map((point) => ({ type: "bulletListItem", content: [text(point)] })),
    ...(definition.code ? [
      { type: "heading", props: { level: 2 }, content: [text("작은 예제")] },
      { type: "codeBlock", props: { language: definition.code.language }, content: definition.code.value },
    ] : []),
    { type: "heading", props: { level: 2 }, content: [text("연결해서 읽기")] },
    { type: "paragraph", content: relatedContent },
  ];
}

const definitions: SampleDefinition[] = [
  {
    id: "segment-tree", slug: "segment-tree", title: "세그먼트 트리 한 번에 이해하기", icon: "🌲",
    excerpt: "구간 쿼리와 업데이트를 O(log N)에 처리하는 원리", topicSlug: "algorithm", subtopicSlug: "data-structures", viewCount: 184,
    introduction: "세그먼트 트리는 배열의 구간 정보를 이진 트리에 나눠 저장해 질의와 갱신을 함께 빠르게 처리합니다.",
    points: ["각 노드는 담당 구간의 합·최솟값 같은 요약값을 저장합니다.", "질의 구간과 겹치는 노드만 방문하므로 시간 복잡도는 O(log N)입니다.", "값이 바뀌지 않는다면 더 단순한 누적 합을 먼저 고려합니다."],
    code: { language: "cpp", value: "long long query(int node, int left, int right, int ql, int qr) {\n  if (qr < left || right < ql) return 0;\n  if (ql <= left && right <= qr) return tree[node];\n  int mid = (left + right) / 2;\n  return query(node * 2, left, mid, ql, qr)\n       + query(node * 2 + 1, mid + 1, right, ql, qr);\n}" },
    related: [{ slug: "dynamic-programming-state", title: "동적 계획법 상태 설계" }, { slug: "database-index", title: "데이터베이스 인덱스" }],
  },
  {
    id: "graph-traversal", slug: "graph-traversal", title: "BFS와 DFS 선택 기준", icon: "🧭",
    excerpt: "그래프 탐색을 문제 조건에 맞게 고르는 기준", topicSlug: "algorithm", subtopicSlug: "graph-search", viewCount: 156,
    introduction: "BFS와 DFS는 방문 순서가 다르므로 최단 거리, 상태 공간, 재귀 깊이를 기준으로 선택해야 합니다.",
    points: ["가중치가 없는 최단 거리는 BFS의 레벨 순서를 활용합니다.", "모든 경로를 끝까지 탐색하거나 백트래킹할 때는 DFS가 자연스럽습니다.", "방문 배열의 상태가 노드만으로 충분한지 먼저 확인합니다."],
    related: [{ slug: "dynamic-programming-state", title: "동적 계획법 상태 설계" }, { slug: "rag-pipeline", title: "RAG 파이프라인" }],
  },
  {
    id: "dynamic-programming-state", slug: "dynamic-programming-state", title: "동적 계획법 상태 설계", icon: "∑",
    excerpt: "부분 문제와 전이를 문장으로 정의하는 방법", topicSlug: "algorithm", subtopicSlug: "dynamic-programming", viewCount: 148,
    introduction: "동적 계획법의 핵심은 점화식보다 먼저 dp[i]가 무엇을 뜻하는지 한 문장으로 고정하는 것입니다.",
    points: ["상태에는 다음 선택을 결정하는 데 필요한 정보만 남깁니다.", "초깃값과 계산 순서가 상태 전이의 방향과 일치해야 합니다.", "상태 수 × 상태당 전이 수로 전체 복잡도를 검산합니다."],
    related: [{ slug: "graph-traversal", title: "BFS와 DFS 선택 기준" }, { slug: "model-evaluation", title: "머신러닝 평가 지표" }],
  },
  {
    id: "model-evaluation", slug: "model-evaluation", title: "머신러닝 평가 지표 고르기", icon: "◈",
    excerpt: "정확도 너머의 정밀도·재현율·검증 전략", topicSlug: "ai", subtopicSlug: "machine-learning", viewCount: 143,
    introduction: "좋은 평가 지표는 모델의 숫자가 아니라 실제 서비스에서 틀렸을 때의 비용을 반영합니다.",
    points: ["불균형 데이터에서는 정확도만으로 성능을 판단하지 않습니다.", "재현율은 놓치면 큰 비용이 드는 양성 사례에 중요합니다.", "검증 데이터가 학습 과정에 새지 않도록 분할 단위를 먼저 정합니다."],
    related: [{ slug: "transformer-attention", title: "Transformer 어텐션" }, { slug: "database-index", title: "데이터베이스 인덱스" }],
  },
  {
    id: "transformer-attention", slug: "transformer-attention", title: "Transformer 어텐션 직관", icon: "◎",
    excerpt: "Query·Key·Value로 문맥을 섞는 과정", topicSlug: "ai", subtopicSlug: "deep-learning", viewCount: 139,
    introduction: "Self-attention은 각 토큰이 다른 토큰을 얼마나 참고할지 가중치를 계산해 문맥 표현을 만듭니다.",
    points: ["Query와 Key의 유사도가 참고 비율을 결정합니다.", "Value의 가중합이 다음 층으로 전달되는 표현이 됩니다.", "멀티헤드는 서로 다른 관계를 병렬로 학습하게 합니다."],
    related: [{ slug: "rag-pipeline", title: "RAG 파이프라인" }, { slug: "react-rendering", title: "React 렌더링 경계" }],
  },
  {
    id: "rag-pipeline", slug: "rag-pipeline", title: "RAG 파이프라인 설계", icon: "✦",
    excerpt: "검색·재순위화·생성을 분리해 점검하는 법", topicSlug: "ai", subtopicSlug: "generative-ai", viewCount: 134,
    introduction: "RAG는 검색 결과를 생성 모델의 근거로 제공해 최신성과 출처 추적 가능성을 높이는 구조입니다.",
    points: ["문서 분할 크기는 검색 정밀도와 문맥 보존 사이의 절충입니다.", "검색 품질과 생성 품질을 분리해 평가해야 병목을 찾을 수 있습니다.", "답변에는 사용한 근거와 실패 시의 안전한 응답을 함께 설계합니다."],
    related: [{ slug: "api-design", title: "REST API 설계" }, { slug: "database-index", title: "데이터베이스 인덱스" }],
  },
  {
    id: "cpp-memory-model", slug: "cpp-memory-model", title: "C++ 메모리와 소유권", icon: "C++",
    excerpt: "스택·힙·RAII를 하나의 수명 규칙으로 이해하기", topicSlug: "programming", subtopicSlug: "cpp", viewCount: 128,
    introduction: "C++에서 안전한 자원 관리는 할당 위치보다 누가 언제 해제할 책임을 갖는지에서 시작합니다.",
    points: ["자동 저장 기간 객체는 스코프를 벗어나면 소멸합니다.", "RAII는 자원 수명을 객체 수명에 묶어 예외 상황도 안전하게 만듭니다.", "소유권이 필요하면 unique_ptr을 기본값으로 고려합니다."],
    related: [{ slug: "segment-tree", title: "세그먼트 트리" }, { slug: "java-collections", title: "Java 컬렉션 선택" }],
  },
  {
    id: "java-collections", slug: "java-collections", title: "Java 컬렉션 선택 기준", icon: "J",
    excerpt: "List·Set·Map을 연산 특성으로 선택하기", topicSlug: "programming", subtopicSlug: "java", viewCount: 122,
    introduction: "컬렉션은 익숙한 구현체보다 조회·삽입·정렬·중복 허용 같은 요구를 기준으로 선택합니다.",
    points: ["순서와 중복이 필요하면 List, 유일성이 필요하면 Set을 사용합니다.", "키 기반 조회에는 Map을 쓰고 키의 동등성 규칙을 확인합니다.", "동시성 컬렉션은 스레드 안전성뿐 아니라 복합 연산의 원자성도 점검합니다."],
    related: [{ slug: "api-design", title: "REST API 설계" }, { slug: "transaction-isolation", title: "트랜잭션 격리 수준" }],
  },
  {
    id: "python-data-pipeline", slug: "python-data-pipeline", title: "Python 데이터 파이프라인", icon: "Py",
    excerpt: "작은 함수와 검증 단계로 재현 가능한 흐름 만들기", topicSlug: "programming", subtopicSlug: "python", viewCount: 118,
    introduction: "데이터 파이프라인은 입력 계약, 변환, 검증, 출력 단계를 분리해야 실패 지점을 빠르게 찾을 수 있습니다.",
    points: ["원본 데이터는 수정하지 않고 변환 결과를 새 값으로 만듭니다.", "단계마다 행 수·결측치·스키마를 검증합니다.", "난수 시드와 환경 정보를 남겨 같은 결과를 재현합니다."],
    related: [{ slug: "model-evaluation", title: "머신러닝 평가 지표" }, { slug: "rag-pipeline", title: "RAG 파이프라인" }],
  },
  {
    id: "react-rendering", slug: "react-rendering", title: "React 렌더링 경계", icon: "◫",
    excerpt: "상태를 가까이 두고 클라이언트 범위를 줄이는 법", topicSlug: "web", subtopicSlug: "frontend", viewCount: 113,
    introduction: "React 화면은 변하는 상태를 가장 가까운 공통 부모에 두고, 상호작용이 필요한 영역만 클라이언트로 분리할수록 단순해집니다.",
    points: ["서버에서 읽을 수 있는 데이터는 서버 컴포넌트에서 준비합니다.", "렌더링 비용보다 먼저 불필요한 상태 공유를 줄입니다.", "키보드와 터치 입력을 같은 사용자 흐름으로 검증합니다."],
    related: [{ slug: "api-design", title: "REST API 설계" }, { slug: "transformer-attention", title: "Transformer 어텐션" }],
  },
  {
    id: "api-design", slug: "api-design", title: "REST API 설계 체크리스트", icon: "◧",
    excerpt: "리소스·상태 코드·멱등성을 일관되게 설계하기", topicSlug: "web", subtopicSlug: "backend", viewCount: 109,
    introduction: "좋은 API는 URL만 예쁜 것이 아니라 같은 입력에 대한 결과와 실패 규칙을 예측할 수 있어야 합니다.",
    points: ["URL은 동사보다 리소스 명사를 중심으로 구성합니다.", "검증 실패와 권한 실패를 구분되는 상태 코드로 반환합니다.", "재시도 가능한 요청은 멱등성과 중복 처리 전략을 문서화합니다."],
    related: [{ slug: "transaction-isolation", title: "트랜잭션 격리 수준" }, { slug: "react-rendering", title: "React 렌더링 경계" }],
  },
  {
    id: "transaction-isolation", slug: "transaction-isolation", title: "트랜잭션 격리 수준", icon: "▦",
    excerpt: "동시 실행에서 허용할 이상 현상을 결정하는 법", topicSlug: "database", subtopicSlug: "relational-db", viewCount: 103,
    introduction: "격리 수준은 무조건 높이는 설정이 아니라 데이터 정합성과 동시 처리량 사이에서 선택하는 계약입니다.",
    points: ["트랜잭션이 지켜야 할 비즈니스 불변식을 먼저 적습니다.", "읽기 현상뿐 아니라 쓰기 충돌과 재시도 전략도 함께 봅니다.", "잠금 범위와 실행 계획은 실제 부하에서 확인합니다."],
    related: [{ slug: "database-index", title: "데이터베이스 인덱스" }, { slug: "api-design", title: "REST API 설계" }],
  },
  {
    id: "database-index", slug: "database-index", title: "데이터베이스 인덱스 읽기", icon: "⌁",
    excerpt: "선택도와 실행 계획으로 인덱스를 검증하는 방법", topicSlug: "database", subtopicSlug: "query-optimization", viewCount: 99,
    introduction: "인덱스는 검색을 빠르게 하지만 쓰기 비용과 저장 공간을 사용하므로 실제 쿼리 패턴을 기준으로 설계합니다.",
    points: ["WHERE·JOIN·ORDER BY에 반복되는 열 조합을 관찰합니다.", "복합 인덱스는 왼쪽부터 사용하는 규칙과 선택도를 함께 봅니다.", "추측 대신 실행 계획과 실제 처리 행 수를 비교합니다."],
    related: [{ slug: "segment-tree", title: "세그먼트 트리" }, { slug: "transaction-isolation", title: "트랜잭션 격리 수준" }],
  },
  {
    id: "project-retrospective", slug: "project-retrospective", title: "프로젝트 회고를 남기는 법", icon: "↗",
    excerpt: "결과보다 다음 행동이 남는 회고 구조", topicSlug: "etc", subtopicSlug: "projects", viewCount: 94,
    introduction: "좋은 회고는 잘잘못을 평가하는 글이 아니라 다음 프로젝트에서 반복하거나 바꿀 행동을 결정하는 기록입니다.",
    points: ["기대한 결과와 실제 결과를 먼저 분리해 적습니다.", "개인의 인상과 로그·지표 같은 관찰 사실을 구분합니다.", "다음 행동에는 담당자와 확인 시점을 함께 둡니다."],
    related: [{ slug: "learning-note-system", title: "학습 노트 연결 습관" }, { slug: "react-rendering", title: "React 렌더링 경계" }],
  },
  {
    id: "learning-note-system", slug: "learning-note-system", title: "학습 노트 연결 습관", icon: "✎",
    excerpt: "새 지식을 기존 질문과 연결해 오래 남기는 방법", topicSlug: "etc", subtopicSlug: "study-notes", viewCount: 91,
    introduction: "노트는 길게 요약하는 것보다 무엇과 연결되고 언제 다시 쓸 수 있는지를 남길 때 지식망이 됩니다.",
    points: ["한 노트에는 하나의 중심 질문을 둡니다.", "기존 노트 두 개 이상을 찾아 공통점이나 차이를 링크합니다.", "다음 복습에서 답할 질문 한 개를 마지막에 남깁니다."],
    related: [{ slug: "project-retrospective", title: "프로젝트 회고" }, { slug: "graph-traversal", title: "BFS와 DFS 선택 기준" }],
  },
];

export const SAMPLE_PAGES: SamplePageSeed[] = definitions.map((definition) => ({
  id: definition.id,
  slug: definition.slug,
  title: definition.title,
  icon: definition.icon,
  excerpt: definition.excerpt,
  topicSlug: definition.topicSlug,
  subtopicSlug: definition.subtopicSlug,
  viewCount: definition.viewCount,
  contentJson: JSON.stringify(guideContent(definition)),
  targetSlugs: definition.related.map((page) => page.slug),
}));
