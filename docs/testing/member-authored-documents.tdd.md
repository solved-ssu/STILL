# 부원 작성 중심 문서 공간 TDD 증거

## 사용자 여정

- 부원은 예시 답안에 자리를 빼앗기지 않고, 빈 대주제·소주제에서 자신의 학습 기록을 시작한다.
- 기존 운영 DB를 쓰는 부원은 시드 문서가 정리된 뒤에도 자신이 작성한 문서를 잃지 않는다.
- 부원은 홈과 편집기에서 주제 선정, 권장 구조, 출처, 내부 링크, 초안·공개 절차를 확인한다.

## RED 체크포인트

- 커밋: `21a248e test: define member-authored document workspace`
- 실행: `npm test -- src/lib/db/pages.test.ts src/components/writing-guide.test.tsx src/components/editor-client.test.tsx`
- 결과: 3개 파일 중 3개 실패, 19개 테스트 중 6개 실패. 기존 초기화가 15개 예시 문서를 만들었고, `WritingGuide`와 편집기 안내 영역이 없어서 의도한 실패가 발생했다.

## GREEN 체크포인트

- 시드 본문 정의를 제거했다. 새 DB에는 분류 체계만 만들고 문서는 만들지 않는다.
- 기존 DB에서는 고정 시드 ID이면서 `author_id IS NULL`, `author_name = 'STILL 편집팀'`인 레코드만 삭제한다. 사용자 작성 문서에는 이 조건이 적용되지 않는다.
- 홈과 편집기에 정적 작성 가이드를 추가했다. 안내는 주제·질문, 권장 구조, 근거·출처, `[[` 내부 링크, 저장·공개 점검을 다룬다.
- 실행: `npm test -- src/lib/db/pages.test.ts src/components/writing-guide.test.tsx src/components/editor-client.test.tsx`
- 결과: 3개 파일, 20개 테스트 PASS.

## 최종 검증

| 보증 | 검증 | 결과 |
|---|---|---|
| 신규 초기화에 예시 문서가 없음 | `src/lib/db/pages.test.ts` | PASS |
| 고정 편집팀 시드만 지우고 부원 문서를 보존 | `src/lib/db/pages.test.ts` | PASS |
| 홈·편집기 작성 가이드의 구조·출처·링크 안내 | `src/components/writing-guide.test.tsx`, `src/components/editor-client.test.tsx` | PASS |
| 기존 댓글 테스트가 실제 사용자 문서 fixture를 사용 | `src/lib/db/comments.test.ts` | PASS |
| 단위·통합 | `npm test` | 32 files, 126 tests PASS |
| 커버리지 | `npm run test:coverage` | statements 92.57%, branches 83.24%, functions 95.37%, lines 94.68% |
| 린트·타입 | `npm run lint`, `npm run typecheck` | PASS |
| 프로덕션 빌드 | `npm run build` | PASS |
| 브라우저·접근성 | `npm run test:e2e` | desktop/tablet/mobile 30 tests PASS |

## 의도적인 경계

- 자동 삭제는 이전에 앱이 만든 고정 15개 시드 문서에만 적용한다. 부원이 만든 문서와 제목이 비슷해도 작성자 식별 조건이 맞지 않으면 건드리지 않는다.
- 작성 가이드는 일반 문서가 아니라 홈·편집기의 UI이므로 그래프·분야별 문서 수를 점유하지 않는다.
