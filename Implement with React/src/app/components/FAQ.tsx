import { useState } from "react";
import svgPaths from "../../imports/svg-1xtnmim35a";

interface FAQItem {
  id: number;
  category: string;
  categoryNum: number;
  question: string;
  answer?: string;
}

const faqData: FAQItem[] = [
  { id: 1, category: "수강 신청 및 결제", categoryNum: 1, question: "결제는 어떤 수단이 가능한가요?" },
  { id: 2, category: "수강 신청 및 결제", categoryNum: 1, question: "환불 규정이 어떻게 되나요?" },
  { id: 3, category: "학습 환경 및 기기", categoryNum: 2, question: "모바일이나 태블릿에서도 볼 수 있나요?" },
  { id: 4, category: "학습 환경 및 기기", categoryNum: 2, question: "한 ID로 여러 명과 공유해도 되나요?" },
  { id: 5, category: "학습 환경 및 기기", categoryNum: 2, question: "강의 교안(PDF)은 어디서 다운로드하나요?" },
  {
    id: 6, category: "강의 내용 및 커리큘럼", categoryNum: 3,
    question: "기초(Basic)와 심화(Advance) 과정의 차이가 무엇인가요?",
    answer: "기초 과정은 장기별 표준 스캔 기술과 정상 해부학, 정상 변이를 익히는 단계입니다. 심화 과정은 질환별 병리학 소견 분석, 양성/악성 감별 진단, 그리고 실전 결과지(Reporting) 작성에 집중합���다.",
  },
  { id: 7, category: "강의 내용 및 커리큘럼", categoryNum: 3, question: "전체 수강 기간과 강의 시간은 어떻게 되나요?" },
  { id: 8, category: "강의 내용 및 커리큘럼", categoryNum: 3, question: "의학적 기초 지식이 없어도 수강할 수 있나요?" },
  { id: 9, category: "수료증 및 혜택", categoryNum: 4, question: "수료증 발급 기준은 어떻게 되나요?" },
  { id: 10, category: "문의하기", categoryNum: 5, question: "강의 내용에 대해 질문이 생기면 어떻게 하나요?" },
];

export function FAQ() {
  const [openId, setOpenId] = useState<number | null>(6);

  return (
    <div>
      <div className="mb-4">
        <button className="flex items-center justify-between border border-gray-200 rounded-[10px] px-4 py-1.5 w-full max-w-[408px]">
          <span className="text-gray-400 text-[16px] font-['Pretendard_Variable']">전체 카테고리</span>
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24">
            <path d={svgPaths.p1be4b900} fill="black" />
          </svg>
        </button>
      </div>

      <div className="divide-y divide-gray-200 border-t border-b border-gray-200">
        {faqData.map((item) => (
          <div key={item.id}>
            <button
              onClick={() => setOpenId(openId === item.id ? null : item.id)}
              className={`w-full flex items-center justify-between py-4 px-5 hover:bg-gray-50 transition-colors ${openId === item.id ? "bg-gray-50" : ""}`}
            >
              <div className="flex items-center gap-2">
                <span className="bg-white border border-gray-200 rounded-full px-3 py-1 text-gray-500 text-[14px] font-['Pretendard_Variable'] shrink-0">
                  {item.categoryNum}. {item.category}
                </span>
                <span className="text-black text-[16px] font-['Pretendard_Variable'] text-left">{item.question}</span>
              </div>
              <svg className={`w-6 h-6 shrink-0 ml-2 transition-transform ${openId === item.id ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24">
                <path d={svgPaths.p1be4b900} fill="black" />
              </svg>
            </button>
            {openId === item.id && item.answer && (
              <div className="px-8 pb-4">
                <p className="text-black text-[16px] font-['Pretendard_Variable'] leading-relaxed">{item.answer}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
