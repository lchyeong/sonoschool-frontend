// Vite 설정 파일
// ============================================
// 이 파일은 Vite 개발 서버와 빌드 도구의 동작 방식을 설정합니다.
// Vite는 빠른 개발 환경과 최적화된 프로덕션 빌드를 제공하는 프론트엔드 빌드 도구입니다.

// defineConfig: TypeScript 타입 지원을 제공하는 Vite 설정 함수
// loadEnv: 환경변수 파일(.env)을 읽어오는 함수

// ============================================
// ESM 환경에서 __dirname 만들기
// ============================================
// 문제: package.json에 "type": "module"이 설정되어 있어서
//       이 프로젝트는 ESM(ES Module) 방식을 사용합니다.
//       ESM에서는 __dirname이 자동으로 제공되지 않습니다.
//       (__dirname은 CommonJS에서만 사용 가능)
//
// 해결: Node.js가 제공하는 함수들을 사용해서 직접 만들어야 합니다.
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

import react from '@vitejs/plugin-react-swc';
import { defineConfig } from 'vite';

// @vitejs/plugin-react-swc: React를 SWC 컴파일러로 변환하는 플러그인
// SWC는 Rust로 작성되어 기존 Babel보다 5~10배 빠른 컴파일 속도를 제공합니다

// ============================================
// __dirname 상수 정의
// ============================================
// ESM 환경에서 현재 파일의 디렉토리 경로를 얻는 방법
//
// 📝 동작 원리 (3단계):
//
// 1단계: import.meta.url
//    → 현재 실행 중인 파일의 URL을 가져옵니다
//    → 예시: "file:///Users/yourname/project/vite.config.ts"
//
// 2단계: fileURLToPath(import.meta.url)
//    → URL 형식을 일반 파일 경로로 변환합니다
//    → 예시: "/Users/yourname/project/vite.config.ts"
//
// 3단계: dirname(...)
//    → 파일 경로에서 파일명을 제거하고 디렉토리 경로만 남깁니다
//    → 예시: "/Users/yourname/project"
//
// 결과: __dirname = 현재 파일이 있는 폴더의 절대 경로
//
// 🤔 왜 이렇게 복잡한가요?
// ESM은 브라우저와 Node.js 모두에서 동작하도록 설계되었습니다.
// 브라우저에는 "파일 경로" 개념이 없고 "URL"만 있기 때문에
// Node.js ESM도 URL 기반으로 동작합니다.
// 따라서 파일 경로가 필요할 때는 URL → 경로 변환이 필요합니다!
const __dirname = dirname(fileURLToPath(import.meta.url));

// resolve: 절대 경로를 만들어주는 Node.js 내장 함수
// 예: resolve(__dirname, './src') → /Users/yourname/project/src

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  return {
    // ============================================
    // 플러그인 설정
    // ============================================
    // Vite가 사용할 플러그인들을 배열로 지정합니다
    plugins: [
      react(),
      // react() 플러그인이 하는 일:
      // 1. JSX 문법을 JavaScript로 변환 (예: <div> → React.createElement('div'))
      // 2. Fast Refresh 활성화 (코드 수정 시 전체 새로고침 없이 변경사항만 반영)
      // 3. SWC 컴파일러로 빠른 빌드 속도 제공
    ],

    // ============================================
    // 경로 별칭(Alias) 설정
    // ============================================
    resolve: {
      alias: {
        // 경로 별칭을 사용하면 긴 상대경로를 짧게 쓸 수 있습니다
        //
        // ❌ 별칭 없이: import Button from '../../../components/Button'
        // ✅ 별칭 사용: import Button from '@components/Button'
        //
        // 장점:
        // 1. 코드 가독성 향상
        // 2. 파일 이동 시 import 경로 수정 불필요
        // 3. 오타 방지 (IDE 자동완성 지원)

        '@': resolve(__dirname, './src'), // 최상위 src 폴더
        '@components': resolve(__dirname, './src/components'), // 재사용 가능한 UI 컴포넌트
        '@hooks': resolve(__dirname, './src/hooks'), // 커스텀 React 훅
        '@pages': resolve(__dirname, './src/pages'), // 페이지 컴포넌트
        '@utils': resolve(__dirname, './src/utils'), // 유틸리티 함수
        '@types': resolve(__dirname, './src/types'), // TypeScript 타입 정의
        '@assets': resolve(__dirname, './src/assets'), // 이미지, 폰트 등 정적 파일
        '@styles': resolve(__dirname, './src/styles'), // 전역 스타일
        '@store': resolve(__dirname, './src/stores'), // 상태 관리 (Redux, Zustand 등)
        '@constants': resolve(__dirname, './src/constants'), // 상수 정의
        '@services': resolve(__dirname, './src/services'), // API 호출 등 서비스 로직
      },
    },

    // ============================================
    // CSS 설정
    // ============================================
    css: {
      modules: {
        // CSS Modules 설정
        // localsConvention: 'camelCase'
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // 📝 무엇을 하나요?
        // CSS의 케밥-케이스를 JS의 카멜케이스로 변환
        //
        // 예시:
        // .primary-button → styles.primaryButton ✅
        //
        // 왜 필요한가요?
        // JavaScript에서 점(.)으로 접근하려면 카멜케이스 필요
        // styles.primary-button ❌ (문법 에러)
        // styles['primary-button'] ✅ (가능하지만 불편)
        // styles.primaryButton ✅ (편함!)
        localsConvention: 'camelCase',

        // scopeBehaviour: 'local'
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // 📝 무엇을 하나요?
        // 기본적으로 모든 클래스를 "로컬" 스타일로 만듦
        //
        // 로컬 스타일이란?
        // .button → .Button__button___a1b2c (고유한 이름)
        //
        // 왜 필요한가요?
        // 다른 파일의 .button과 절대 충돌 안 함!
        scopeBehaviour: 'local',

        // generateScopedName
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // 📝 무엇을 하나요?
        // 고유한 클래스 이름의 "형식"을 정함
        //
        // 형식 설명:
        // [name] = 파일 이름 (Button)
        // [local] = 클래스 이름 (primary)
        // [hash:base64:5] = 랜덤 문자 5개 (a1b2c)
        //
        // 결과: Button__primary___a1b2c
        //
        // 왜 이렇게?
        // - 디버깅 쉬움 (어느 파일인지 알 수 있음)
        // - 충돌 방지 (hash로 고유성 보장)
        generateScopedName: '[name]__[local]___[hash:base64:5]',
      },
      preprocessorOptions: {
        scss: {
          // additionalData
          // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          // 📝 무엇을 하나요?
          // 모든 SCSS 파일 맨 위에 자동으로 코드 추가
          //
          // 효과:
          // ❌ 설정 전: 매 파일마다 import 반복
          //    @use '@/styles/tokens' as *;
          //    @use '@/styles/mixins' as m;
          //
          // ✅ 설정 후: import 생략 가능!
          //    바로 var(--color-primary) 사용
          //    바로 @include m.flex 사용
          //
          // 왜 필요한가요?
          // 타이핑 줄이고, 실수 방지!
          // tokens는 globals.scss에서 1회 로드되므로 모듈별 주입을 제거합니다.
          additionalData: `@use "@/styles/mixins" as m;`,
        },
      },
      // 개발 모드에서 CSS 소스맵 생성
      // 소스맵: 빌드된 CSS가 원본 파일의 어느 부분에서 왔는지 알려주는 정보
      //
      // 장점:
      // - 브라우저 개발자 도구에서 스타일을 검사할 때 원본 파일 위치를 볼 수 있음
      // - 디버깅이 훨씬 쉬워짐
      //
      // 예: 개발자 도구에서 "Button.module.css:15" 같은 정확한 위치 표시
      devSourcemap: true,
    },

    // ============================================
    // 전역 상수 정의
    // ============================================
    // 코드 내에서 사용할 수 있는 전역 상수를 정의합니다
    // 빌드 시점에 해당 값으로 치환됩니다
    define: {
      // 개발 모드인지 확인하는 상수
      __DEV__: mode === 'development',
      // 프로덕션 모드인지 확인하는 상수
      __PROD__: mode === 'production',

      // 사용 예시:
      // if (__DEV__) {
      //   console.log('디버깅 정보:', data);
      // }
      //
      // 프로덕션 빌드 시 __DEV__가 false로 치환되어
      // 불필요한 디버깅 코드가 자동으로 제거됩니다
    },

    // ============================================
    // 개발 서버 설정
    // ============================================
    server: {
      // 개발 서버가 실행될 포트 번호
      // http://localhost:5173 으로 접속 가능
      port: 5173,

      // strictPort: false
      // 5173 포트가 이미 사용 중이면 자동으로 다른 포트(5174, 5175...)를 사용합니다
      // true로 설정하면 포트가 사용 중일 때 에러를 발생시킵니다
      strictPort: false,

      // 개발 서버 시작 시 브라우저를 자동으로 열지 여부
      // true: npm run dev 실행 시 브라우저가 자동으로 열림
      // false: 수동으로 브라우저에서 접속해야 함
      open: true,

      // ============================================
      // HMR (Hot Module Replacement) 설정
      // ============================================
      hmr: {
        // HMR이란?
        // 코드를 수정하면 전체 페이지를 새로고침하지 않고
        // 변경된 부분만 즉시 반영하는 기능
        //
        // 장점:
        // - 개발 속도 향상 (페이지 상태 유지)
        // - 폼 입력값, 스크롤 위치 등이 유지됨

        // overlay: true
        // 코드에 에러가 있을 때 브라우저 화면에 에러 메시지를 오버레이로 표시
        // 터미널을 보지 않아도 에러를 바로 확인할 수 있습니다
        overlay: true,
      },

      // ============================================
      // API 프록시 설정 (필요 시 주석 해제)
      // ============================================
      // 백엔드 API 서버가 다른 포트에 있을 때 사용합니다
      //
      // 왜 필요한가?
      // 브라우저는 보안상 다른 도메인/포트로 직접 요청할 수 없습니다 (CORS 정책)
      // 예: http://localhost:5173 → http://localhost:8080 (차단됨)
      //
      // 프록시를 사용하면:
      // 1. 프론트엔드: /api/users 로 요청
      // 2. Vite가 자동으로 http://localhost:8080/users 로 전달
      // 3. 같은 도메인에서 요청한 것처럼 보여 CORS 문제 해결

      // proxy: {
      //   '/api': {
      //     // /api로 시작하는 모든 요청을 아래 주소로 전달
      //     target: env.VITE_API_URL || 'http://localhost:8080',
      //     // 요청 헤더의 origin을 target URL로 변경 (CORS 회피)
      //     changeOrigin: true,
      //     // URL 재작성: /api/users → /users (api 접두사 제거)
      //     rewrite: (path) => path.replace(/^\/api/, ''),
      //   },
      //   '/ws': {
      //     // WebSocket 연결을 위한 프록시
      //     target: env.VITE_WS_URL || 'ws://localhost:8082',
      //     ws: true, // WebSocket 프록시 활성화
      //     changeOrigin: true,
      //   },
      // },
    },

    // ============================================
    // 프로덕션 빌드 설정
    // ============================================
    build: {
      // 빌드할 JavaScript 버전 타겟
      // 'es2022': 2022년 ECMAScript 기능까지 사용 가능
      //
      // 왜 중요한가?
      // - 최신 브라우저만 지원하면 더 작고 빠른 코드 생성 가능
      // - 구형 브라우저 지원 필요 시 'es2015' 같은 낮은 버전 사용
      target: 'es2022',

      // 소스맵 생성 여부
      // 소스맵이 있으면 프로덕션 환경에서도 에러 발생 시
      // 압축되기 전 원본 코드의 정확한 위치를 찾을 수 있습니다
      //
      // 단점: 빌드 파일 크기가 증가 (보안상 배포 시 제거하기도 함)
      sourcemap: true,

      // CSS 파일을 별도로 분리할지 여부
      // true: CSS를 별도 .css 파일로 분리 (권장)
      // false: JavaScript 번들에 CSS 포함
      //
      // 분리하는 이유:
      // 1. 병렬 다운로드로 로딩 속도 향상
      // 2. CSS 변경 시 JavaScript 캐시 유지 가능
      // 3. 브라우저가 스타일을 먼저 적용하여 깜빡임 방지
      cssCodeSplit: true,

      // 코드 압축(minify) 도구
      // 'esbuild': 매우 빠른 속도 (Rust 기반, 기본값)
      // 'terser': 더 작은 파일 크기 (느리지만 압축률 높음)
      //
      // 압축이란?
      // - 변수명을 짧게 (userName → a)
      // - 공백/줄바꿈 제거
      // - 불필요한 코드 제거
      // 결과: 파일 크기 30~50% 감소
      minify: 'esbuild',

      // ============================================
      // Rollup 번들러 옵션
      // ============================================
      rollupOptions: {
        output: {
          // 수동 청크 분리 (코드 스플리팅)
          //
          // 코드 스플리팅이란?
          // 하나의 큰 JavaScript 파일을 여러 개의 작은 파일로 나누는 것
          //
          // 장점:
          // 1. 초기 로딩 속도 향상 (필요한 것만 먼저 다운로드)
          // 2. 캐싱 효율성 (라이브러리는 변경되지 않아 캐시 재사용)
          // 3. 병렬 다운로드로 전체 로딩 시간 단축
          //
          // 예시:
          // - 전체 번들: app.js (500KB)
          // - 분리 후: react.js (150KB) + app.js (350KB)
          // → React 라이브러리는 캐시에 저장되어 다음 방문 시 다운로드 불필요
          manualChunks: {
            // React 관련 라이브러리를 react.js 파일로 분리
            react: ['react', 'react-dom'],

            // 추가 라이브러리 분리 예시 (라이브러리 설치 후 주석 해제)
            // React Router를 router.js 파일로 분리
            // router: ['react-router-dom'],

            // UI 라이브러리를 ui.js 파일로 분리
            // ui: ['@mui/material', '@emotion/react'],
          },
        },
      },

      // 청크(chunk) 크기 경고 한계 (킬로바이트 단위)
      // 1000KB = 1MB
      //
      // 파일이 이 크기를 넘으면 빌드 시 경고 메시지가 표시됩니다
      // 왜? 큰 파일은 로딩 시간이 오래 걸려 사용자 경험에 나쁨
      //
      // 해결 방법:
      // - 코드 스플리팅 활용
      // - 무거운 라이브러리는 동적 import 사용
      // - 불필요한 의존성 제거
      chunkSizeWarningLimit: 500,
    },

    // ============================================
    // esbuild 설정
    // ============================================
    esbuild: {
      // 프로덕션 빌드 시 제거할 코드 지정
      // mode === 'production'일 때만 console과 debugger 제거
      //
      // 왜 제거하나?
      // 1. console.log()는 프로덕션에서 불필요한 성능 오버헤드
      // 2. 민감한 정보가 로그에 노출될 수 있는 보안 위험
      // 3. debugger 문은 브라우저 개발자 도구를 여는 코드 (사용자에게 불필요)
      //
      // 개발 모드에서는 빈 배열 []이므로 제거하지 않음
      drop: mode === 'production' ? ['console', 'debugger'] : [],
    },

    // ============================================
    // 환경변수 접두사 설정
    // ============================================
    // 클라이언트 코드에서 접근 가능한 환경변수의 접두사를 지정합니다
    //
    // 중요한 보안 설정:
    // - VITE_로 시작하는 변수만 클라이언트 코드에 노출됩니다
    // - 다른 변수는 서버 측에서만 접근 가능 (보안 유지)
    //
    // 예시:
    // .env 파일:
    //   VITE_API_URL=https://api.example.com  ← 노출 OK (클라이언트에서 사용)
    //   DATABASE_PASSWORD=secret123           ← 노출 안됨 (보안 정보)
    //
    // 사용법:
    //   const apiUrl = import.meta.env.VITE_API_URL; // ✅ 작동
    //   const dbPw = import.meta.env.DATABASE_PASSWORD; // ❌ undefined (접근 불가)
    envPrefix: 'VITE_',
  };
});
