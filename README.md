# STILL

학번으로 로그인해 공부 자료를 작성하고 공유하는 Notion 스타일 커뮤니티입니다.

## 제공 기능

- 회원가입 없는 관리자 승인 계정: ID는 학번, 초기 비밀번호는 `-` 없는 전화번호
- 비로그인 사용자는 `/landing`만 접근 가능
- 대주제별 문서, 최근 자료, BlockNote 기반 `/` 명령 블록 에디터
- 내 문서, 북마크, 문서 신고
- 관리자 Excel 계정 등록, 대주제 추가, 신고 처리
- SQLite 영속 저장, scrypt 비밀번호 해시, 서명·해시 세션, 로그인 속도 제한

## 로컬 실행

Node.js 24 이상이 필요합니다(`node:sqlite` 사용).

```powershell
npm install
Copy-Item .env.example .env.local
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
```

마지막 명령의 출력으로 `.env.local`의 `AUTH_PEPPER`를 교체하고, 최초 관리자 학번·이름·강한 초기 비밀번호를 설정합니다. 그다음 실행합니다.

```powershell
npm run dev
```

브라우저에서 `http://localhost:3000`을 엽니다. 계정이 하나도 없을 때 최초 관리자가 처음 로그인하면 관리자 계정이 생성됩니다. 이후 `BOOTSTRAP_ADMIN_*` 값은 제거해도 됩니다.

## Excel 계정 등록

관리자 화면에서 2MB 이하 `.xlsx` 파일을 올립니다. 첫 번째 워크시트의 첫 행에 아래 열이 있어야 합니다.

| 이름 | 학번 | 전화번호 |
| --- | --- | --- |
| 김알고 | 20261234 | 010-1234-5678 |

- `name`, `studentId`, `phone` 영문 헤더도 지원합니다.
- 전화번호는 파싱 직후 scrypt 해시로만 저장되며 응답이나 로그에 노출하지 않습니다.
- 이미 존재하는 학번은 건너뜁니다. 재업로드로 기존 비밀번호가 바뀌지 않습니다.
- 전화번호는 추측·노출 가능성이 있는 개인정보라 일반 비밀번호보다 약합니다. 장기 운영 전 최초 로그인 비밀번호 변경이나 학교 SSO 도입을 권장합니다.

## 검증 명령

```powershell
npm test
npm run test:coverage
npm run test:e2e
npm run lint
npm run typecheck
npm run build
npm audit
```

E2E 테스트는 별도의 테스트 DB와 테스트 관리자만 사용합니다.

운영 SQLite 백업은 다음 명령으로 생성합니다.

```powershell
npm run backup
```

## GitHub 및 웹 배포

이 앱은 인증 서버와 영속 SQLite가 필요하므로 GitHub Pages 같은 정적 호스팅 대상이 아닙니다. 저장소의 `render.yaml`을 이용하면 GitHub Actions 검증을 통과한 Docker 이미지를 Render 단일 인스턴스와 영속 디스크에 배포할 수 있습니다.

GitHub 업로드, Render 연결, 비밀값 설정, 백업·복구와 롤백 절차는 [배포 가이드](docs/DEPLOYMENT.md)를 따르세요.

AWS Lightsail/EC2를 쓸 때도 현재 `Dockerfile`과 `/app/data` 영속 볼륨을 그대로 사용할 수 있습니다.

운영에서는 다음도 함께 설정하세요.

- HTTPS를 종료하는 Nginx 또는 AWS Load Balancer
- `/app/data` 볼륨의 자동 스냅샷/백업
- 보안 그룹에서 22, 80, 443 이외 포트 차단
- `.env.production`과 `AUTH_PEPPER`를 Git에 커밋하지 않기
- 여러 서버로 확장할 때 SQLite를 RDS PostgreSQL로 이전
