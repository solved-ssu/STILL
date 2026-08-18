# STILL 프로젝트 비판적 검토 보고서 (by Claude)

**검토 범위**: `src/app` 아래 `page.tsx` 9개 전체(root, landing, home, admin, editor/[pageId], topics/[slug], pages/[slug], me/pages, me/bookmarks) + 이들이 실제로 의존하는 layout, proxy(미들웨어), 인증/세션/DB 레이어, 관련 컴포넌트, API 라우트.
**왜 페이지 파일만 보지 않았는가**: 이 프로젝트의 `page.tsx`들은 대부분 얇은 서버 컴포넌트라 `lib/`와 `components/`를 함께 보지 않으면 "비판적 검토"라 부를 만한 내용이 나오지 않습니다. 그래서 인증/DB/API까지 추적했습니다.
**종합 판정**: **Warning** (HIGH 항목 존재, CRITICAL은 없음). 인증·SQL·세션 레이어는 기대보다 훨씬 탄탄하게 짜여 있고, 발견된 문제는 대부분 "설계는 맞는데 마무리가 덜 된" 성격입니다.

---

## 0. 요약 — 우선순위 Top 3

1. **로그인 비밀번호가 전화번호 고정이고 변경 수단이 전혀 없음** — 이 앱의 실제 위협 모델(같은 학번 커뮤니티 구성원)에서는 코드 품질과 무관하게 가장 위험한 지점입니다. (§2.1)
2. **여러 입력 폼에서 키보드 포커스 표시가 사라짐** — 특히 관리자 페이지의 주제 추가 폼은 포커스 표시가 전무합니다. (§2.2)
3. **조회수(view_count)가 어떤 문서에서도 증가하지 않음** — 사소해 보이지만 홈/주제/문서 등 거의 모든 페이지에 노출되는 값이 항상 0으로 죽어있는, 사용자가 바로 체감하는 버그입니다. (§3.4)

---

## 1. 이미 잘 되어 있는 부분

비판만 나열하면 왜곡된 인상을 주므로 먼저 기록합니다. 아래는 근거를 확인한 것만 적었습니다.

- **비밀번호 저장**: `scrypt` + 서버 pepper + `timingSafeEqual` (`src/lib/auth/password.ts:15-36`). 타이밍 공격, 레인보우 테이블에 안전한 구성입니다.
- **세션**: 세션 ID는 해시로만 저장되고(`session.ts:23-25`), 쿠키에는 HMAC 서명 토큰만 실림, `httpOnly/secure/sameSite=lax` 설정 완비(`session.ts:73-79`), `getCurrentUser`가 React `cache()`로 감싸져 있어 레이아웃과 페이지에서 중복 호출해도 요청당 1회만 실행됩니다(`session.ts:38`).
- **로그인 무차별 대입 방어**: IP+학번 키로 5회 실패 시 15분 잠금(`request-security.ts:18-41`).
- **CSRF 완화**: 모든 mutating 라우트가 `isSameOrigin` 체크를 첫 줄에서 수행.
- **SQL**: 전 구간 파라미터 바인딩, 문자열 조합 쿼리 없음. 소유권 체크를 애플리케이션 코드가 아니라 SQL의 `WHERE ... AND (author_id = ? OR ? = 'admin')` 형태로 박아넣어(`pages.ts:236`, `comments.ts:51,63`) 로직 누락 여지를 줄였습니다.
- **관리자 라우트**: `/admin` 페이지 UI만 숨기는 게 아니라 `admin/accounts/import`, `admin/topics`, `admin/reports/[id]` 라우트 각각이 서버에서 `role !== "admin"`을 독립적으로 재검증합니다. 흔히 놓치는 부분인데 잘 되어 있습니다.
- **XSS 표면**: 문서 본문은 BlockNote의 구조화 JSON, 댓글은 JSX 텍스트 바인딩으로 렌더링되어 `dangerouslySetInnerHTML` 류 raw-HTML 주입 지점을 찾지 못했습니다.
- **`proxy.ts`(Next.js 16의 middleware 후신)** 가 엣지에서 1차 리다이렉트를, `(app)/layout.tsx`의 `ProtectedLayout`이 DB 세션 기준 2차(권위) 검증을 이중으로 수행 — 방어 심도가 있는 구조입니다.

---

## 2. HIGH

### 2.1 인증 모델: 비밀번호 = 전화번호, 변경 수단 없음

- **근거**: `landing/page.tsx:35` "관리자가 등록한 학번과 전화번호를 사용합니다", `login-form.tsx:45` 비밀번호 필드 placeholder가 "전화번호 11자리", `validation.ts:18-21`의 `phonePasswordSchema`가 그대로 로그인 비밀번호 스키마로 재사용됨, `admin-panel.tsx:43` "전화번호 원문은 저장하지 않고 즉시 scrypt 해시로 변환합니다... **기존 학번의 비밀번호는 Excel 재업로드로 바뀌지 않습니다**."
- **문제**: 검토한 9개 page + 12개 API route 어디에도 비밀번호 변경/재설정 라우트가 없습니다. 즉 계정 생성 시점에 고정된 전화번호가 **영구 비밀번호**입니다. scrypt 해싱·rate limit·타이밍 세이프 비교 등 구현은 훌륭하지만, 이 앱의 실제 공격자는 인터넷의 익명 공격자가 아니라 **같은 스터디 그룹 구성원**입니다. 같은 반/동아리에서 서로의 전화번호를 아는 것은 드문 일이 아니며, 카톡 단톡방 등으로 노출되기도 쉽습니다. 전화번호를 아는 사람은 그 즉시 해당 계정으로 완전히 로그인할 수 있고(작성 문서 편집/삭제, 댓글 삭제, 북마크 열람), 본인은 비밀번호를 바꿀 방법이 없습니다.
- **제안**: (a) 최초 로그인 시 비밀번호 변경을 강제하는 플로우 추가, (b) `/me/settings` 류의 자율 변경 라우트 추가, (c) 최소한 관리자가 개별 계정 비밀번호를 재발급할 수 있는 관리 기능 추가. 세 가지 중 하나라도 없으면 "전화번호가 곧 평생 비밀번호"라는 구조가 유지됩니다.

### 2.2 다수 입력 폼에서 키보드 포커스 표시 누락 (WCAG 2.4.7 Focus Visible)

`outline-none`을 적용하면서 이를 대체할 포커스 스타일을 주지 않은 필드들입니다.

| 위치 | 필드 | 대체 포커스 스타일 |
|---|---|---|
| `components/admin-panel.tsx:45` | 주제 추가 폼의 아이콘/이름/슬러그/설명 입력 4개 전부 | **없음** |
| `components/editor-client.tsx:42` | 문서 제목 textarea | 없음 |
| `components/editor-client.tsx:43` | 대주제 select, 한 줄 요약 input | 없음 |
| `components/comments-section.tsx:90-98` | 댓글 작성 textarea | 없음 |
| `components/login-form.tsx:41,45` | 학번/비밀번호 input | `focus:border-[#315c50]` 로 약하게만 존재 (테두리 1px 색만 바뀜, WCAG 2.2 SC 2.4.11 최소 면적 기준 미달 가능성) |

가장 심각한 곳은 관리자 페이지의 주제 추가 폼으로, Tab으로 이동하면 어느 필드에 있는지 시각적으로 전혀 알 수 없습니다. 에디터의 제목/주제/요약 필드도 마찬가지라 핵심 작성 플로우에 영향을 줍니다.
- **제안**: 전역 `:focus-visible` 유틸(예: `focus-visible:ring-2 focus-visible:ring-[color]`)을 하나 만들어 `outline-none`을 쓰는 모든 폼 요소에 일관 적용.

---

## 3. MEDIUM

### 3.1 `src/app/page.tsx`의 고정 리다이렉트가 라우팅 정책과 어긋남

- `page.tsx:4`는 조건 없이 `redirect("/landing")`. 반면 같은 로직을 담당해야 할 `decideRouteAccess`(`lib/auth/access.ts:22-24`)는 `/` 요청 시 로그인 상태면 `/home`, 아니면 `/landing`으로 가라고 명시합니다.
- 현재는 `proxy.ts`의 `matcher`(`proxy.ts:18-29`)가 `/`를 포함하므로 로그인 사용자는 `page.tsx`까지 도달하기 전에 proxy가 먼저 `/home`으로 보내 실질적 문제는 가려져 있습니다. 하지만 두 곳에 같은 정책이 서로 다르게 중복 구현되어 있고, matcher 설정이 바뀌거나 proxy가 스킵되는 배포 환경(예: 리버스 프록시 경로 재작성)에서는 로그인 사용자가 `/home` 대신 `/landing`으로 튕깁니다.
- **제안**: `page.tsx`가 자체적으로 로그인 상태를 판단해 분기하거나, 최소한 "이 파일은 proxy.ts의 리다이렉트를 전제로 한 폴백"이라는 주석으로 의도를 남기세요.

### 3.2 API 라우트의 예외가 전부 무로깅으로 삼켜짐

`login`, `pages`(POST/PATCH), `comments`(POST), `bookmarks`(POST), `admin/topics`(POST) 라우트 전부 `catch { return NextResponse.json({ message: "..." }, { status: ... }) }` 형태로, 서버 콘솔/로그에 원인을 남기지 않고 사용자에게는 고정 메시지만 반환합니다. 예: `api/pages/route.ts` 저장 실패 catch 블록, `api/pages/[pageId]/comments/route.ts` 동일 패턴.
운영 중 실패가 발생해도 "왜" 실패했는지 서버 쪽에 아무 흔적이 남지 않아 재현·디버깅이 어렵습니다.
- **제안**: 최소한 `console.error(error)` 한 줄이라도 catch 블록에 추가.

### 3.3 페이지 콘텐츠(JSON 블록)가 저장 전 형태 검증 없이 그대로 신뢰됨

- `api/pages/route.ts:14`: `content: z.array(z.unknown()).max(500)` — 배열 길이만 검증하고 각 블록의 실제 구조는 전혀 검사하지 않습니다.
- `components/block-editor-inner.tsx:18`: 저장된 값을 `initialContent as PartialBlock[]`로 무검증 캐스팅해 BlockNote에 그대로 넘깁니다.
- 결과적으로 손상되거나 스키마에 맞지 않는 블록이 한 번 저장되면, **그 문서를 읽는 모든 방문자**의 뷰(`pages/[slug]/page.tsx`)와 재편집 화면에서 렌더링이 깨질 수 있는 경로가 서버 쪽 안전망 없이 열려 있습니다.
- **제안**: 서버에서 BlockNote 블록 스키마에 맞는 최소 검증(적어도 `type`/`content` 키 존재 여부)을 추가하거나, 클라이언트 렌더링 쪽에 에러 바운더리를 둬서 한 문서의 깨진 콘텐츠가 전체 페이지를 무너뜨리지 않게 하세요.

### 3.4 조회수(view_count)가 어디에서도 증가하지 않음

- `db/pages.ts:210-225`의 `createPage` INSERT 컬럼 목록에 `view_count`가 없어 스키마 기본값 0(`db/schema.ts:76`)으로 고정 생성되고, `pages.ts` 전체를 통틀어 `view_count`를 갱신하는 `UPDATE`문이 존재하지 않습니다. `getPageBySlug`/`getPageById`도 조회 시 증가시키지 않습니다.
- 하지만 `<Eye size={13} />{page.viewCount}`(`pages/[slug]/page.tsx:30`)와 `page-list.tsx:22`를 통해 **홈, 주제, 내 문서, 북마크, 문서 상세 페이지 전부**에 조회수가 노출됩니다. 즉 시드 데이터 1건("128")을 빼면 모든 실제 문서가 영구히 "0"으로 표시됩니다.
- **제안**: `getPageBySlug` 조회 시(또는 별도 뷰 카운트 API로) `UPDATE pages SET view_count = view_count + 1 WHERE id = ?` 추가. 봇/새로고침 어뷰징이 걱정되면 세션+페이지 단위로 1일 1회 정도로 제한.

### 3.5 문서/주제 상세 페이지에 페이지별 `<title>`이 없음

- `pages/[slug]/page.tsx`, `topics/[slug]/page.tsx` 두 파일 모두 `metadata`/`generateMetadata` export가 없습니다. 반면 home/admin/editor/me/landing은 전부 `export const metadata = { title: "..." }`를 갖고 있습니다.
- 그 결과 사용자가 어떤 문서를 열어도 브라우저 탭 제목은 루트 레이아웃 기본값인 "STILL"로 동일하게 표시됩니다. 여러 문서를 탭으로 열어두면 구분이 안 되고, 링크를 공유해도 제목이 의미 없게 나옵니다.
- **제안**: 두 라우트에 `generateMetadata`를 추가해 `page.title`/`topic.title`을 반영 (다른 라우트들과의 일관성 측면에서도 이 둘만 빠진 것은 누락으로 보입니다).

### 3.6 요청 크기 제한이 `Content-Length` 헤더에만 의존

`pages` POST/PATCH(`600_000` 바이트), `comments` POST(`4_000` 바이트), `admin/accounts/import`(`2MB`) 모두 `Number(request.headers.get("content-length") ?? 0)` 비교로 크기를 제한합니다. 이 헤더는 클라이언트가 보내지 않거나(예: chunked transfer-encoding) 실제 값과 다르게 보낼 수 있어, 헤더만으로는 우회 가능한 소프트 가드입니다. 호스팅 플랫폼이 자체적으로 바디 크기를 제한하는 경우가 많아 실무 위험은 낮지만, 이 앱 레벨 가드 자체를 신뢰해서는 안 됩니다.
- **제안**: 스트림을 직접 읽으며 바이트 수를 세거나, 플랫폼의 바디 크기 제한 설정을 명시적으로 확인.

---

## 4. LOW / 폴리시

| # | 위치 | 내용 |
|---|---|---|
| 4.1 | `editor-client.tsx:42` | 제목 `<textarea rows={1} ... resize-none overflow-hidden>`에 높이 자동 조절 로직이 없음. 38~44px 폰트에서 제목이 두 줄로 넘어가면 두 번째 줄이 `overflow-hidden`에 잘려 스크롤도 없이 사라짐. 재현 쉬움 (긴 제목 입력 시 즉시 확인 가능). |
| 4.2 | `document-actions.tsx:19-24` | 신고(`report`) 실패 시 서버가 보낸 구체적 사유(`reports/route.ts`의 "신고 사유를 10자 이상 입력해 주세요." 등)를 읽지도 않고 항상 고정 문구 "신고를 접수하지 못했습니다."만 보여줌 — `response.json()` 자체를 호출하지 않음. |
| 4.3 | `me/pages/page.tsx:13`, `me/bookmarks/page.tsx:10` | `ProtectedLayout`이 이미 비로그인 시 리다이렉트하므로 `user`는 항상 존재하는데, 두 페이지만 `user ? ... : []` 삼항으로 방어. `editor`/`pages/[slug]`는 반대로 `if (!user) redirect(...)`로 방어. 동작엔 문제 없지만(둘 다 도달 불가 분기) 같은 상황을 다르게 처리하는 스타일 불일치라 다음 유지보수자가 혼란스러울 수 있음. |
| 4.4 | `api/reports/route.ts:8` | `pageId: z.string().uuid().or(z.literal("segment-tree"))` — 시드 데이터의 비-UUID id를 리터럴로 하드코딩. 향후 UUID가 아닌 id를 가진 문서가 추가되면 신고 기능이 "사유 10자 이상 입력" 같은 엉뚱한 검증 오류로 조용히 실패함. |
| 4.5 | `api/admin/accounts/import/route.ts:57-59` | 다른 모든 라우트는 고정 한국어 메시지만 반환하는데 이 라우트만 `error.message`를 그대로 클라이언트에 노출. 관리자 전용이라 위험도는 낮지만 패턴 일관성이 깨짐. |
| 4.6 | `lib/auth/access.ts:7-12` | `proxyPublicPrefixes`(`/api/auth/login`, `/api/health` 등)는 `proxy.ts`의 `matcher`가 애초에 `/api/*`를 포함하지 않아 도달 불가능한 죽은 분기. 없어도 동작엔 지장 없지만, "proxy가 API도 보호한다"는 잘못된 인상을 줄 수 있음 — 실제로는 각 API 라우트가 개별적으로 인증을 체크함. |
| 4.7 | `globals.css` 전반 | 보조/메타 텍스트 색(`#626863` 계열)은 흰 배경 대비 약 5.7:1로 WCAG AA를 통과하지만, placeholder 색(`#8a8f8b`, `comments-section.tsx:97`)은 약 3.3:1로 낮은 편. placeholder는 WCAG 적용 여부가 불명확한 영역이라 강한 위반 단정은 아니지만 점검 권장. |

---

## 5. 페이지별 이슈 매핑

| 페이지 | 경로 | 관련 이슈 |
|---|---|---|
| Root | `src/app/page.tsx` | §3.1 |
| Landing | `src/app/landing/page.tsx` | §2.1(로그인 폼 위치), §2.2(입력 필드 포커스, 약함) |
| Home | `(app)/home/page.tsx` | §3.4(조회수) |
| Topics | `(app)/topics/[slug]/page.tsx` | §3.4, §3.5 |
| Document | `(app)/pages/[slug]/page.tsx` | §3.3, §3.4, §3.5, §4.2 |
| Editor | `(app)/editor/[pageId]/page.tsx` | §2.2, §3.3, §4.1 |
| 내 문서 | `(app)/me/pages/page.tsx` | §4.3 |
| 북마크 | `(app)/me/bookmarks/page.tsx` | §4.3 |
| Admin | `(app)/admin/page.tsx` | §2.2(가장 심각), §4.4, §4.5 |

---

## 6. 권장 조치 순서

1. 비밀번호 변경/재설정 플로우 설계 (§2.1) — 코드 문제가 아니라 제품 결정이 필요하므로 가장 먼저 논의.
2. `outline-none` 전수 조사 후 공통 focus-visible 유틸 적용 (§2.2).
3. 조회수 증가 로직 추가 (§3.4) — 작지만 즉시 체감되는 수정.
4. `pages/[slug]`, `topics/[slug]`에 `generateMetadata` 추가 (§3.5).
5. 나머지 MEDIUM/LOW는 일반 백로그로.
