# 시그널리 (Signally)

시그널리는 실시간 교통 신호를 지도에서 확인하는 웹 서비스입니다. 첫 목표는 서울특별시 관악구 미성동 난곡사거리 반경 500m에서 보행자 신호의 현재 상태와 변경까지 남은 시간을 제공하는 것입니다. 이후 서울 전역으로 서비스 지역을 넓히고 차량 신호도 지원할 계획입니다.

## 기술 스택

- Next.js 16 (App Router), React 19, TypeScript 5 (Strict Mode)
- Tailwind CSS 4, ESLint 9, Prettier 3
- Node.js 24 LTS, pnpm 12.15.0

## 로컬 개발

`.node-version`에 지정된 Node.js 버전과 pnpm 12.15.0을 설치한 뒤 아래 명령을 실행합니다. 개발 서버는 `http://localhost:3000`에서 열립니다. 현재 필요한 환경 변수는 없습니다. 환경 변수가 추가되면 `.env.example`을 참고해 로컬의 `.env.local`에 값을 설정합니다.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

| 명령                | 용도                                |
| ------------------- | ----------------------------------- |
| `pnpm dev`          | 개발 서버 실행                      |
| `pnpm build`        | 프로덕션 빌드                       |
| `pnpm start`        | 빌드 후 프로덕션 서버 실행          |
| `pnpm lint`         | ESLint 검사                         |
| `pnpm typecheck`    | 라우트 타입 생성 및 TypeScript 검사 |
| `pnpm format`       | Prettier 포맷 적용                  |
| `pnpm format:check` | Prettier 포맷 검사                  |

## 디렉터리 구조

- `src/app/` — 페이지, 레이아웃, 라우팅, 전역 스타일
- `.github/workflows/` — GitHub Actions CI 설정

필요해지면 `src/components/`에는 공통 UI, `src/features/`에는 신호·교차로 등 도메인별 기능, `src/lib/`에는 외부 API 통신과 공통 유틸리티, `src/types/`에는 공통 타입, `src/constants/`에는 공통 상수를 둡니다. `@/*`는 `src/*`를 가리킵니다.

기본 브랜치는 `main`입니다. 커밋 메시지는 Conventional Commits 형식인 `type(scope): summary`를 따릅니다. 예를 들어 `chore: initialize Signally project`를 사용합니다.

## 로드맵

1. 프로젝트 초기 설정
2. 서울시 교차로 MAP API 연동 및 데이터 제공 여부 검증
3. 보행자 신호등 실시간 API 연동
4. 지도 기반 교차로 표시
5. 신호 상태 및 잔여시간 UI 구현
6. 지원 지역 확장
