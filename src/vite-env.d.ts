/// <reference types="vite/client" />

/* ========================================
   Vite 환경변수 타입 정의
   import.meta.env에서 사용 가능
   ======================================== */

declare const __DEV__: boolean;
declare const __PROD__: boolean;

interface ImportMetaEnv {
  // 기본 Vite 환경변수
  readonly MODE: string; // 'development' | 'production' | 'staging'
  readonly BASE_URL: string; // base URL (default: '/')
  readonly PROD: boolean; // 프로덕션 여부
  readonly DEV: boolean; // 개발 모드 여부
  readonly SSR: boolean; // SSR 빌드 여부

  // 커스텀 환경변수 (VITE_ 접두사 필수)
  // .env 파일에 정의한 변수들의 타입을 여기에 추가
  readonly VITE_APP_NAME?: string; // 앱 이름
  readonly VITE_API_URL?: string; // API 서버 URL
  readonly VITE_API_BASE_URL?: string; // (레거시/대안) API 서버 URL
  readonly VITE_APP_TITLE?: string; // 앱 제목
  readonly VITE_ENABLE_ANALYTICS?: string; // Analytics 활성화 ('true' | 'false')
  readonly VITE_ENABLE_MYPAGE_MOCK?: string; // 마이페이지 UI 목데이터 모드 ('true' | 'false')
  readonly VITE_MYPAGE_MOCK_SCENARIO?: 'all' | 'certificate' | 'expired' | 'empty';
  readonly VITE_GA_ID?: string; // Google Analytics ID
  readonly VITE_GTM_CONTAINER_ID?: string; // Google Tag Manager Container ID (GTM-XXXXXXX)
  readonly VITE_SENTRY_DSN?: string; // Sentry DSN
  readonly VITE_WS_URL?: string; // WebSocket URL
  readonly VITE_TURNSTILE_SITE_KEY?: string; // Cloudflare Turnstile Site Key
  readonly VITE_CONTACT_PHONE_NUMBER?: string; // (선택) CALL US 전화번호
  readonly VITE_SITE_URL?: string; // 사이트 URL (SEO/OG)

  // 예시 - 필요에 따라 추가
  // readonly VITE_AUTH_DOMAIN?: string;
  // readonly VITE_FIREBASE_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  chkAvailablePostMessage?: () => boolean;
  dataLayer?: Array<Record<string, unknown>>;
  GetField?: (form: HTMLFormElement, values: unknown) => void;
  KCP_Pay_Execute_Web?: (form: HTMLFormElement) => void;
  jsf__pay?: (form: HTMLFormElement) => void;
  m_Completepayment?: (
    formOrJson: unknown,
    closeEvent?: (() => void) | null,
  ) => void | Promise<void>;
}

/* ========================================
   정적 파일 import 타입 정의
   ======================================== */

// 이미지 파일
declare module '*.svg' {
  import type * as React from 'react';
  export const ReactComponent: React.FunctionComponent<
    React.SVGProps<SVGSVGElement> & { title?: string }
  >;
  const src: string;
  export default src;
}

declare module '*.png' {
  const src: string;
  export default src;
}

declare module '*.jpg' {
  const src: string;
  export default src;
}

declare module '*.jpeg' {
  const src: string;
  export default src;
}

declare module '*.gif' {
  const src: string;
  export default src;
}

declare module '*.webp' {
  const src: string;
  export default src;
}

declare module '*.ico' {
  const src: string;
  export default src;
}

declare module '*.bmp' {
  const src: string;
  export default src;
}

// CSS 파일
declare module '*.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

declare module '*.scss' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

declare module '*.module.scss' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

declare module '*.sass' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

declare module '*.less' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

declare module '*.styl' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

// 폰트 파일
declare module '*.woff' {
  const src: string;
  export default src;
}

declare module '*.woff2' {
  const src: string;
  export default src;
}

declare module '*.eot' {
  const src: string;
  export default src;
}

declare module '*.ttf' {
  const src: string;
  export default src;
}

declare module '*.otf' {
  const src: string;
  export default src;
}

// 미디어 파일
declare module '*.mp4' {
  const src: string;
  export default src;
}

declare module '*.webm' {
  const src: string;
  export default src;
}

declare module '*.ogg' {
  const src: string;
  export default src;
}

declare module '*.mp3' {
  const src: string;
  export default src;
}

declare module '*.wav' {
  const src: string;
  export default src;
}

declare module '*.flac' {
  const src: string;
  export default src;
}

declare module '*.aac' {
  const src: string;
  export default src;
}

// JSON 파일
declare module '*.json' {
  const value: unknown;
  export default value;
}

// 텍스트 파일
declare module '*.txt' {
  const content: string;
  export default content;
}

// WASM 파일
declare module '*.wasm' {
  const initWasm: (options: WebAssembly.Imports) => Promise<WebAssembly.Exports>;
  export default initWasm;
}

// Web Worker
declare module '*?worker' {
  const workerConstructor: {
    new (): Worker;
  };
  export default workerConstructor;
}

declare module '*?worker&inline' {
  const workerConstructor: {
    new (): Worker;
  };
  export default workerConstructor;
}

// Shared Worker
declare module '*?sharedworker' {
  const sharedWorkerConstructor: {
    new (): SharedWorker;
  };
  export default sharedWorkerConstructor;
}

// Raw import (문자열로 가져오기)
declare module '*?raw' {
  const content: string;
  export default content;
}

// URL import (파일 URL 가져오기)
declare module '*?url' {
  const src: string;
  export default src;
}

declare module 'hls.js/light' {
  export { default } from 'hls.js';
}
