# React CSR 템플릿 사용 설명서 (Vite + React + TypeScript + npm)

작성일: 2026-01-29  
대상: 이 레포를 복제/포크해서 “React CSR(SPA) 프로젝트”를 시작하려는 개발자

---

## 1) 이 템플릿은 무엇을 제공하나요? (원인/리스크/기대효과)

1. 원인
   1. React CSR 프로젝트는 매번 같은 초기 작업(라우팅, 데이터 패칭, 폼 검증, 목킹, 테스트, 품질 규칙)을 반복하기 쉽습니다.
2. 리스크
   1. 초기 규칙이 없으면 네트워크/에러/로딩/상태 처리 방식이 팀마다 달라져 유지보수 비용이 급증합니다.
   2. 품질 게이트(린트/포맷/타입/테스트)가 늦게 도입되면 이후 도입 비용이 더 큽니다.
3. 기대효과(이 템플릿의 기본값)
   1. CSR(SPA) 앱의 “기본 골격”을 즉시 제공합니다.
   2. 서버 상태(TanStack Query), 폼(React Hook Form + Zod), 목킹(MSW), 테스트(Vitest), E2E(Playwright)가 기본 제공됩니다.
   3. `npm run validate`로 포맷/타입/린트/스타일 린트를 한 번에 검증합니다.

---

## 2) 실행 전 필수 요구사항(중요)

1. Node.js 버전
   1. 이 템플릿은 Vite 7을 사용하므로 Node.js가 **`^20.19.0` 또는 `>=22.12.0`** 이어야 합니다.
2. 패키지 매니저
   1. npm을 기준으로 구성되어 있습니다(`package-lock.json` 포함).

---

## 3) 가장 빠른 시작(Quick Start)

1. 의존성 설치
   1. 터미널: `npm ci`(권장, lock 고정) 또는 `npm install`
2. 개발 서버 실행
   1. 터미널: `npm run dev`
3. 품질 게이트(전체 검증)
   1. 터미널: `npm run validate`
4. 단위/컴포넌트 테스트
   1. 터미널: `npm test`
5. E2E 테스트(최초 1회 브라우저 설치 필요)
   1. 터미널: `npx playwright install`
   2. 터미널: `npm run e2e`

---

## 4) 주요 스크립트(무엇을 언제 쓰나요?)

1. 개발/빌드
   1. `npm run dev`: 개발 서버 실행
   2. `npm run build`: 타입 체크(tsc) + 프로덕션 빌드(vite build)
   3. `npm run preview`: 빌드 결과 프리뷰 서버
2. 품질 게이트
   1. `npm run validate`: format 체크 + typecheck + eslint + stylelint
   2. `npm run lint` / `npm run lint:fix`
   3. `npm run format` / `npm run format:check`
3. 테스트
   1. `npm test`: Vitest 단발 실행
   2. `npm run test:watch`: Vitest watch
   3. `npm run e2e`: Playwright E2E 실행
   4. `npm run e2e:ui`: Playwright UI 모드

---

## 5) 폴더 구조(현재 템플릿 기준)

1. 핵심 구조 요약

```txt
src/
  app/                # App Shell(Provider/전역설정)
  api/                # axios 인스턴스 + API 호출
  components/
    ui/               # 재사용 UI(Button, TextField 등)
    feedback/         # Toast, Loading 등 피드백 UI
  config/             # env 등 런타임 설정
  forms/              # zod 스키마(입력 검증)
  mocks/              # MSW 핸들러/worker/server
  pages/              # 라우트 페이지
  query/              # TanStack Query 설정
  routes/             # 라우팅 정의(routePaths, router)
  stores/             # Zustand 스토어(UI 상태)
  styles/             # SCSS 토큰/믹스인/전역 스타일
  test/               # 테스트 setup 유틸
```

2. 의존 방향(권장)
   1. `pages` → `api/query/components/stores`는 참조 가능
   2. `api` → `pages` 참조 금지(역방향 결합 방지)
   3. `components/ui`는 도메인 지식(특정 페이지/비즈니스)을 모르게 유지

---

## 6) 라우팅(React Router) 사용법

1. 한 줄 정의
   1. CSR에서 URL 변경을 “페이지 새로고침 없이” 화면 전환으로 처리하는 규칙/도구입니다.
2. 이 프로젝트에서 어디에 있나요?
   1. 라우트 경로 상수: `src/routes/routePaths.ts`
   2. 라우터 정의: `src/routes/router.tsx`
   3. 레이아웃: `src/pages/RootLayout/RootLayout.tsx`
3. 새 페이지 추가 절차
   1. `src/pages/MyPage/MyPage.tsx` 생성
   2. `src/routes/routePaths.ts`에 경로 상수 추가(예: `myPage: '/my'`)
   3. `src/routes/router.tsx`에 라우트 추가
4. 검증(성공 기준)
   1. 브라우저에서 해당 URL로 이동했을 때 페이지가 렌더링됩니다.
   2. 존재하지 않는 경로는 404 페이지로 연결됩니다(`NotFoundPage`).

---

## 7) App Shell(전역 Provider) 구조

1. 한 줄 정의
   1. 앱 전역에서 필요한 Provider/전역 UI를 한 곳에서 조립한 “앱의 껍데기”입니다.
2. 이 프로젝트에서 어디에 있나요?
   1. App Shell: `src/app/AppProviders.tsx`
   2. 전역 에러 경계: `src/app/AppErrorBoundary.tsx`
3. 현재 포함된 전역 기능
   1. TanStack Query(`QueryClientProvider`)
   2. React Router(`RouterProvider`)
   3. Toast UI(`ToastViewport`)
   4. 다크 모드 토큰 적용(`data-theme`를 `<html>`에 설정)
4. 검증(성공 기준)
   1. Provider 추가/변경은 `src/app/AppProviders.tsx`에서만 하면 됩니다(분산 금지).

---

## 8) 환경변수(env) 규칙(중요: 런타임 검증)

1. 한 줄 정의
   1. Vite의 `import.meta.env`를 “검증/정규화된 객체”로 바꿔 안전하게 쓰는 규칙입니다.
2. 왜 필요한가요(문제/리스크/사례)?
   1. Vite 환경변수는 기본적으로 문자열이며 누락/오타가 런타임까지 숨어있을 수 있습니다.
3. 이 프로젝트에서 어디에 있나요?
   1. `src/config/env.ts`
4. 규칙
   1. 앱 코드에서 `import.meta.env`를 직접 읽지 않고 `env`를 사용합니다.
   2. `VITE_ENABLE_MOCK`, `VITE_ENABLE_ANALYTICS`는 **`true`/`false` 문자열**만 허용합니다(다른 값이면 앱 시작 시 에러).
   3. `VITE_API_URL`은 “base URL”로 사용합니다(권장: `https://api.example.com`).
      1. `/contact` 같은 경로까지 포함하면 API 함수에서 경로를 다시 붙일 때 URL이 어긋날 수 있습니다.
5. 주요 env 목록(현재 스키마 기준)
   1. `VITE_APP_NAME`: 헤더 브랜드 표시
   2. `VITE_API_URL` / `VITE_API_BASE_URL`: API base URL(둘 중 하나)
   3. `VITE_ENABLE_MOCK`: 개발 환경에서 MSW 활성화 토글
   4. `VITE_ENABLE_ANALYTICS`: 분석 도구 활성화 토글(연동 지점은 추후 확장)
   5. `VITE_SITE_URL`: OG/SEO 용 사이트 URL(템플릿에 맞게 조정)
6. 검증(성공 기준)
   1. 잘못된 env 값(예: URL 형식 오류, boolean 문자열 오류)일 때 앱이 “조용히 망가지지 않고” 즉시 실패합니다.

---

## 9) API 레이어(axios) 사용법

1. 한 줄 정의
   1. 네트워크 정책(baseURL/timeout/에러 표준화)을 한 곳에서 통제하는 계층입니다.
2. 이 프로젝트에서 어디에 있나요?
   1. axios 인스턴스: `src/api/axiosInstance.ts`
   2. 에러 표준화: `src/api/errors.ts`
   3. 간단 HTTP 래퍼: `src/api/http.ts`
   4. 예시 엔드포인트: `src/api/contact.ts`
3. 사용 규칙(권장)
   1. 페이지/컴포넌트에서 axios 인스턴스를 직접 호출하지 않고 `src/api/*` 함수만 호출합니다.
   2. 공통 에러 처리는 `toApiError` 또는 `ContactPage`처럼 사용자 메시지로 변환하는 방식 중 하나로 표준화합니다.
4. 검증(성공 기준)
   1. API base URL 변경이 env 한 곳(`VITE_API_URL`)으로 수렴합니다.
   2. 에러 메시지가 사용자 기준으로 일관됩니다(토스트/페이지 표시).

---

## 10) Server State(데이터 패칭): TanStack Query

1. 한 줄 정의
   1. 서버 데이터의 캐싱/동기화/리트라이/로딩 상태를 표준화하는 라이브러리입니다.
2. 이 프로젝트에서 어디에 있나요?
   1. QueryClient 생성: `src/query/queryClient.ts`
   2. Provider 주입: `src/app/AppProviders.tsx`
3. 사용 규칙(권장)
   1. 서버 데이터는 Zustand 같은 전역 스토어에 저장하지 않고 Query로 관리합니다.
4. 검증(성공 기준)
   1. 같은 데이터를 여러 번 조회해도 중복 요청이 줄고 캐시가 재사용됩니다.

---

## 11) Client State(UI 상태): Zustand

1. 한 줄 정의
   1. UI 상태(테마/모달/필터 등)를 전역으로 공유하기 위한 경량 상태 관리입니다.
2. 이 프로젝트에서 어디에 있나요?
   1. 테마 스토어(예시): `src/stores/useThemeStore.ts`
   2. 토스트 스토어: `src/stores/useToastStore.ts`
3. 사용 규칙(권장)
   1. 서버 데이터는 Zustand에 저장하지 않습니다(캐시 전략이 붕괴하기 쉬움).
4. 검증(성공 기준)
   1. UI 상태 변경이 예측 가능하고 디버깅이 쉽습니다.

---

## 12) 폼/검증: React Hook Form + Zod

1. 한 줄 정의
   1. 폼 상태/검증/에러 메시지 처리를 “스키마 기반”으로 일관되게 만드는 조합입니다.
2. 이 프로젝트에서 어디에 있나요?
   1. 스키마: `src/forms/schemas/contactSchema.ts`
   2. 예시 페이지: `src/pages/ContactPage/ContactPage.tsx`
   3. UI 입력 컴포넌트: `src/components/ui/TextField/TextField.tsx`
3. 사용 규칙(권장)
   1. 검증 로직은 컴포넌트에 흩어두지 않고 `src/forms/schemas/*`에 둡니다.
   2. 필드 컴포넌트는 `aria-invalid`, `aria-describedby` 등 접근성 속성을 기본 지원하도록 유지합니다.
4. 검증(성공 기준)
   1. 잘못된 입력에서 필드별 에러 메시지가 일관되게 노출됩니다.

---

## 13) 목킹(MSW) 사용법(개발/테스트 안정성)

1. 한 줄 정의
   1. 브라우저/테스트 환경에서 네트워크 요청을 가로채 “가짜 응답”을 제공하는 도구입니다.
2. 이 프로젝트에서 어디에 있나요?
   1. 브라우저 worker: `src/mocks/browser.ts`
   2. 테스트 server: `src/mocks/server.ts`
   3. 핸들러: `src/mocks/handlers.ts`
3. 켜는 방법(개발)
   1. `.env.development`에서 `VITE_ENABLE_MOCK=true` 설정
   2. 개발 서버 실행 시(`npm run dev`) `src/main.tsx`가 자동으로 worker를 시작합니다.
4. 새 핸들러 추가 절차
   1. `src/mocks/handlers.ts`에 `http.get/post/...` 추가
   2. 실제 API URL 패턴이 바뀌면 matcher(`*/path`)를 조정합니다.
5. 검증(성공 기준)
   1. 백엔드가 꺼져 있어도 화면 흐름(폼 제출 등)을 재현할 수 있습니다.

---

## 14) 테스트(Vitest) 사용법

1. 이 프로젝트에서 어디에 있나요?
   1. 설정: `vitest.config.ts`
   2. 테스트 setup(MSW 포함): `src/test/setup.ts`
   3. 예시 테스트: `src/pages/HomePage/HomePage.test.tsx`
2. 작성 규칙(권장)
   1. 단위/컴포넌트 테스트 파일은 `src/**/*.test.ts(x)` 형태로 작성합니다.
   2. E2E 테스트 파일(`e2e/**`)은 Vitest가 실행하지 않도록 분리되어 있습니다.
3. 검증(성공 기준)
   1. `npm test`가 안정적으로 통과합니다.

---

## 15) E2E(Playwright) 사용법

1. 이 프로젝트에서 어디에 있나요?
   1. 설정: `playwright.config.ts`
   2. 테스트: `e2e/home.spec.ts`
2. 실행 절차
   1. 최초 1회: `npx playwright install`
   2. 실행: `npm run e2e`
3. 검증(성공 기준)
   1. 실제 브라우저에서 홈 페이지가 렌더링되고 핵심 텍스트가 보입니다.

---

## 16) 스타일 시스템(SCSS + CSS Modules + 토큰/믹스인)

1. 이 프로젝트에서 어디에 있나요?
   1. 전역 진입점: `src/styles/globals.scss`(이미 `src/main.tsx`에서 import)
   2. 토큰: `src/styles/tokens/*`
   3. 믹스인: `src/styles/mixins/*`
2. 기본 가이드 문서
   1. 상세 내용은 `STYLES_BOILERPLATE_GUIDE.md`를 참고합니다.
3. 검증(성공 기준)
   1. CSS Modules는 컴포넌트 단위로 격리되고, 토큰은 전역에서 재사용됩니다.

---

## 17) 품질 게이트(ESLint/Prettier/Stylelint/TypeScript)

1. 이 프로젝트에서 어디에 있나요?
   1. ESLint: `eslint.config.js`
   2. Prettier: `.prettierrc`
   3. Stylelint: `stylelint.config.js`
   4. 타입 체크: `tsconfig*.json`
2. 기본 가이드 문서
   1. 상세 내용은 `CODE_QUALITY_GATE_GUIDE.md`를 참고합니다.
3. 커밋 훅(Husky) 주의
   1. 레포에 `.git`이 없으면 Husky가 동작하지 않을 수 있습니다.
   2. 새 프로젝트에서 Husky를 쓰려면 Git 초기화가 필요합니다(예: `git init`).
4. 검증(성공 기준)
   1. `npm run validate`가 통과합니다.

---

## 18) 트러블슈팅(자주 겪는 문제)

1. 개발 서버가 안 켜짐: Node 버전 오류
   1. 증상: Vite 실행 시 Node engines 관련 에러
   2. 해결: Node를 `^20.19.0` 또는 `>=22.12.0`로 올립니다.
2. 앱 시작 시 env 에러로 종료됨
   1. 원인: `VITE_ENABLE_MOCK` 등에 `true/false` 외 값이 들어갔거나 URL 형식이 잘못됨
   2. 해결: `.env*` 값을 스키마에 맞게 수정합니다(`src/config/env.ts` 참고).
3. API 요청 URL이 이상함
   1. 원인: `VITE_API_URL`에 `/contact` 같은 경로까지 포함되어 baseURL이 꼬임
   2. 해결: base URL은 “도메인/베이스”로 두고, 엔드포인트는 API 함수에서 붙입니다.

---

## 19) 이 템플릿을 “새 프로젝트”로 복제할 때 권장 절차

1. 레포 복제 후 이름/메타데이터 정리
   1. `package.json`의 `name`, `version`
   2. `index.html`의 title/OG 메타(프로젝트에 맞게)
   3. `.env*`의 `VITE_APP_NAME`, `VITE_SITE_URL`, `VITE_API_URL`
2. 기본 페이지 교체
   1. `src/pages/HomePage`를 서비스 홈으로 교체
   2. `src/pages/ContactPage`는 예시 폼이므로 필요에 따라 삭제/도메인 폼으로 교체
3. 검증 루틴 고정
   1. 개발 중: `npm run dev`
   2. PR/배포 전: `npm run validate && npm test && npm run e2e`

---

## 20) 다음 확장 포인트(유지보수자를 위한 안내)

1. 이 문서는 “사용자(템플릿 적용자)”를 위한 문서입니다.
2. 템플릿 자체를 확장/개선하려면 `CSR_TEMPLATE_IMPLEMENTATION_GUIDE.md`를 참고합니다.
