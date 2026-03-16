import svgPaths from "../../imports/svg-1xtnmim35a";

function CheckIcon({ color = "#2EA995" }: { color?: string }) {
  return (
    <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 20 20">
      <path d={svgPaths.p37dae7f0} fill={color} />
    </svg>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-6">
      <h3 className="text-black text-[20px] font-['Pretendard_Variable'] mb-1" style={{ fontWeight: 600 }}>{title}</h3>
      <p className="text-gray-400 text-[18px] font-['Pretendard_Variable']" style={{ fontWeight: 600 }}>{subtitle}</p>
    </div>
  );
}

function InfoBox({ title, content }: { title: string; content: string }) {
  return (
    <div className="bg-gray-50 rounded-[20px] p-6 overflow-hidden">
      <p className="text-black text-[16px] font-['Pretendard_Variable'] mb-2" style={{ fontWeight: 700 }}>{title}</p>
      <ul className="list-disc ml-6">
        <li className="text-black text-[14px] font-['Pretendard_Variable'] leading-relaxed">{content}</li>
      </ul>
    </div>
  );
}

function FeatureCard({ title, content, iconColor = "#FF4ACC" }: { title: string; content: string; iconColor?: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-[20px] p-6">
      <CheckIcon color={iconColor} />
      <p className="text-black text-[16px] font-['Pretendard_Variable'] mt-3 mb-2" style={{ fontWeight: 600 }}>{title}</p>
      <p className="text-black text-[14px] font-['Pretendard_Variable'] leading-relaxed">{content}</p>
    </div>
  );
}

function CheckItem({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-1">
      <CheckIcon color="#314DCC" />
      <span className="text-black text-[16px] font-['Pretendard_Variable']" style={{ fontWeight: 700 }}>{text}</span>
    </div>
  );
}

function TargetCheckItem({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-1">
      <CheckIcon />
      <span className="text-black text-[14px] font-['Pretendard_Variable'] leading-relaxed">{text}</span>
    </div>
  );
}

function StepCard({ step, title, items, color }: { step: number; title: string; items: string[]; color: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-[20px] overflow-hidden">
      <div className="bg-gray-50 border-b border-gray-200 py-3 px-6 flex items-center justify-center gap-1">
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24">
          <path d={svgPaths.p2c931d00} fill={color} />
        </svg>
        <span className="text-black text-[16px] font-['Pretendard_Variable']" style={{ fontWeight: 700 }}>
          STEP {step}. {title}
        </span>
      </div>
      <div className="p-6 space-y-1">
        {items.map((item, i) => (
          <p key={i} className="text-black text-[16px] font-['Pretendard_Variable']">• {item}</p>
        ))}
      </div>
    </div>
  );
}

export function CourseIntroduction() {
  return (
    <div className="space-y-12">
      {/* 핵심 포인트 */}
      <div>
        <SectionHeader title="실전력을 극대화하는 SRDMS만의 핵심 포인트" subtitle="이론을 넘어 진단적 사고력을 키우는 3가지 차별점" />
        <div className="border-t border-gray-200 pt-6 space-y-4">
          <InfoBox
            title="4+4 하이브리드 학습 체계"
            content="기초 과정의 4대 요소(해부학, 스캔 기술, 정상 소견, 변이)와 심화 과정의 4대 요소(병리학, 표준 영상, 감별 진단, 결과지 작성)를 결합하여 빈틈없는 실력을 구축합니다."
          />
          <InfoBox
            title="12주 완성 올인원 로드맵"
            content="상복부, 비뇨기계, 갑상선 등 전 장기를 아우르며 입문자도 전문가 수준으로 성장할 수 있는 체계적인 단계를 제안합니다."
          />
          <InfoBox
            title="실전 결과지(Reporting) 가이드"
            content="병변을 찾는 것을 넘어, 실제 임상 용어를 활용해 표준화된 보고서를 작성하는 노하우를 전수합니다."
          />
        </div>
      </div>

      {/* 12주 후 변화 */}
      <div>
        <SectionHeader title="12주 후, 당신의 초음파 전문성은 이렇게 달라집니다" subtitle="자신감 있는 스캔부터 완벽한 결과지 작성까지의 변화" />
        <div className="border-t border-gray-200 pt-6 space-y-4">
          <div className="space-y-4">
            <div>
              <CheckItem text="스캔 자신감 확보" />
              <ul className="list-disc ml-8 mt-1">
                <li className="text-black text-[14px] font-['Pretendard_Variable'] leading-relaxed">장비 조절(Knobology) 최적화와 장기별 표준 단면 확보 기술을 통해 어떤 환자 앞에서도 당황하지 않는 자신감을 얻게 됩니다.</li>
              </ul>
            </div>
            <div>
              <CheckItem text="정교한 판독 역량" />
              <ul className="list-disc ml-8 mt-1">
                <li className="text-black text-[14px] font-['Pretendard_Variable'] leading-relaxed">정상 변이와 실제 병변을 명확히 구분하고, 양성/악성 종양의 결정적 차이를 판별하는 안목이 생깁니다.</li>
              </ul>
            </div>
            <div>
              <CheckItem text="커리어 전문성 강화" />
              <ul className="list-disc ml-8 mt-1">
                <li className="text-black text-[14px] font-['Pretendard_Variable'] leading-relaxed">12주 완주 후 발급되는 공식 수료증과 함께, 결과지 작성 능력을 갖춘 숙련된 전문가로 거듭납니다.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* 추천 대상 */}
      <div>
        <SectionHeader title="이런 고민을 가진 분들께 강력히 추천합니다" subtitle="초음파 입문자부터 판독의 확신이 필요한 숙련자까지" />
        <div className="border-t border-gray-200 pt-6">
          <div className="bg-white border border-gray-200 rounded-[20px] p-6">
            <div className="flex items-start gap-6">
              <div className="w-[55px] h-[55px] bg-gray-300 rounded-full shrink-0" />
              <div className="flex flex-col gap-2 flex-1">
                <p className="text-black text-[16px] font-['Pretendard_Variable']" style={{ fontWeight: 700 }}>강의 대상은</p>
                <TargetCheckItem text="초음파 입문 의료진: 기초 해부학부터 장비 사용법까지 체계적으로 배우고 싶은 분" />
                <TargetCheckItem text="실전 진단에 확신이 필요한 분: 병변 포착과 감별 진단, 결과지 작성에 어려움을 겪는 숙련자" />
                <TargetCheckItem text="검사 영역을 확장하고 싶은 분: 상복부 위주에서 비뇨기계, 갑상선까지 폭넓은 진단 역량을 갖추고 싶은 분" />
                <TargetCheckItem text="독학의 한계를 느끼는 분: 파편화된 지식을 하나의 계통으로 정리하고 싶은 분" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 수강 전 체크리스트 */}
      <div>
        <SectionHeader title="학습 효과를 높이기 위한 수강 전 체크리스트" subtitle="원활한 학습을 위해 꼭 확인해야 할 유의사항" />
        <div className="border-t border-gray-200 pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <FeatureCard title="선수 지식" content="기본적인 해부학 용어에 대한 이해가 있다면 학습 효과가 더욱 극대화됩니다." />
          <FeatureCard title="학습 자료" content="주차별 강의 PDF 교안과 실전 결과지 템플릿이 자료실을 통해 제공됩니다." />
          <FeatureCard title="최적화 환경" content="UHD 고화질 영상으로 제작되어 대화면 모니터에서 더욱 선명한 초음파 영상을 확인하실 수 있습니다." />
          <FeatureCard title="수료 기준" content="전체 강의의 80% 이상 수강 시 공식 수료증이 발급됩니다." />
        </div>
      </div>

      {/* 12주 마스터 로드맵 */}
      <div>
        <SectionHeader title="기초부터 심화까지, 12주 마스터 로드맵" subtitle="해부학적 기초와 실전 병리학을 잇는 체계적인 교육 단계" />
        <div className="border-t border-gray-200 pt-6 space-y-4">
          <StepCard
            step={1}
            title="기초 다지기 (1~4주) 표준 스캔 및 정상 소견 마스터"
            color="#96A5E7"
            items={[
              "초음파 물리 및 장비 조절(Knobology) 최적화",
              "상복부·비뇨기계·갑상선 해부학적 구조 이해",
              "장기별 표준 단면(Standard View) 확보 기술",
            ]}
          />
          <StepCard
            step={2}
            title="심화 분석 (5~10주) 병리학적 판독 및 감별 진단"
            color="#435DD1"
            items={[
              "주요 장기별 병변 포착 및 양성·악성 감별 포인트",
              "임상 케이스별 영상 특징 분석 및 판독 루틴 구축",
              "놓치기 쉬운 비정상 소견 및 정상 변이 대조 학습",
            ]}
          />
          <StepCard
            step={3}
            title="실무 완성 (11~12주) 결과지 작성 및 실전 프로세스"
            color="#203490"
            items={[
              "표준 의학 용어를 활용한 정교한 결과지(Reporting) 작성",
              "실제 임상 환경을 가정한 종합 진단 시뮬레이션",
              "전문가 수준의 최종 진단 도출 및 학습 내용 통합",
            ]}
          />
        </div>
      </div>
    </div>
  );
}
