# 스타일 보일러플레이트 가이드 (초보자용)

작성일: 2026-01-28  
대상: Vite + React(SPA/CSR) + SCSS + CSS Modules

---

## 1) 이 문서의 목표

1. 이 템플릿의 “스타일 시스템”이 **어떤 파일에서 시작해서 어디로 퍼지는지**를 설명합니다.
2. 초보자가 **토큰(색상/간격/타이포)** 과 **믹스인(반응형/레이아웃)** 을 안전하게 재사용할 수 있게 안내합니다.
3. 스타일을 바꾸거나 추가할 때 **어디를 수정해야 하는지(단일 진입점)** 를 명확히 합니다.

---

## 2) 가장 빠른 사용법(3분 컷)

1. 전역 스타일은 이미 `src/main.tsx`에서 `@/styles/globals.scss`를 import 합니다.
2. 컴포넌트 스타일은 보통 `*.module.scss`(CSS Modules)로 작성하는 것을 권장합니다.
3. 색상/간격/타이포는 “하드코딩” 대신 CSS 변수 토큰을 사용합니다.
   1. 예: `color: var(--color-text-primary);`
   2. 예: `padding: var(--space-6);`
4. SCSS에서 믹스인은 `@include m.xxx(...)` 형태로 사용합니다.
   1. 예: `@include m.flex-center;`
   2. 예: `@include m.md { ... }`

---

## 3) 폴더 구조(무엇이 어디에 있나요?)

1. 전역 진입점
   1. `src/styles/globals.scss`: 프로젝트 전역 스타일의 “시작점”
   2. `src/styles/_fonts.scss`: 템플릿 기본 폰트(Wanted Sans) 로드(폰트 교체 지점)
   3. `src/styles/_keyframes.scss`: `fadeIn` 등 전역 애니메이션 keyframes 정의
   4. `src/styles/_base.scss`: Reset + Base(기본 태그 스타일, 포커스, 스크롤바 등)
2. 토큰(Design Tokens)
   1. `src/styles/tokens/*`: CSS 변수(`--color-*`, `--space-*` 등) 정의
   2. `src/styles/tokens/_index.scss`: 토큰들을 한 번에 모아 export
3. 믹스인(Mixins)
   1. `src/styles/mixins/*`: SCSS 믹스인(반응형, 플렉스, 타이포 등)
   2. `src/styles/mixins/_index.scss`: 믹스인을 한 번에 모아 export

---

## 4) “스타일이 적용되는 흐름” (실제로는 어떻게 로드되나요?)

1. React 엔트리에서 전역 스타일을 로드합니다.
   1. 파일: `src/main.tsx`
   2. 코드: `import '@/styles/globals.scss';`
2. `globals.scss`가 전역 스타일 모듈을 로드합니다.
   1. `@use 'fonts';` → `src/styles/_fonts.scss` 로드(폰트 파일 로딩)
   2. `@use 'keyframes';` → `src/styles/_keyframes.scss` 로드(전역 keyframes)
   3. `@use 'base';` → `src/styles/_base.scss` 로드(Reset/Base)
   4. `@forward 'tokens';` → `src/styles/tokens/_index.scss` 로드(CSS 변수 토큰)
3. 결과적으로, 앱 전체에서 다음이 항상 적용됩니다.
   1. 폰트 로딩(Wanted Sans)
   2. 전역 keyframes(`fadeIn`, `slideInUp` 등)
   3. HTML 기본 스타일 reset/base
   4. `:root`의 CSS 변수 토큰(색/간격/타이포 등)
   5. 다크 모드 토큰(`[data-theme='dark']`) 오버라이드(설정 시)

---

## 5) Vite에서의 스타일 관련 설정(현재 템플릿 기본값)

> 설정 파일: `vite.config.ts`

### 5.1) CSS Modules(컴포넌트 단위 스타일) 기본값

1. `localsConvention: 'camelCase'`
   1. SCSS에서 `.primary-button`처럼 케밥 케이스로 써도,
   2. TS/JS에서는 `styles.primaryButton`처럼 카멜 케이스로 접근할 수 있습니다.
2. `scopeBehaviour: 'local'`
   1. 기본적으로 클래스는 모두 로컬 스코프(파일 단위)로 변환됩니다.
   2. 다른 파일의 동일 클래스명과 충돌하지 않습니다.
3. `generateScopedName: '[name]__[local]___[hash:base64:5]'`
   1. 빌드 결과 클래스명이 `Button__primary___a1b2c` 같은 형태로 만들어집니다.
   2. 디버깅 시 “어느 파일의 어떤 클래스인지” 힌트가 남습니다.

### 5.2) SCSS 믹스인 자동 주입(중요)

1. 모든 SCSS 파일의 맨 위에 아래가 자동으로 추가됩니다.
   1. `@use "@/styles/mixins" as m;`
2. 의미
   1. 여러분이 개별 SCSS 파일에서 매번 `@use`를 쓰지 않아도
   2. `@include m.flex-center;` 같은 믹스인을 바로 사용할 수 있습니다.
3. 주의
   1. 이 템플릿의 SCSS 작성법은 “Vite 설정”에 의존합니다.
   2. 다른 빌드 도구로 옮기면 동일한 기능을 다시 설정해야 할 수 있습니다.

---

## 6) 토큰(Design Tokens) 사용법

### 6.1) 토큰이란?

1. 한 줄 정의: “디자인에서 자주 쓰는 값(색/간격/폰트 등)을 이름 붙여 한 곳에서 관리하는 것”입니다.
2. 이 템플릿에서는 토큰을 **CSS 변수**로 제공합니다.
3. 장점
   1. 컴포넌트 어디서나 동일한 이름으로 재사용
   2. 다크 모드처럼 테마 변경이 쉬움
   3. 디자이너/개발자 협업 시 기준점이 명확함

### 6.2) 주요 토큰 파일과 무엇을 담는지

1. 색상: `src/styles/tokens/_colors.scss`
2. 타이포: `src/styles/tokens/_typography.scss`
3. 간격: `src/styles/tokens/_spacing.scss`
4. 그림자: `src/styles/tokens/_shadows.scss`
5. 테두리/라운드: `src/styles/tokens/_borders.scss`
6. z-index: `src/styles/tokens/_z-index.scss`
7. 전환(transition): `src/styles/tokens/_index.scss` 하단 `:root`
8. 폰트 로딩(중요)
   1. 폰트 파일 로딩은 `src/styles/_fonts.scss`에서 합니다(템플릿 기본: Wanted Sans 유지).
   2. `tokens/_typography.scss`는 폰트 패밀리 변수(`--font-family-*`) 정의만 담당합니다.
   3. 템플릿 커스터마이징 시 “폰트 교체 지점”을 `_fonts.scss` 한 곳으로 고정하는 것을 권장합니다.

### 6.3) 토큰 사용 예시(컴포넌트 SCSS에서)

1. 색상
   1. `color: var(--color-text-primary);`
   2. `background: var(--color-bg-primary);`
2. 간격
   1. `padding: var(--space-6);`
   2. `gap: var(--space-2);`
3. 라운드/그림자
   1. `border-radius: var(--radius-lg);`
   2. `box-shadow: var(--shadow-md);`

### 6.4) 다크 모드 사용법

1. 이 템플릿은 `[data-theme='dark']` 속성이 있으면 색상 토큰이 오버라이드됩니다.
2. 가장 간단한 적용(예시)
   1. `document.documentElement.dataset.theme = 'dark';`
   2. 되돌리기: `delete document.documentElement.dataset.theme;`
3. 성공 기준
   1. `--color-bg-*`, `--color-text-*` 등이 다크 값으로 바뀝니다.

---

## 7) 믹스인(Mixins) 사용법

### 7.1) 믹스인이란?

1. 한 줄 정의: “SCSS에서 반복되는 스타일 패턴을 함수처럼 재사용하는 기능”입니다.
2. 이 템플릿에서는 `m.` 네임스페이스로 사용합니다.
   1. 예: `@include m.flex-center;`

### 7.2) 자주 쓰는 믹스인 예시

1. 레이아웃(플렉스)
   1. `@include m.flex-center;`
   2. `@include m.flex-space-between;`
2. 반응형
   1. `@include m.md { ... }` (768px 이상)
   2. `@include m.lg { ... }` (1024px 이상)
3. 컨테이너(페이지 패딩 포함)
   1. `@include m.container();` (기본 max-width 1280px)
4. 타이포
   1. `@include m.heading(2);`
   2. `@include m.body-text('sm');`

### 7.3) 반응형 브레이크포인트(현재 기본값)

1. 파일: `src/styles/mixins/_responsive.scss`
2. 기본 breakpoint
   1. `xs: 0`
   1. `sm: 640px`
   1. `md: 768px`
   1. `lg: 1024px`
   1. `xl: 1280px`
   1. `2xl: 1536px`
3. 안전장치(템플릿화 개선)
   1. `mq-between(sm, md)`처럼 **정의된 키**를 쓰면 안정적으로 동작합니다.
   2. `mq-between(unknown, md)`처럼 **없는 breakpoint 키**를 쓰면 SCSS 컴파일 단계에서 `@error`로 즉시 알려줍니다(“왜 안 먹는지”를 빠르게 찾기 위함).
   3. `mq-max(xs)`는 의미가 모호하므로 `@error`를 발생시킵니다(보통 `mq-max(sm)` 또는 `mobile-only`를 사용).

### 7.4) 애니메이션(Animations) 사용 팁

1. `fade-in`, `fade-out`, `slide-in`, `spin`, `bounce`, `shake`, `pulse` 같은 믹스인은 “이름이 정해진 keyframes”를 사용합니다.
   1. keyframes 정의 위치: `src/styles/_keyframes.scss`
   2. 전역 로드 위치: `src/styles/globals.scss`
2. 예시
   1. `@include m.fade-in(0.2s);`
   2. `@include m.slide-in(left, 0.25s);`
3. `scale-animation`은 from/to 값에 따라 keyframes를 만들어야 해서, 다음 제약이 있습니다.
   1. from/to는 **단위 없는 숫자**만 허용합니다(예: `0.9`, `1`).
   2. 동일 from/to 조합은 중복 생성을 줄이도록 처리되어 있습니다.

---

## 8) Base/Reset(전역 기본 스타일) 이해하기

1. 파일: `src/styles/_base.scss`
2. 무엇을 하나요?
   1. 브라우저 기본 margin/padding 제거
   2. `html/body/#root` 100% 높이 기반 레이아웃 지원
   3. `:root`에 긴 문자열 줄바꿈/탭 크기 기본값 설정
   4. 폰트/색상 기본값 적용(토큰 기반)
   5. 링크/버튼/폼 요소 기본 스타일 정리
   6. 포커스 스타일: `:focus`를 **fallback**으로 두고 `:focus-visible`을 지원하는 환경에서만 “마우스 포커스” 아웃라인을 제거합니다(키보드 접근성)
   7. `prefers-reduced-motion`을 존중해 모션을 줄입니다
   8. 스크롤바/selection 같은 선택적 전역 스타일 제공
3. 초보자에게 중요한 규칙
   1. 이 파일은 “프로젝트 전체”에 영향이 큽니다.
   2. 컴포넌트 단위 스타일은 가능하면 CSS Modules로 처리하고,
   3. `_base.scss`는 “정말 전역이어야 하는 것”만 담는 것을 권장합니다.

---

## 9) 컴포넌트에서 CSS Modules로 스타일링하는 방법(권장)

### 9.1) 파일 만들기

1. 예시: `src/components/Button/Button.module.scss`

### 9.2) 클래스 작성(예시)

1. `.button { ... }`
2. `.primary-button { ... }`

### 9.3) React에서 import 해서 사용(예시)

1. `import styles from './Button.module.scss';`
2. `className={styles.button}`
3. 케밥 케이스 클래스는 카멜 케이스로 접근합니다.
   1. `.primary-button` → `styles.primaryButton`

---

## 10) 스타일 린트/포맷 규칙(템플릿 기본 게이트)

### 10.1) Stylelint(CSS/SCSS 린트)

1. 설정 파일: `stylelint.config.js`
2. 실행 명령
   1. 검사: `npm run lint:style`
   2. 자동 수정: `npm run lint:style:fix`
3. 예시 규칙(초보자용 핵심)
   1. 클래스 네이밍은 camelCase 또는 kebab-case 허용
   2. SCSS 변수/믹스인/함수 이름은 케밥 케이스 권장
   3. 색상 hex는 긴 형식 선호(예: `#ffffff`)

### 10.2) Prettier(포맷)

1. 설정 파일: `.prettierrc`
2. 실행 명령
   1. 전체 포맷: `npm run format`
   2. 포맷 체크: `npm run format:check`

### 10.3) 커밋 시 자동 실행(Husky + lint-staged)

1. 커밋하면 staged 파일에 대해 자동으로 스타일 관련 작업이 수행됩니다.
2. 특히 `*.{css,scss}`는
   1. `stylelint --fix` 후
   2. `prettier --write`가 실행됩니다.

---

## 11) 초보자 체크리스트(스타일 작업을 시작하기 전)

1. `npm ci` 또는 `npm install`을 실행합니다.
2. `npm run dev`로 화면이 뜨는지 확인합니다.
3. 스타일을 바꾼 뒤에는 `npm run validate`로 전체 게이트를 통과하는지 확인합니다.
4. 색상/간격은 가능하면 토큰으로 먼저 해결하고, 정말 필요할 때만 “하드코딩 값”을 추가합니다.
