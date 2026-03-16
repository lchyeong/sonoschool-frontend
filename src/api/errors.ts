// `axios` 기본 객체를 가져오는 이유는
// `axios.isAxiosError(...)` 같은 공식 타입 가드 유틸리티를 쓰기 위해서입니다.
// 이 함수로 "지금 잡은 에러가 Axios 에러가 맞는지" 안전하게 판별할 수 있습니다.
import axios from 'axios';

// `ApiError`는 이 프로젝트에서 API 요청 실패를 표현하는 공통 에러 클래스입니다.
//
// 왜 기본 `Error`만 쓰지 않나요?
// 기본 `Error`에는 HTTP 상태 코드나 사용자에게 보여 줄 메시지 같은 정보가 없습니다.
// 그래서 화면 쪽에서 일관되게 처리할 수 있도록 필요한 정보를 담은 커스텀 에러를 만듭니다.
export class ApiError extends Error {
  // `status`는 서버가 돌려준 HTTP 상태 코드입니다.
  // 예: 400, 401, 403, 500
  // 네트워크 오류처럼 상태 코드를 알 수 없으면 `null`이 됩니다.
  public readonly status: number | null;
  // `userMessage`는 화면에서 바로 보여 줄 수 있는 사용자용 메시지입니다.
  // 서버 메시지가 있으면 그 값을 쓰고, 없으면 기본 안내 문구를 사용합니다.
  public readonly userMessage: string;

  // 생성자(constructor)는 `new ApiError(...)`를 호출할 때 처음 실행되는 부분입니다.
  // 여기서 우리가 원하는 속성들을 Error 객체에 채워 넣습니다.
  public constructor(params: { userMessage: string; status: number | null; cause?: unknown }) {
    // `super(...)`는 부모 클래스인 `Error`의 생성자를 호출합니다.
    // 기본 Error.message 값으로도 사용자 메시지를 저장해 두기 위해 사용합니다.
    super(params.userMessage);
    // 디버깅 시 에러 이름을 더 명확히 보기 위해 기본 `Error` 대신 `ApiError`로 이름을 지정합니다.
    this.name = 'ApiError';
    // 사용자용 메시지를 별도 속성으로도 보관합니다.
    this.userMessage = params.userMessage;
    // 상태 코드도 함께 저장해 둡니다.
    this.status = params.status;
    // 원래 에러 원인(cause)을 남겨 두면 나중에 디버깅할 때 추적이 쉬워집니다.
    this.cause = params.cause;
  }
}

// 이 함수는 "Axios 에러라면 사용자에게 보여 줄 만한 메시지를 최대한 추출한다"는 역할을 합니다.
//
// 우선순위는 다음과 같습니다.
// 1. 서버 응답 본문이 문자열이면 그 문자열
// 2. 서버 응답 본문 객체 안에 `message` 필드가 있으면 그 문자열
// 3. Axios 에러 객체 자체의 message
// 4. 아무것도 없으면 `null`
const getAxiosErrorMessage = (error: unknown): string | null => {
  // 먼저 이 에러가 Axios가 만든 에러인지 확인합니다.
  // Axios 에러가 아니면 아래의 `response`, `message` 구조를 믿을 수 없으므로 바로 `null`을 반환합니다.
  if (!axios.isAxiosError<unknown>(error)) return null;

  // Axios 에러라면 서버 응답 본문(data)에 접근할 수 있습니다.
  const responseData = error.response?.data;
  // 서버가 문자열 하나만 내려준 경우를 처리합니다.
  // `trim()`은 공백만 있는 문자열을 걸러내기 위해 사용합니다.
  if (typeof responseData === 'string' && responseData.trim()) return responseData.trim();

  // 서버가 `{ message: '...' }` 형태의 객체를 내려주는 경우도 흔하므로 따로 처리합니다.
  if (responseData && typeof responseData === 'object') {
    // `responseData`는 타입이 넓기 때문에,
    // 객체의 특정 필드에 접근하려면 먼저 "문자열 키를 가진 일반 객체"라고 알려 줘야 합니다.
    const record = responseData as Record<string, unknown>;
    // `message` 필드를 꺼내봅니다.
    const message = record['message'];
    // `message`가 실제 문자열이고 비어 있지 않다면 그것을 최우선 메시지로 사용합니다.
    if (typeof message === 'string' && message.trim()) return message.trim();
  }

  // 응답 본문에 쓸 만한 메시지가 없으면 Axios 에러 자체의 message를 사용합니다.
  const message = error.message.trim();
  // message도 비어 있지 않을 때만 반환합니다.
  return message ? message : null;
};

// `toApiError`는 이 파일의 핵심 진입점입니다.
// 어떤 종류의 에러가 들어와도 최종적으로 `ApiError` 객체 하나로 바꿔 줍니다.
//
// 기대효과:
// 화면 컴포넌트나 React Query 쪽에서는
// "API 에러는 항상 `ApiError`처럼 다룬다"는 공통 규칙을 가질 수 있습니다.
export const toApiError = (
  // 네트워크 요청에서 잡힌 원본 에러입니다.
  error: unknown,
  // 사용자에게 보여 줄 기본 메시지입니다.
  // 서버 메시지를 추출하지 못했을 때 안전한 안내 문구로 사용합니다.
  fallbackUserMessage = '요청에 실패했습니다.',
): ApiError => {
  // 서버/axios 쪽에서 읽을 수 있는 메시지가 있으면 그 값을 사용하고,
  // 없으면 fallback 문구를 사용합니다.
  const userMessage = getAxiosErrorMessage(error) ?? fallbackUserMessage;
  // Axios 에러라면 상태 코드를 꺼내고, 아니면 `null`로 둡니다.
  const status = axios.isAxiosError(error) ? (error.response?.status ?? null) : null;
  // 최종적으로 프로젝트 공통 `ApiError` 인스턴스를 만들어 반환합니다.
  return new ApiError({ userMessage, status, cause: error });
};
