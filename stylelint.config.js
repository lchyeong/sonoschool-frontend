// ============================================
// Stylelint 설정 파일
// ============================================
// Stylelint는 CSS/SCSS 코드의 스타일과 오류를 검사하는 린터(Linter)입니다.
// ESLint가 JavaScript를 검사한다면, Stylelint는 CSS를 검사합니다.
//
// 주요 역할:
// 1. CSS 문법 오류 감지
// 2. 일관된 코드 스타일 유지
// 3. 성능 및 접근성 문제 방지
// 4. 팀 전체가 동일한 CSS 작성 규칙 준수

export default {
  // ============================================
  // 기본 설정 확장 (extends)
  // ============================================
  // 다른 사람들이 만들어놓은 검증된 규칙 세트를 가져와 사용합니다.
  // 직접 모든 규칙을 설정하는 것보다 훨씬 편리합니다.

  extends: [
    // stylelint-config-standard-scss
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 📝 무엇을 하나요?
    // SCSS(Sass) 문법을 위한 표준 규칙 세트
    //
    // 포함하는 내용:
    // - CSS 표준 규칙
    // - SCSS 전용 문법 검사 ($변수, @mixin, @include 등)
    // - 중첩 규칙 검사
    // - 일반적인 오류 방지
    //
    // 예시:
    // ❌ .class { color: #fff;; }  // 세미콜론 중복
    // ✅ .class { color: #fff; }
    'stylelint-config-standard-scss',
  ],

  // ============================================
  // 플러그인 (plugins)
  // ============================================
  // 기본 Stylelint에는 없는 추가 기능을 제공하는 확장 도구입니다.

  plugins: [
    // stylelint-order
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 📝 무엇을 하나요?
    // CSS 속성의 순서를 자동으로 정렬하고 검사합니다.
    //
    // 왜 필요한가요?
    // 1. 코드 가독성 향상 (항상 같은 순서로 속성이 나열됨)
    // 2. Git diff가 깔끔해짐 (속성 순서 변경으로 인한 불필요한 변경 방지)
    // 3. 팀원 간 일관성 유지
    //
    // 예시:
    // ❌ .button { color: red; display: flex; }
    // ✅ .button { display: flex; color: red; }  // display가 먼저
    'stylelint-order',
  ],

  // ============================================
  // 린트 제외 대상
  // ============================================
  // 빌드 산출물(dist)과 외부 의존성(node_modules)은 검사하지 않습니다.
  ignoreFiles: ['dist/**/*', 'node_modules/**/*'],

  // ============================================
  // 규칙 (rules)
  // ============================================
  // Stylelint의 동작을 세밀하게 제어하는 규칙들입니다.

  rules: {
    // ========================================
    // 속성 순서 규칙
    // ========================================

    // 알파벳 순서로 속성 정렬
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 📝 무엇을 하나요?
    // CSS 속성을 알파벳 순서(a-z)로 정렬합니다.
    //
    // 장점: 속성을 찾기 쉬움
    // 단점: 관련 속성끼리 멀리 떨어질 수 있음
    //
    // 예시:
    // ✅ .box {
    //      background: blue;
    //      border: 1px solid;
    //      color: white;
    //      display: flex;
    //    }
    // Stylelint v16에서 비활성화는 null 사용
    'order/properties-alphabetical-order': null,
    // 속성 순서 강제는 현재 코드와 충돌이 커서 비활성화.
    // 필요 시 팀 컨벤션 확정 후 다시 활성화하세요.
    'order/properties-order': null,

    // ========================================
    // 색상 관련 규칙
    // ========================================

    // 색상은 소문자로만 작성
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // ❌ color: #FFF;
    // ✅ color: #fff;
    // 색상 코드를 가능한 짧게 작성
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // ❌ color: #fff;
    // ✅ color: #ffffff;
    'color-hex-length': 'long',

    // ========================================
    // 선택자 관련 규칙
    // ========================================

    // 클래스 이름은 케밥-케이스 사용 (권장)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 📝 무엇을 하나요?
    // CSS 클래스 이름 형식을 강제합니다.
    //
    // 케밥-케이스란? 단어를 하이픈(-)으로 연결
    // ✅ .primary-button
    // ✅ .user-profile-card
    // ❌ .primaryButton (카멜케이스)
    // ❌ .primary_button (스네이크케이스)
    // CSS Modules의 camelCase / kebab-case 모두 허용
    'selector-class-pattern': [
      '^[a-z][a-zA-Z0-9]*(-[a-z0-9]+)*$',
      {
        message:
          'CSS Modules는 camelCase 또는 kebab-case로 작성해주세요 (예: planetsBox, primary-button)',
      },
    ],

    // ID 선택자 사용 금지 (권장)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 📝 왜 금지하나요?
    // 1. ID는 한 페이지에 하나만 존재 → 재사용 불가
    // 2. 우선순위가 너무 높아 스타일 덮어쓰기 어려움
    // 3. 클래스 선택자가 더 유연함
    //
    // ❌ #header { color: red; }
    // ✅ .header { color: red; }
    // reset/base에서 #root 등을 사용하므로 ID 선택자 제한 비활성화
    'selector-max-id': null,

    // 선택자 중첩 깊이 제한 (3단계까지)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 📝 왜 제한하나요?
    // 중첩이 깊어질수록:
    // 1. CSS 우선순위 계산 복잡해짐
    // 2. 성능 저하
    // 3. 유지보수 어려움
    //
    // ❌ .a .b .c .d .e { }  // 5단계 - 너무 깊음
    // ✅ .a .b .c { }  // 3단계 - 적절함
    // 모듈 SCSS 중첩 노이즈가 커 비활성화
    'selector-max-compound-selectors': null,

    // CSS Modules의 :global() 허용
    'selector-pseudo-class-no-unknown': [
      true,
      {
        ignorePseudoClasses: ['global'],
      },
    ],

    // ========================================
    // v16 기준 노이즈 큰 stylistic 규칙 비활성화
    // ========================================
    'custom-property-empty-line-before': null,
    'keyframes-name-pattern': null,
    'no-descending-specificity': null,
    'selector-no-vendor-prefix': null,
    'value-keyword-case': null,
    'scss/at-if-no-null': null,
    'alpha-value-notation': null,
    'color-function-alias-notation': null,
    'color-function-notation': null,
    'at-rule-empty-line-before': null,
    'declaration-empty-line-before': null,
    'rule-empty-line-before': null,
    'shorthand-property-no-redundant-values': null,
    'selector-pseudo-element-colon-notation': null,
    'declaration-property-value-keyword-no-deprecated': null,
    'scss/comment-no-empty': null,
    'scss/double-slash-comment-empty-line-before': null,

    // ========================================
    // 단위 관련 규칙
    // ========================================

    // 0 단위 스타일은 현재 코드 호환을 위해 비활성화
    'length-zero-no-unit': null,

    // ========================================
    // 선언 관련 규칙
    // ========================================

    // 중복된 속성 금지
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // ❌ .box { color: red; color: blue; }
    // ✅ .box { color: blue; }
    //
    // 예외: 폴백을 위한 중복은 허용
    // ✅ .box {
    //      background: red;  // 구형 브라우저용
    //      background: linear-gradient(...);  // 신형 브라우저용
    //    }
    'declaration-block-no-duplicate-properties': [
      true,
      {
        ignore: ['consecutive-duplicates-with-different-values'],
      },
    ],

    // !important 사용 금지 (권장)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 📝 왜 금지하나요?
    // 1. CSS 우선순위 체계를 무너뜨림
    // 2. 나중에 덮어쓰기 매우 어려움
    // 3. 코드 유지보수 악화
    //
    // ❌ color: red !important;
    // ✅ .specific-class { color: red; }  // 선택자로 우선순위 조정
    // 드래그 상태 등 상호작용에서 !important가 필요해 비활성화
    'declaration-no-important': null,

    // ========================================
    // 폰트 관련 규칙
    // ========================================

    // 폰트 패밀리 이름에 따옴표 필요
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // ❌ font-family: Times New Roman;
    // ✅ font-family: 'Times New Roman';
    // ✅ font-family: Arial;  // 단일 단어는 따옴표 생략 가능
    'font-family-name-quotes': 'always-where-recommended',

    // ========================================
    // 주석 관련 규칙
    // ========================================

    // 빈 주석 금지
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // ❌ /*  */
    // ✅ /* 유용한 주석 */
    'comment-no-empty': true,

    // ========================================
    // SCSS 전용 규칙
    // ========================================

    // $ 변수 네이밍: 케밥-케이스 강제
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // ❌ $primaryColor: blue;
    // ✅ $primary-color: blue;
    'scss/dollar-variable-pattern': [
      '^[a-z][a-z0-9]*(-[a-z0-9]+)*$',
      {
        message: 'SCSS 변수명은 케밥-케이스로 작성해주세요 (예: $primary-color)',
      },
    ],

    // @mixin 이름: 케밥-케이스 강제
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // ❌ @mixin flexCenter { }
    // ✅ @mixin flex-center { }
    'scss/at-mixin-pattern': [
      '^[a-z][a-z0-9]*(-[a-z0-9]+)*$',
      {
        message: 'Mixin 이름은 케밥-케이스로 작성해주세요 (예: flex-center)',
      },
    ],

    // @function 이름: 케밥-케이스 강제
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // ❌ @function calculateWidth() { }
    // ✅ @function calculate-width() { }
    'scss/at-function-pattern': [
      '^[a-z][a-z0-9]*(-[a-z0-9]+)*$',
      {
        message: 'Function 이름은 케밥-케이스로 작성해주세요 (예: calculate-width)',
      },
    ],

    // 이중 슬래시 주석 뒤에 공백 필요
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // ❌ //주석
    // ✅ // 주석
    'scss/double-slash-comment-whitespace-inside': 'always',

    // ========================================
    // 성능 관련 규칙
    // ========================================

    // 벤더 프리픽스 중복 금지
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 📝 무엇을 하나요?
    // -webkit-, -moz- 같은 브라우저별 접두사를 수동으로 작성하지 말라는 규칙
    //
    // 왜? Autoprefixer 같은 도구가 자동으로 추가해줌
    //
    // ❌ .box {
    //      -webkit-transform: rotate(45deg);
    //      transform: rotate(45deg);
    //    }
    // ✅ .box { transform: rotate(45deg); }
    //    → 빌드 시 Autoprefixer가 자동으로 -webkit- 추가
    // backdrop-filter 등에서 벤더 프리픽스를 유지해야 하므로 비활성화
    'value-no-vendor-prefix': null,
    'property-no-vendor-prefix': null,

    // ========================================
    // 접근성 관련 규칙
    // ========================================

    // 폰트 가중치는 숫자 사용 권장
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // ✅ font-weight: 700;  // 명확함
    // ⚠️  font-weight: bold;  // 브라우저마다 다를 수 있음
    'font-weight-notation': 'numeric',

    // ========================================
    // 가독성 관련 규칙
    // ========================================

    // 선택자 리스트는 한 줄에 하나씩
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // ❌ .button, .link, .item { }
    // ✅ .button,
    //    .link,
    //    .item { }
    // (v16에서 제거된 stylistic 규칙들은 설정에서 제외)
  },
};
