@AGENTS.md

# Task Automation Project

Jira 프로젝트 링크를 등록해두면 일/주/월 단위로 전 기간 대비 이슈 상태 변화를 자동으로 집계해 보여주고, 리포트를 생성/발송하는 개인용 업무 자동화 서비스.

자세한 목적/요구사항/기능 명세는 [docs/requirements.md](docs/requirements.md) 참고.

## 목표

- Jira Cloud API와 연동하여 여러 프로젝트의 이슈 데이터를 수집
- 일별 / 주별 / 월별 단위로 전 기간 대비 이슈 상태 변화(diff)를 집계하는 대시보드 제공
- 집계 결과를 바탕으로 리포트를 자동 생성하여 MS Teams로 발송

## 주요 기능

- 프로젝트 관리: 프로젝트 이름 + Jira 에픽 링크(예: `https://team.atlassian.net/browse/PROJ-123`)만 입력하면 사이트 URL/프로젝트 키/에픽 키를 자동 파싱해 등록 — 그 하위 이슈만 추적. Jira 계정 이메일/API 토큰은 최초 1회만 입력하면 이후 등록부터 자동 재사용(다른 계정으로 등록하고 싶을 때만 별도 입력). 등록/수정/삭제는 실제 Postgres DB에 저장, API 토큰은 AES-256-GCM 암호화
- 이슈 데이터 수집: 등록된 프로젝트 카드의 '지금 동기화' 버튼으로 Jira REST API를 호출해 이슈를 가져와 스냅샷으로 저장 (수동 트리거만 구현, 자동 스케줄링은 미구현)
- 변경 사항 추적(Diff): 두 스냅샷을 비교해 신규/완료/상태 변경/삭제(필터 이탈)/마감 지연 이슈를 계산
- 대시보드: 기간별(일/주/월) 이슈 처리 현황, 상태 분포, 처리 추이, 변경 내역을 실제 DB 데이터로 표시
- 자동 보고: 정해진 주기(일/주/월)로 리포트 생성 및 MS Teams 자동 발송 (미구현)

## 전제 조건 (확정)

- Jira 종류: Jira Cloud (API Token + Email 인증)
- 사용 범위: 개인용 (멀티유저/권한 분리 없음)
- 리포트 채널: 대시보드 내 확인 + MS Teams

## 기술 스택

- Frontend: Next.js (App Router) + TypeScript + Tailwind CSS v4 + shadcn/ui
- 차트: Recharts (Tailwind v4는 CSS 기반 설정이라 Tremor의 tailwind.config 기반 테마와 궁합이 안 맞아 Recharts로 결정)
- 데이터 페칭/캐싱: TanStack Query
- Backend: Next.js Route Handlers (풀스택 단일 프로젝트)
- ORM: Prisma 7 (driver adapter 방식 — `@prisma/adapter-pg` + `pg` 필요, `PrismaClient`는 반드시 adapter와 함께 생성)
- DB: PostgreSQL (Neon 또는 Supabase — 서버리스 배포에 적합)
- 스케줄링: Vercel Cron (일 단위 스냅샷 수집)
- 인증: 개인용 간단 비밀번호 세션 인증 (배포 시 외부 노출 방지 목적)
- 배포: Vercel
- 외부 연동: Jira REST API v3, MS Teams Incoming Webhook (Adaptive Cards)

## 현재 상태

- 요구사항 명세 완료 ([docs/requirements.md](docs/requirements.md))
- 로컬 개발용 DB: Postgres.app(PG17)을 `/Applications/Postgres.app`에 설치해 `localhost:5432`에서 실행 중 (데이터 디렉터리 `~/Library/Application Support/Postgres/var-17`). 마이그레이션 적용 완료(`prisma/migrations/20260803080419_init`, `20260804001858_add_epic_key`, `20260804003251_default_jira_credentials`), `prisma/seed.ts`로 `AppSetting` 싱글톤 row 시드.
- **DB 연동 완료** — 프로젝트 CRUD, Jira 스냅샷 수집, 대시보드 diff가 모두 실제 Postgres에 연결되어 동작:
  - `src/app/api/projects/route.ts` POST: 등록 폼은 이름+에픽 링크+(선택)이메일+(선택)API 토큰만 받음. `src/lib/jira.ts`의 `parseEpicLink()`로 링크에서 siteUrl/projectKey/epicKey를 파싱하고, `verifyConnection()`으로 실제 Jira 인증 확인 후 `buildEpicScopedJql()`(`"Epic Link" = X OR parent = X`, 클래식·팀 관리형 프로젝트 모두 커버)을 jql에 자동 저장. 이름을 안 적으면 `getIssue()`로 에픽 요약을 기본값으로 사용. `Project.epicKey` 컬럼 추가, 유니크 제약은 `(siteUrl, projectKey, epicKey)` — 같은 프로젝트의 서로 다른 에픽을 각각 등록 가능
  - 계정 정보 재사용: `src/lib/app-settings.ts`(`AppSetting.defaultJiraEmail`/`defaultJiraApiTokenEnc`)에 마지막으로 입력한 이메일/토큰을 저장해두고, 다음 등록부터 이메일/토큰을 생략하면 자동으로 재사용. 이메일·토큰 중 하나만 보내면 400. `GET /api/settings`로 프론트가 "저장된 계정 있음" 여부를 확인해 입력란을 숨김/노출
  - `src/app/api/projects/[id]/route.ts`: 수정은 기존처럼 siteUrl/projectKey를 직접 입력하는 상세 폼 유지 (에픽 링크 재파싱은 미지원), 토큰 로테이션 시 `src/lib/crypto.ts`로 암호화. 응답에는 `apiTokenEnc` 절대 미포함
  - `src/app/api/projects/[id]/sync/route.ts` + `src/lib/snapshot-service.ts`: '지금 동기화' 버튼 → Jira에서 이슈 조회 → `Snapshot`/`IssueSnapshot` 저장 (실패 시 `FAILED` 상태 + `errorMessage` 기록, 기존 데이터는 보존). 에픽 등록 프로젝트(`epicKey` 있음)는 `src/lib/jira.ts`의 `searchAllIssuesWithDescendants()`로 **리프 레벨만** 추적: 에픽 직속 이슈를 조회한 뒤 그 키들로 `parent in (...)` 재조회 — 하위작업이 있는 직속 이슈(예: 작업/Task)는 제외하고 그 하위작업만 남기고, 하위작업이 없는 직속 이슈(예: 하위작업 없는 스토리·버그·작업)는 그 자체가 리프이므로 그대로 포함. 타입 이름이 아니라 "하위작업 존재 여부"로 판단하므로 이슈 타입 구성이 달라도 동일하게 동작
  - 마감일 수집: `src/lib/jira.ts`의 `resolveDueDateFieldId()`가 Jira 표준 `duedate` 필드 대신 프로젝트별 커스텀 날짜 필드(예: "기한")를 쓰는 경우를 자동 감지 — `/rest/api/3/field`에서 이름이 "기한"/"Due date"인 날짜 필드를 찾되, Team-managed 프로젝트는 프로젝트마다 동일한 이름의 커스텀 필드를 별도로 갖고 있어 **반드시 대상 프로젝트의 Jira 내부 id로 스코프를 맞춰서** 골라야 함 (`JiraClientConfig.projectKey` 전달 필요). 찾은 필드값은 `issue.fields.duedate`에 정규화되어 `toIssueSnapshotData()`가 그대로 사용
  - `src/lib/diff.ts` + `src/app/api/dashboard/route.ts`: 두 스냅샷 비교로 신규/완료/상태변경/삭제/지연 계산, 상태 분포·처리 추이 집계. "신규"/"삭제" 이슈는 상태 전이(from→to)가 아니라 현재/마지막 상태 하나만 있으므로 `toStatus`/`fromStatus` 중 있는 쪽만 채움 — `change-list.tsx`는 양쪽 다 있으면 화살표로, 한쪽만 있으면 단일 뱃지로 표시
  - 프론트엔드는 TanStack Query(`src/hooks/use-projects.ts`, `src/hooks/use-dashboard.ts`, `src/hooks/use-app-settings.ts`)로 위 API를 호출 — `/`, `/projects` 페이지 모두 mock 데이터 제거 완료 (`src/lib/mock-data.ts` 삭제됨). 등록 다이얼로그(`project-form-dialog.tsx`)는 등록용 `EpicCreateForm`과 수정용 `ProjectEditForm`으로 분리됨. API 토큰 라벨 옆 물음표 아이콘(호버 시 발급 방법 툴팁)은 shadcn `tooltip` 컴포넌트 사용 — `Providers`에 `TooltipProvider` 추가됨
  - 차트 색상은 dataviz 스킬의 검증된 팔레트를 `globals.css`에 CSS 변수로 이식해서 사용 (`--chart-1`~`--chart-8`, `--status-*`)
- 아직 없음: 인증(비밀번호 세션), Vercel Cron 자동 스케줄링(현재는 수동 동기화만), Teams 발송 로직, 프로젝트 수정 폼의 색상 태그 입력 UI, 에픽이 아닌 "프로젝트 전체 추적" 등록 경로(현재 등록 폼은 에픽 링크 전용)

## 개발 규칙

- **새로운 기능이 추가되거나 기존 기능의 범위가 변경될 때마다 이 CLAUDE.md 파일의 "주요 기능"과 "현재 상태" 섹션을 함께 업데이트한다.** 코드와 문서가 어긋나지 않도록 기능 변경과 문서 갱신을 같은 작업 단위로 취급한다.
- 기능 단위의 상세 요구사항은 `docs/requirements.md`에도 함께 반영한다.
