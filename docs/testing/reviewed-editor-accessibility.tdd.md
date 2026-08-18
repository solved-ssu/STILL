# Claude 최종 리뷰 후속 TDD 증거

## 사용자 여정

- 부원은 장식 문구 없이 문서 작성 가이드를 읽는다.
- 그래프에서 노트를 살필 때 분류상 연결과 실제 문서 링크를 혼동하지 않는다.
- 키보드 사용자도 노트 연결 피커에서 결과를 이동·선택·닫고 원래 트리거로 돌아간다.
- 부원은 실제 편집기에서 `[[`를 입력해 공개 노트를 연결하되, 코드의 `arr[i]`처럼 단일 대괄호는 방해받지 않는다.

## RED 체크포인트

- 커밋: `9ea022f test: cover reviewed graph and editor accessibility gaps`
- 실행: `npm test -- src/components/writing-guide.test.tsx src/components/knowledge-graph.test.tsx src/components/block-editor-inner.test.tsx src/components/page-list.test.tsx`
- 결과: 4개 파일, 23개 테스트 중 7개 실패. `MEMBER WRITING` 장식, 페이지의 계층 연결 수/문서 링크 빈 상태 모순, 피커 키보드·ARIA·포커스 부재, 목록 장식 아이콘 노출을 재현했다.

## 구현과 GREEN

- 작성 가이드의 영문 대문자 장식 라벨을 제거했다.
- 페이지 노드의 탐색 정보는 `문서 링크 n개`만 표시하고, 0개일 때도 같은 개념의 빈 상태를 표시한다. 대·소주제는 별도로 `그래프 연결 n개`를 표시한다.
- 커스텀 연결 피커는 `listbox`/`option`, `aria-activedescendant`, `aria-autocomplete`를 갖고 방향키·Enter·Escape를 지원한다. Escape는 트리거 버튼으로 포커스를 되돌린다.
- BlockNote 트리거를 단일 `[`에서 `[[`로 고쳤다. 실제 문자 입력에서만 트리거가 인식되므로 `arr[i]`에는 제안이 열리지 않는다.
- 주제·소주제·문서 목록의 아이콘을 `aria-hidden`으로 표시했다.

| 보증 | 검증 | 결과 |
|---|---|---|
| 리뷰된 단위 접근성·그래프·피커 동작 | `npm test -- src/components/writing-guide.test.tsx src/components/knowledge-graph.test.tsx src/components/block-editor-inner.test.tsx src/components/page-list.test.tsx` | 4 files, 23 tests PASS |
| 실제 `[[` 입력과 단일 `[` 회귀 | `npx playwright test e2e/editor-links.spec.ts` | desktop/tablet/mobile 3 tests PASS |
| 전체 단위·통합 | `npm test` | 33 files, 129 tests PASS |
| 커버리지 | `npm run test:coverage` | statements 92.57%, branches 83.36%, functions 95.37%, lines 94.68% |
| 린트·타입·빌드 | `npm run lint`, `npm run typecheck`, `npm run build` | PASS |
| 전체 브라우저·접근성 | `npm run test:e2e` | desktop/tablet/mobile 33 tests PASS |

## 남은 경계

- 실제 제안 메뉴의 내부 마크업은 BlockNote 라이브러리 소유다. E2E는 눈에 보이는 제안과 선택 결과를 검증하며, 라이브러리의 CSS 클래스에는 의존하지 않는다.
