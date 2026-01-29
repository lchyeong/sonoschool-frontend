import js from '@eslint/js';
import globals from 'globals';
import reactPlugin from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';
import prettier from 'eslint-plugin-prettier';
import importPlugin from 'eslint-plugin-import';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default [
  // ========================================
  // 1. 전역 무시 경로 설정
  // ========================================
  {
    ignores: [
      'dist', // 빌드 결과물 제외
      '.vite', // Vite 캐시(생성물) 제외
      'node_modules', // 의존성 패키지 제외
      'coverage', // 테스트 커버리지 리포트 제외
      '*.min.js', // 압축된 파일 제외
      '*.config.js', // 설정 파일 제외 (TS 프로젝트 범위 밖)
      'public', // 정적 파일 제외
      'eslint.config.js', // ESLint 설정 파일 자체 제외
    ],
  },

  // ========================================
  // 2. 기본 JavaScript 설정
  // ========================================
  js.configs.recommended,

  // ========================================
  // 3. TypeScript 추천 설정
  // ========================================
  ...tseslint.configs.strictTypeChecked,

  // ========================================
  // 4. React 추천 설정
  // ========================================
  reactPlugin.configs.flat.recommended,
  reactPlugin.configs.flat['jsx-runtime'],

  // ========================================
  // 5. TypeScript + React 파일 전용 설정
  // ========================================
  {
    files: ['**/*.{ts,tsx,js,jsx}'],

    // 언어 옵션 설정
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.es2024,
      },
      parser: tseslint.parser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
        project: ['./tsconfig.app.json', './tsconfig.node.json'],
        tsconfigRootDir: __dirname,
      },
    },

    // React 버전 설정
    settings: {
      react: {
        version: 'detect', // 자동 감지
      },
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: ['./tsconfig.app.json', './tsconfig.node.json'],
        },
        node: true,
      },
    },

    // 플러그인 등록
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      prettier,
      '@typescript-eslint': tseslint.plugin,
      import: importPlugin,
    },

    // 규칙 설정
    rules: {
      // ========================================
      // React 관련 규칙
      // ========================================

      // React 17+ / 19: JSX에서 React import 불필요
      'react/react-in-jsx-scope': 'off',

      // TypeScript 사용 시 PropTypes 불필요
      'react/prop-types': 'off',

      // Three.js/React Three Fiber 요소의 커스텀 속성 허용
      'react/no-unknown-property': [
        'error',
        {
          ignore: [
            // Three.js 일반 속성
            'args',
            'attach',
            'dispose',
            // 변환 속성
            'position',
            'rotation',
            'scale',
            'quaternion',
            // 조명 속성
            'intensity',
            'color',
            'distance',
            'angle',
            'penumbra',
            'decay',
            'castShadow',
            'receiveShadow',
            // 재질 속성
            'map',
            'transparent',
            'opacity',
            'alphaTest',
            'side',
            'vertexColors',
            'fog',
            'emissive',
            'emissiveIntensity',
            'toneMapped',
            'metalness',
            'roughness',
            'normalMap',
            'bumpMap',
            'bumpScale',
            'displacementMap',
            'displacementScale',
            'aoMap',
            'aoMapIntensity',
            'lightMap',
            'lightMapIntensity',
            'envMap',
            'envMapIntensity',
            'wireframe',
            'wireframeLinewidth',
            'flatShading',
            'depthTest',
            'depthWrite',
            'alphaMap',
            'specular',
            'specularMap',
            'shininess',
            // 카메라 속성
            'fov',
            'aspect',
            'near',
            'far',
            'zoom',
            // 지오메트리 속성
            'vertices',
            'faces',
            'normals',
            // React Three Fiber 특수 속성
            'object',
            'geometry',
            'material',
            'skeleton',
            'morphTargetInfluences',
            'morphTargetDictionary',
          ],
        },
      ],

      // JSX 불린 속성 약식 사용
      'react/jsx-boolean-value': ['error', 'never'],

      // 자기 닫는 태그 강제 해제 (여닫는 태그 유지 허용)
      'react/self-closing-comp': 'off',

      // JSX 중괄호 내 불필요한 공백 제거
      'react/jsx-curly-spacing': ['error', 'never'],

      // 함수형 컴포넌트 선호
      'react/function-component-definition': [
        'warn',
        {
          namedComponents: 'arrow-function',
          unnamedComponents: 'arrow-function',
        },
      ],

      // ========================================
      // React Hooks 관련 규칙
      // ========================================

      // Hooks 규칙 강제
      ...reactHooks.configs.recommended.rules,

      // 의존성 배열 완전성 검사
      'react-hooks/exhaustive-deps': 'warn',

      // ========================================
      // React Refresh (HMR) 관련
      // ========================================

      // 컴포넌트만 export 허용 (Vite HMR 최적화)
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      // ========================================
      // TypeScript 관련 규칙
      // ========================================

      // 기본 no-unused-vars 비활성화
      'no-unused-vars': 'off',

      // TypeScript 버전 사용
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],

      // any 타입 사용 경고 (처음엔 warn으로 시작)
      '@typescript-eslint/no-explicit-any': 'warn',

      // 타입 추론 가능한 경우 타입 생략
      '@typescript-eslint/no-inferrable-types': 'error',

      // interface 선호 (type alias 대신)
      '@typescript-eslint/consistent-type-definitions': ['warn', 'interface'],

      // 타입 import 구분
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        {
          prefer: 'type-imports',
          disallowTypeAnnotations: true,
        },
      ],

      // ========================================
      // Import 정렬 규칙
      // ========================================

      // import 순서 자동 정리
      'import/order': [
        'error',
        {
          groups: [
            'builtin', // Node.js 내장 모듈
            'external', // npm 패키지
            'internal', // 프로젝트 내부 모듈
            'parent', // 상위 디렉토리
            'sibling', // 같은 디렉토리
            'index', // index 파일
          ],
          pathGroups: [
            {
              pattern: 'react',
              group: 'external',
              position: 'before',
            },
            {
              pattern: '@/**',
              group: 'internal',
              position: 'after',
            },
            {
              pattern: '@components/**',
              group: 'internal',
              position: 'after',
            },
            {
              pattern: '@hooks/**',
              group: 'internal',
              position: 'after',
            },
            {
              pattern: '@pages/**',
              group: 'internal',
              position: 'after',
            },
            {
              pattern: '@utils/**',
              group: 'internal',
              position: 'after',
            },
            {
              pattern: '@types/**',
              group: 'internal',
              position: 'after',
            },
            {
              pattern: '@assets/**',
              group: 'internal',
              position: 'after',
            },
            {
              pattern: '@styles/**',
              group: 'internal',
              position: 'after',
            },
            {
              pattern: '@store/**',
              group: 'internal',
              position: 'after',
            },
            {
              pattern: '@constants/**',
              group: 'internal',
              position: 'after',
            },
            {
              pattern: '@services/**',
              group: 'internal',
              position: 'after',
            },
          ],
          pathGroupsExcludedImportTypes: ['react'],
          'newlines-between': 'always',
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
        },
      ],

      // ========================================
      // 일반 JavaScript 규칙
      // ========================================

      // console 사용 경고 (warn, error는 허용)
      'no-console': ['warn', { allow: ['warn', 'error'] }],

      // debugger 사용 금지
      'no-debugger': 'error',

      // === 사용 강제
      eqeqeq: ['error', 'always'],

      // var 사용 금지
      'no-var': 'error',

      // const 우선 사용
      'prefer-const': 'error',

      // 템플릿 리터럴 선호
      'prefer-template': 'warn',

      // 화살표 함수 선호
      'prefer-arrow-callback': 'warn',

      // ========================================
      // Prettier 통합
      // ========================================

      // Prettier 포맷 규칙을 ESLint 에러로 표시
      'prettier/prettier': 'error',
    },
  },

  // ========================================
  // 6. 테스트 파일 전용 설정
  // ========================================
  {
    files: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
    rules: {
      // 테스트 파일에서는 any 허용
      '@typescript-eslint/no-explicit-any': 'off',
      // 테스트에서는 console 허용
      'no-console': 'off',
    },
  },

  // ========================================
  // 7. Prettier 충돌 규칙 비활성화 (마지막에 적용)
  // ========================================
  eslintConfigPrettier,
];
