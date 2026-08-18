# GitHub 업로드와 웹 배포 가이드

## 권장 구성

STILL은 로그인 API와 영속 SQLite 데이터베이스가 필요한 동적 서비스입니다. GitHub Pages 같은 정적 호스팅에는 올릴 수 없고, 서버리스 파일 시스템도 데이터 저장소로 사용할 수 없습니다.

소규모 운영의 권장 구성은 다음과 같습니다.

- 소스와 CI: 비공개 GitHub 저장소 + GitHub Actions
- 웹 서버: Render Docker Web Service `starter` 플랜
- 데이터: `/app/data`에 연결한 Render Persistent Disk 1GB
- 확장 단위: SQLite를 쓰는 동안 인스턴스 1개
- 백업: SQLite 온라인 백업 + Render 디스크 스냅샷 + 별도 위치 복사

Render의 영속 디스크는 유료 서비스에서만 쓸 수 있습니다. 무료 인스턴스의 파일 시스템은 재배포나 재시작 때 사라질 수 있으므로 실제 데이터를 저장하면 안 됩니다.

## 1. 업로드 전 비밀·데이터 확인

현재 이 폴더의 상위 `Solved` 폴더가 Git 저장소이고 `STILL/`은 아직 추적되지 않은 상태입니다. STILL만 별도 배포하려면 이 폴더를 독립 저장소로 만드는 편이 안전합니다. 아래 명령을 `STILL` 폴더에서 실행하세요. 상위 저장소에서는 `STILL`을 추가하거나 커밋하지 않습니다.

```powershell
git check-ignore .env.local data/still.db backups
git status --short --ignored
```

`.env.local`, `data/*.db`, `backups/`, `.next/`가 ignored로 표시되는지 확인합니다. 실제 `AUTH_PEPPER`, 관리자 비밀번호, SQLite 파일, Excel 원본을 Git에 추가하면 안 됩니다. 이미 추가했다면 단순 삭제만으로는 Git 기록에서 사라지지 않으므로 업로드를 멈추고 비밀값을 교체해야 합니다.

## 2. 독립 Git 저장소 만들기

```powershell
cd C:\Users\picom\orca\workspaces\vsc\Solved\STILL
git init -b main
git add .
git status --short
git diff --cached --check
git commit -m "chore: prepare STILL for deployment"
```

`git status --short`에서 `.env.local`, DB, 백업 파일이 보이면 커밋하지 말고 `.gitignore`부터 확인합니다.

GitHub CLI를 쓴다면 다음 명령으로 비공개 저장소를 생성하고 바로 올릴 수 있습니다.

```powershell
gh auth login
gh repo create still --private --source=. --remote=origin --push
```

웹에서 저장소를 만들고 싶다면 GitHub에서 README나 `.gitignore` 없이 빈 비공개 저장소를 만든 뒤 표시된 주소를 사용합니다.

```powershell
git remote add origin https://github.com/내-계정/still.git
git push -u origin main
```

GitHub 공식 절차: [Adding locally hosted code to GitHub](https://docs.github.com/en/migrations/importing-source-code/using-the-command-line-to-import-source-code/adding-locally-hosted-code-to-github)

## 3. GitHub Actions 확인

푸시하면 `.github/workflows/ci.yml`이 다음을 자동 검사합니다.

- ESLint와 TypeScript
- 단위 테스트 및 80% 커버리지 기준
- high 이상 의존성 취약점
- Next.js 프로덕션 빌드
- Chromium E2E 테스트

GitHub의 **Actions** 탭에서 `CI`가 모두 초록색인지 확인하세요. 저장소의 **Settings → Branches** 또는 Rulesets에서 `main`에 `verify`, `e2e` 통과를 요구하면 실패한 코드가 바로 배포되는 일을 줄일 수 있습니다.

GitHub Actions 공식 Node.js 안내: [Building and testing Node.js](https://docs.github.com/en/actions/tutorials/build-and-test-code/nodejs)

## 4. Render에 배포

1. [Render Dashboard](https://dashboard.render.com/)에서 **New → Blueprint**를 선택합니다.
2. 방금 올린 GitHub 저장소를 연결합니다.
3. 저장소 루트의 `render.yaml`을 확인하고 적용합니다.
4. `BOOTSTRAP_ADMIN_ID`, `BOOTSTRAP_ADMIN_NAME`, `BOOTSTRAP_ADMIN_PASSWORD` 세 값을 모두 입력합니다.
5. 배포가 끝나면 Render가 제공한 `https://...onrender.com` 주소를 엽니다.

`AUTH_PEPPER`는 Blueprint가 안전한 임의값으로 한 번 생성합니다. 이 값은 비밀번호 해시와 로그인 세션에 쓰이므로 운영 중 재생성하거나 변경하면 안 됩니다. 분실 시 기존 비밀번호 검증이 불가능해질 수 있습니다.

최초 관리자 로그인이 성공하고 계정이 만들어졌다면 Render의 **Environment**에서 `BOOTSTRAP_ADMIN_*` 세 값을 모두 삭제한 뒤 수동 배포합니다. 이후 관리자는 UI에서 계정을 등록합니다.

배포 후 아래 항목을 확인합니다.

1. `/api/health`가 HTTP 200과 `{"status":"ok"}`를 반환한다.
2. 관리자 로그인과 비밀번호 변경이 된다.
3. 문서를 하나 만든 뒤 다시 배포해도 문서가 남는다.
4. 잘못된 로그인 요청과 권한 없는 관리자 API가 거부된다.
5. 데스크톱과 모바일에서 그래프 드래그·확대·초기화가 동작한다.

Render 참고 문서: [Web Services](https://render.com/docs/web-services), [Persistent Disks](https://render.com/docs/disks), [Blueprint specification](https://render.com/docs/blueprint-spec)

## 5. 환경 변수

| 변수 | 필수 여부 | 운영값 |
| --- | --- | --- |
| `AUTH_PEPPER` | 필수 | 32자 이상의 고정 비밀값. Git에 저장하지 않음 |
| `STILL_DATABASE_PATH` | 필수 | Render에서는 `/app/data/still.db` |
| `STILL_BACKUP_DIR` | 권장 | Render에서는 `/app/data/backups` |
| `BOOTSTRAP_ADMIN_ID` | 최초 1회 | 4~20자리 숫자 |
| `BOOTSTRAP_ADMIN_NAME` | 최초 1회 | 관리자 이름 |
| `BOOTSTRAP_ADMIN_PASSWORD` | 최초 1회 | 128자 이하의 강한 초기 비밀번호 |

`BOOTSTRAP_ADMIN_*`는 세 값을 모두 설정하거나 모두 제거해야 합니다. 앱 시작 전에 런타임 검사기가 비밀값, 부트스트랩 설정, DB 저장 경로와 SQLite 무결성을 검사하며 문제가 있으면 서버를 시작하지 않습니다.

## 6. 백업과 복구

로컬 또는 일반 Node.js 배포에서는 다음 명령으로 실행 중인 WAL 데이터베이스를 안전하게 복사하고 결과의 무결성을 다시 검사합니다.

```powershell
npm run backup
```

Render Shell에서는 Docker 이미지에 포함된 스크립트를 직접 실행합니다.

```bash
node scripts/backup-database.mjs
```

백업 파일은 `/app/data/backups/still-날짜.db`에 생성됩니다. 같은 디스크의 백업만으로는 디스크 장애에 대비할 수 없으므로 정기적으로 암호화된 별도 저장소에 복사하세요. Render 디스크 스냅샷도 활성화하고 복구 시점을 기록합니다.

복구는 쓰기 중인 앱을 먼저 중지한 다음 진행합니다. 현재 DB와 Render 스냅샷을 보존하고, 백업의 `PRAGMA quick_check`가 `ok`인지 확인한 뒤 `still.db`를 교체합니다. 실행 중인 DB 파일이나 `-wal`/`-shm` 파일을 임의로 덮어쓰면 손상될 수 있습니다. 복구 후 앱을 시작하고 `/api/health`, 로그인, 최근 문서를 확인합니다.

## 7. 운영과 롤백

- 커스텀 도메인은 Render **Settings → Custom Domains**에서 연결합니다. HTTPS 인증서는 자동 발급됩니다.
- 코드 문제는 Render의 이전 성공 배포로 롤백합니다. 데이터 문제는 디스크 스냅샷이나 검증된 SQLite 백업으로 별도 복구합니다.
- 영속 디스크를 붙인 서비스는 단일 인스턴스로 운영하며 무중단 배포가 제한됩니다. 사용자가 적은 시간에 배포하세요.
- 동시 사용량이 커지거나 인스턴스를 둘 이상 실행해야 하면 먼저 PostgreSQL로 이전해야 합니다. 동일 SQLite 파일을 여러 서버가 공유하도록 구성하지 않습니다.
- Next.js 자체 호스팅에서는 앞단 프록시 사용이 권장됩니다. Render가 TLS 종료와 외부 프록시 역할을 담당합니다. [Next.js self-hosting guide](https://nextjs.org/docs/app/guides/self-hosting)

## 최종 체크리스트

- [ ] GitHub 저장소는 비공개이며 비밀값과 DB 파일이 커밋되지 않았다.
- [ ] GitHub Actions의 `verify`, `e2e`가 통과했다.
- [ ] Render에 `/app/data` 영속 디스크가 연결됐다.
- [ ] `AUTH_PEPPER`를 별도로 안전하게 보관했고 변경하지 않는다.
- [ ] 최초 관리자 생성 후 `BOOTSTRAP_ADMIN_*`를 제거했다.
- [ ] 재배포 후에도 데이터가 유지되는지 확인했다.
- [ ] 앱 외부 위치에 복구 가능한 최신 백업이 있다.
- [ ] `/api/health`, 로그인, 문서 작성, 그래프 상호작용을 점검했다.
