import { useState } from "react";
import svgPaths from "../../imports/svg-1xtnmim35a";

interface LessonItem {
  title: string;
  duration: string;
  topics: string[];
}

interface WeekData {
  week: string;
  hours: string;
  title: string;
  lessons?: LessonItem[];
  expanded?: boolean;
}

const basicWeeks: WeekData[] = [
  {
    week: "1주차", hours: "(4H)", title: "장비 control, vessel anatomy",
    lessons: [
      { title: "physics", duration: "52분", topics: ["초음파 발생 원리 및 인공물(Artifact)의 이해", "영상 질 개선을 위한 Knobology 실습 (Gain, Focus, Dynamic Range 등)"] },
      { title: "Vascular", duration: "44분", topics: ["[해부학] Aorta, IVC, Portal vein의 주행과 해부학적 관계", "[스캔] 복부 혈관 표준 단면도 확보 기술 및 도플러 기초"] },
    ],
  },
  { week: "2주차", hours: "(4H)", title: "Liver anatomy (Liver segment 분류)" },
  { week: "3주차", hours: "(4H)", title: "GB & Biliary tract" },
  { week: "4주차", hours: "(4H)", title: "pancreas, spleen anatomy" },
  { week: "5주차", hours: "(4H)", title: "urinary tract anatomy" },
  { week: "6주차", hours: "(4H)", title: "thyroid / parathyroid gland" },
];

const advanceWeeks: WeekData[] = [
  {
    week: "1주차", hours: "(4H)", title: "Vessel",
    lessons: [
      { title: "Vessel", duration: "90분", topics: ["복부 대동맥류(Aorta aneurysm) 및 IVC 혈전/확장증: 혈관벽 측정 및 도플러 신호 분석법", "후복막 섬유화증(Retroperitoneal fibrosis): 협착 및 폐쇄 유무 판독", "버드-키아리 증후군(Budd-chiari syndrome)"] },
    ],
  },
  {
    week: "2주차", hours: "(4H)", title: "Liver",
    lessons: [
      { title: "Liver", duration: "120분", topics: ["간 낭종/다낭성 간질환, 간 농양(Abscess): 양성 vs 악성 종양의 에코 패턴 감별", "간염(Hepatitis), 지방간(Fatty Liver), 간경변(Cirrhosis): 간 실질 거칠기(Coarseness) 등급 분류", "혈관종, 간세포선종, FNH, 간암(HCC), 전이성 간암"] },
    ],
  },
  {
    week: "3주차", hours: "(4H)", title: "Biliary system",
    lessons: [
      { title: "Biliary system", duration: "100분", topics: ["담석/담도결석, 담낭 슬러지 및 용종(Polyp): 담낭벽 두께 측정 및 Murphy's sign 확인", "담낭선근종증, 도자기 담낭(Porcelain GB): 담도 확장 부위별 원인 감별 기술", "급/만성 담낭염, 담관염, 미리지 증후군, Klatskin 종양"] },
    ],
  },
  {
    week: "4주차", hours: "(4H)", title: "Pancreas",
    lessons: [
      { title: "Pancreas", duration: "90분", topics: ["급/만성 췌장염 및 췌장 농양, 가성낭종(Pseudocyst): 췌관(Duct) 확장 및 췌장 실질 위축 판독", "VHL 증후군/다낭성 질환 관련 낭종: 가스에 가려진 병변 포착 기술", "Islet cell tumor, 선암(Adenocarcinoma) 등 종양"] },
    ],
  },
  {
    week: "5주차", hours: "(4H)", title: "Spleen",
    lessons: [
      { title: "Spleen", duration: "80분", topics: ["비종대(Splenomegaly) 및 비장 내 낭종/농양: 비장 지수(Spleen Index) 정밀 측정", "비장 석회화(Calcifications) 및 칸디다증(Candidiasis): 부비장(Accessory spleen)과의 감별 진단"] },
    ],
  },
  { week: "6주차", hours: "(4H)", title: "Thyroid" },
];

const basicTopics = [
  "생리 해부학 (Physiology and Anatomy)",
  "스캔 기술 (Scan Techniques)",
  "정상 초음파 소견 (Normal Ultrasound Findings)",
  "정상 변이 (normal variation)",
];

const advanceTopics = [
  "병리학(Pathology): 질환별 발생 기전과 그에 따른 초음파적 특징(Echogenicity, Margin 등) 심층 분석",
  "표준 영상(Standard Images): 오진을 줄이는 표준 스캔 단면과 병변 노출 최적화 기법",
  "감별 진단(Differential Diagnosis): 유사한 에코를 가진 양성/악성 병변의 결정적 차이점 비교",
  "결과지 작성(Reporting): 실제 임상에서 사용하는 용어를 활용한 표준 결과지 작성 실습",
];

function WeekRow({ data, onToggle, isOpen }: { data: WeekData; onToggle: () => void; isOpen: boolean }) {
  const hasLessons = data.lessons && data.lessons.length > 0;

  return (
    <div className="border border-gray-200 rounded-[20px] overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full bg-gray-50 flex items-center justify-between px-6 py-3 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 w-[160px] border-r border-gray-200 pr-4">
            <span className="text-black text-[16px] font-['Pretendard_Variable']" style={{ fontWeight: 600 }}>{data.week}</span>
            <span className="text-black text-[16px] font-['Pretendard_Variable']" style={{ fontWeight: 600 }}>{data.hours}</span>
          </div>
          <span className="text-black text-[16px] font-['Pretendard_Variable']" style={{ fontWeight: 600 }}>{data.title}</span>
        </div>
        <svg className={`w-6 h-6 transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24">
          <path d={svgPaths.p1be4b900} fill="black" />
        </svg>
      </button>
      {isOpen && hasLessons && (
        <div className="p-6 space-y-4">
          {data.lessons!.map((lesson, i) => (
            <div key={i} className={i > 0 ? "border-t border-gray-200 pt-4" : ""}>
              <div className="flex items-start justify-between mb-2">
                <span className="text-gray-400 text-[16px] font-['Pretendard_Variable']">{i + 1}. {lesson.title}</span>
                <span className="text-gray-400 text-[16px] font-['Pretendard_Variable'] shrink-0 ml-4">{lesson.duration}</span>
              </div>
              <ul className="list-disc ml-6 space-y-0.5">
                {lesson.topics.map((topic, j) => (
                  <li key={j} className="text-gray-400 text-[16px] font-['Pretendard_Variable'] leading-relaxed">{topic}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function Curriculum() {
  const [openWeeks, setOpenWeeks] = useState<Record<string, boolean>>({ "basic-0": true });

  const toggle = (key: string) => {
    setOpenWeeks((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-10">
      {/* Basic */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 bg-black rounded-full" />
          <h3 className="text-black text-[20px] font-['Pretendard_Variable']" style={{ fontWeight: 600 }}>Basic-6주</h3>
        </div>
        <div className="bg-gray-50 rounded-[30px] p-6 mb-4">
          <ul className="list-disc ml-6 space-y-0.5">
            {basicTopics.map((topic) => (
              <li key={topic} className="text-gray-400 text-[16px] font-['Pretendard_Variable'] leading-relaxed">{topic}</li>
            ))}
          </ul>
        </div>
        <div className="space-y-3">
          {basicWeeks.map((week, i) => (
            <WeekRow key={i} data={week} isOpen={!!openWeeks[`basic-${i}`]} onToggle={() => toggle(`basic-${i}`)} />
          ))}
        </div>
      </div>

      {/* Advance */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 bg-black rounded-full" />
          <h3 className="text-black text-[20px] font-['Pretendard_Variable']" style={{ fontWeight: 600 }}>Advance-6주</h3>
        </div>
        <div className="bg-gray-50 rounded-[30px] p-6 mb-4">
          <ol className="list-decimal ml-6 space-y-0.5">
            {advanceTopics.map((topic) => (
              <li key={topic} className="text-gray-400 text-[16px] font-['Pretendard_Variable'] leading-relaxed">{topic}</li>
            ))}
          </ol>
        </div>
        <div className="space-y-3">
          {advanceWeeks.map((week, i) => (
            <WeekRow key={i} data={week} isOpen={!!openWeeks[`advance-${i}`]} onToggle={() => toggle(`advance-${i}`)} />
          ))}
        </div>
      </div>
    </div>
  );
}
