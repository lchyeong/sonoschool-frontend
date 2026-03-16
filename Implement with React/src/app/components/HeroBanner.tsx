import svgPaths from "../../imports/svg-1xtnmim35a";

const heroImage = "https://images.unsplash.com/photo-1770836037183-e0b4471fe2c0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtZWRpY2FsJTIwdWx0cmFzb3VuZCUyMGV4YW1pbmF0aW9uJTIwZXF1aXBtZW50fGVufDF8fHx8MTc3MzQ4NzY3M3ww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral";

function StarIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 20 20">
      <path d={svgPaths.p1bf65e00} fill="#FFC32C" />
    </svg>
  );
}

function Stars() {
  return (
    <div className="flex items-center">
      {[...Array(5)].map((_, i) => <StarIcon key={i} />)}
    </div>
  );
}

function Tag({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-1 bg-gray-100/80 border border-gray-200 rounded-full px-3 py-1.5">
      <span className="text-[14px] font-['Pretendard_Variable'] text-gray-600">{label}</span>
      <div className="w-px h-3.5 bg-gray-300 rotate-0" />
      <span className="text-[14px] font-['Pretendard_Variable'] text-gray-600">{value}</span>
    </div>
  );
}

export function HeroBanner() {
  return (
    <div className="relative bg-gray-900 overflow-hidden">
      <div className="absolute inset-0">
        <img src={heroImage} alt="" className="absolute right-0 top-0 h-full w-2/3 object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-gray-900 via-gray-900/90 to-transparent" />
      </div>
      <div className="relative max-w-[1440px] mx-auto px-6 py-16 md:py-20">
        <p className="text-gray-400 text-[14px] font-['Pretendard_Variable'] mb-4 opacity-40">Home &gt; Class &gt; Online</p>
        <div className="bg-gray-100 inline-flex items-center px-2.5 py-1.5 rounded-lg mb-2">
          <span className="text-[12px] font-['Pretendard_Variable'] text-black uppercase tracking-wide">best</span>
        </div>
        <div className="flex items-center gap-2 mb-4">
          {["#복부", "#정규과정", "#온라인강의"].map((tag) => (
            <span key={tag} className="text-[12px] font-['Pretendard_Variable'] text-gray-400 uppercase">{tag}</span>
          ))}
        </div>
        <h1 className="text-white text-[28px] md:text-[32px] font-['Pretendard_Variable'] max-w-[700px] mb-6" style={{ fontWeight: 600 }}>
          복부 초음파 정규 과정복부 초음파 정규 과정복부 초음파 정규 과정 복부 초음파 정규 과정
        </h1>
        <div className="flex items-center gap-1 mb-4">
          <Stars />
          <span className="text-white text-[16px] font-['Pretendard_Variable'] ml-1" style={{ fontWeight: 600 }}>5.0</span>
          <span className="text-white text-[16px] font-['Pretendard_Variable']">(9,999)</span>
        </div>
        <p className="text-gray-400 text-[16px] font-['Pretendard_Variable'] max-w-[700px] mb-8 leading-relaxed">
          복부 초음파를 처음 시작하시는 분들을 위한 SCAN 중심의 실무 종합반입니다. 정상 해부학을 이해하고 정상 구조와 초음파 영상에서 기본적인 모습을 이해하고, 초음파 검사를 수행하기 위한 기본적인 기술을 습득할 수 있습니다.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Tag label="난이도" value="초급" />
          <Tag label="모집 기간" value="상시 모집" />
          <Tag label="강의 기간" value="12주" />
          <Tag label="커리큘럼" value="이론 및 실습 12개" />
          <Tag label="수업 구분" value="팀 수업" />
        </div>
      </div>
    </div>
  );
}
