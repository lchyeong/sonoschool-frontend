import clsx from "clsx";
import svgPaths from "./svg-1xtnmim35a";
import imgGeminiGeneratedImage5Sqw3L5Sqw3L5Sqw1 from "figma:asset/ecfd4dd5ebec13e55b750b32e204a755ea1f519c.png";
import img293X1 from "figma:asset/852529941015dfb92b29c23252bc879b14d11c78.png";
type Wrapper6Props = {
  additionalClassNames?: string;
};

function Wrapper6({ children, additionalClassNames = "" }: React.PropsWithChildren<Wrapper6Props>) {
  return (
    <div className={clsx("bg-white relative shrink-0 w-full", additionalClassNames)}>
      <div className="overflow-clip relative rounded-[inherit] size-full">{children}</div>
      <div aria-hidden="true" className="absolute border-[#e5e7eb] border-b border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function Wrapper5({ children }: React.PropsWithChildren<{}>) {
  return (
    <div className="absolute content-stretch flex gap-[16px] items-center left-[-1px] top-[13px]">
      <Helper3 text="3주차" text1="(4H)" />
      <p className="font-['Pretendard:SemiBold',sans-serif] leading-[1.3] not-italic relative shrink-0 text-[16px] text-black text-center whitespace-nowrap">{children}</p>
    </div>
  );
}
type Wrapper4Props = {
  additionalClassNames?: string;
};

function Wrapper4({ children, additionalClassNames = "" }: React.PropsWithChildren<Wrapper4Props>) {
  return (
    <div className={clsx("bg-white h-[237px] relative rounded-[30px] shrink-0 w-[348px]", additionalClassNames)}>
      <div className="overflow-clip relative rounded-[inherit] size-full">{children}</div>
      <div aria-hidden="true" className="absolute border border-[#e5e7eb] border-solid inset-0 pointer-events-none rounded-[30px]" />
    </div>
  );
}
type Wrapper3Props = {
  additionalClassNames?: string;
};

function Wrapper3({ children, additionalClassNames = "" }: React.PropsWithChildren<Wrapper3Props>) {
  return (
    <div className={additionalClassNames}>
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
        {children}
      </svg>
    </div>
  );
}
type Wrapper2Props = {
  additionalClassNames?: string;
};

function Wrapper2({ children, additionalClassNames = "" }: React.PropsWithChildren<Wrapper2Props>) {
  return <Wrapper3 additionalClassNames={clsx("absolute size-[24px]", additionalClassNames)}>{children}</Wrapper3>;
}
type Wrapper1Props = {
  additionalClassNames?: string;
};

function Wrapper1({ children, additionalClassNames = "" }: React.PropsWithChildren<Wrapper1Props>) {
  return (
    <div className={clsx("size-[20px]", additionalClassNames)}>
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        {children}
      </svg>
    </div>
  );
}
type WrapperProps = {
  additionalClassNames?: string;
};

function Wrapper({ children, additionalClassNames = "" }: React.PropsWithChildren<WrapperProps>) {
  return (
    <Wrapper1 additionalClassNames={additionalClassNames}>
      <g id="check_circle_24dp_000000_FILL1_wght400_GRAD0_opsz24 2">{children}</g>
    </Wrapper1>
  );
}
type Text16Props = {
  text: string;
  additionalClassNames?: string;
};

function Text16({ text, additionalClassNames = "" }: Text16Props) {
  return (
    <div className={clsx("absolute h-[48px] overflow-clip rounded-[20px] top-[369px]", additionalClassNames)}>
      <p className="-translate-x-1/2 absolute font-['Pretendard:SemiBold',sans-serif] leading-[1.3] left-[calc(50%+0.5px)] not-italic text-[18px] text-center text-white top-[12px] whitespace-nowrap">{text}</p>
    </div>
  );
}
type Helper6Props = {
  text: string;
  text1: string;
};

function Helper6({ text, text1 }: Helper6Props) {
  return (
    <div className="bg-[#f3f4f6] content-stretch flex gap-[4px] items-center px-[12px] py-[6px] relative rounded-[999999px] shrink-0">
      <div aria-hidden="true" className="absolute border border-[#e5e7eb] border-solid inset-0 pointer-events-none rounded-[999999px]" />
      <p className="font-['Pretendard:Medium',sans-serif] leading-[1.3] not-italic relative shrink-0 text-[#4b5563] text-[14px] whitespace-nowrap">{text}</p>
      <div className="flex h-[14px] items-center justify-center relative shrink-0 w-0" style={{ "--transform-inner-width": "1185", "--transform-inner-height": "19" } as React.CSSProperties}>
        <div className="flex-none rotate-90">
          <div className="h-0 relative w-[14px]">
            <div className="absolute inset-[-1px_0_0_0]">
              <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14 1">
                <line id="Line 3" stroke="var(--stroke-0, #E5E7EB)" x2="14" y1="0.5" y2="0.5" />
              </svg>
            </div>
          </div>
        </div>
      </div>
      <p className="font-['Pretendard:Medium',sans-serif] leading-[1.3] not-italic relative shrink-0 text-[#4b5563] text-[14px] whitespace-nowrap">{text1}</p>
    </div>
  );
}
type Text15Props = {
  text: string;
};

function Text15({ text }: Text15Props) {
  return (
    <div className="content-stretch flex items-center justify-center py-[10px] relative shrink-0">
      <p className="font-['Pretendard:Medium',sans-serif] leading-[1.3] not-italic relative shrink-0 text-[#9ca3af] text-[12px] uppercase whitespace-nowrap">{text}</p>
    </div>
  );
}
type Text14Props = {
  text: string;
  additionalClassNames?: string;
};

function Text14({ text, additionalClassNames = "" }: Text14Props) {
  return (
    <div className={clsx("-translate-y-1/2 absolute content-stretch flex gap-[8px] items-center left-[20px]", additionalClassNames)}>
      <div className="bg-white content-stretch flex items-center justify-center px-[12px] py-[4px] relative rounded-[99999px] shrink-0">
        <ol className="block font-['Pretendard:Medium',sans-serif] leading-[0] not-italic relative shrink-0 text-[#6b7280] text-[14px] whitespace-nowrap" start="3">
          <li className="ms-[21px]">
            <span className="leading-[1.3]">{"강의 내용 및 커리큘럼"}</span>
          </li>
        </ol>
      </div>
      <p className="font-['Pretendard:Regular',sans-serif] leading-[1.6] not-italic relative shrink-0 text-[16px] text-black whitespace-nowrap">{text}</p>
    </div>
  );
}
type Text13Props = {
  text: string;
};

function Text13({ text }: Text13Props) {
  return (
    <div className="-translate-y-1/2 absolute content-stretch flex gap-[8px] items-center left-[20px] top-1/2">
      <div className="bg-white content-stretch flex items-center justify-center px-[12px] py-[4px] relative rounded-[99999px] shrink-0">
        <ol className="block font-['Pretendard:Medium',sans-serif] leading-[0] not-italic relative shrink-0 text-[#6b7280] text-[14px] whitespace-nowrap" start="2">
          <li className="ms-[21px]">
            <span className="leading-[1.3]">{"학습 환경 및 기기"}</span>
          </li>
        </ol>
      </div>
      <p className="font-['Pretendard:Regular',sans-serif] leading-[1.6] not-italic relative shrink-0 text-[16px] text-black whitespace-nowrap">{text}</p>
    </div>
  );
}
type Text12Props = {
  text: string;
};

function Text12({ text }: Text12Props) {
  return (
    <div className="-translate-y-1/2 absolute content-stretch flex gap-[8px] items-center left-[20px] top-1/2">
      <div className="bg-white content-stretch flex items-center justify-center px-[12px] py-[4px] relative rounded-[99999px] shrink-0">
        <ol className="block font-['Pretendard:Medium',sans-serif] leading-[0] not-italic relative shrink-0 text-[#6b7280] text-[14px] whitespace-nowrap" start="1">
          <li className="ms-[21px]">
            <span className="leading-[1.3]">{"수강 신청 및 결제"}</span>
          </li>
        </ol>
      </div>
      <p className="font-['Pretendard:Regular',sans-serif] leading-[1.6] not-italic relative shrink-0 text-[16px] text-black whitespace-nowrap">{text}</p>
    </div>
  );
}
type Text11Props = {
  text: string;
  additionalClassNames?: string;
};

function Text11({ text, additionalClassNames = "" }: Text11Props) {
  return (
    <div className={clsx("absolute border border-[#e5e7eb] border-solid h-[36px] overflow-clip rounded-[20px] w-[82px]", additionalClassNames)}>
      <p className="absolute font-['Pretendard:Medium',sans-serif] leading-[1.6] left-[43px] not-italic text-[14px] text-black top-[6px] whitespace-nowrap">{text}</p>
      <ThumbUp24Dp000000Fill0Wght400Grad0Opsz />
    </div>
  );
}

function ThumbUp24Dp000000Fill0Wght400Grad0Opsz() {
  return (
    <div className="absolute left-[19px] size-[16px] top-[9px]">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="thumb_up_24dp_000000_FILL0_wght400_GRAD0_opsz24 1">
          <path d={svgPaths.p3d297b00} fill="var(--fill-0, black)" id="Vector" />
        </g>
      </svg>
    </div>
  );
}
type Helper5Props = {
  text: string;
  text1: string;
  text2: string;
};

function Helper5({ text, text1, text2 }: Helper5Props) {
  return (
    <ul className="absolute block font-['Pretendard:Medium',sans-serif] leading-[0] left-[23px] list-disc not-italic text-[#9ca3af] text-[16px] top-[57px] w-[700px]">
      <li className="mb-0 ms-[24px]">
        <span className="leading-[1.6]">{text}</span>
      </li>
      <li className="mb-0 ms-[24px]">
        <span className="leading-[1.6]">{text1}</span>
      </li>
      <li className="ms-[24px]">
        <span className="leading-[1.6]">{text2}</span>
      </li>
    </ul>
  );
}
type Helper4Props = {
  text: string;
  text1: string;
  additionalClassNames?: string;
};

function Helper4({ text, text1, additionalClassNames = "" }: Helper4Props) {
  return (
    <ul className={clsx("absolute block font-['Pretendard:Medium',sans-serif] leading-[0] list-disc not-italic text-[#9ca3af] text-[16px]", additionalClassNames)}>
      <li className="mb-0 ms-[24px]">
        <span className="leading-[1.6]">{text}</span>
      </li>
      <li className="ms-[24px]">
        <span className="leading-[1.6]">{text1}</span>
      </li>
    </ul>
  );
}
type Stat124Dp000000Fill1Wght400Grad0OpszProps = {
  additionalClassNames?: string;
};

function Stat124Dp000000Fill1Wght400Grad0Opsz({ additionalClassNames = "" }: Stat124Dp000000Fill1Wght400Grad0OpszProps) {
  return (
    <div className={clsx("absolute", additionalClassNames)}>
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24.1165 24">
        <g id="stat_1_24dp_000000_FILL1_wght400_GRAD0_opsz24 1">
          <path d={svgPaths.pe8d1d00} fill="var(--fill-0, black)" id="Vector" />
        </g>
      </svg>
    </div>
  );
}
type Text10Props = {
  text: string;
};

function Text10({ text }: Text10Props) {
  return (
    <div className="absolute content-stretch flex gap-[16px] items-center left-[-1px] top-[13px]">
      <Helper3 text="1주차" text1="(4H)" />
      <p className="font-['Pretendard:SemiBold',sans-serif] leading-[1.3] not-italic relative shrink-0 text-[16px] text-black text-center whitespace-nowrap">{text}</p>
    </div>
  );
}
type Text9Props = {
  text: string;
  additionalClassNames?: string;
};

function Text9({ text, additionalClassNames = "" }: Text9Props) {
  return (
    <div className={clsx("absolute content-stretch flex gap-[8px] items-center left-[24px]", additionalClassNames)}>
      <div className="relative shrink-0 size-[8px]">
        <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 8 8">
          <circle cx="4" cy="4" fill="var(--fill-0, black)" id="Ellipse 1" r="4" />
        </svg>
      </div>
      <p className="font-['Pretendard:SemiBold',sans-serif] leading-[1.3] not-italic relative shrink-0 text-[20px] text-black whitespace-nowrap">{text}</p>
    </div>
  );
}
type Text8Props = {
  text: string;
};

function Text8({ text }: Text8Props) {
  return (
    <div className="absolute content-stretch flex gap-[16px] items-center left-[-1px] top-[13px]">
      <Helper3 text="6주차" text1="(4H)" />
      <p className="font-['Pretendard:SemiBold',sans-serif] leading-[1.3] not-italic relative shrink-0 text-[16px] text-black text-center whitespace-nowrap">{text}</p>
    </div>
  );
}
type Text7Props = {
  text: string;
};

function Text7({ text }: Text7Props) {
  return (
    <div className="absolute content-stretch flex gap-[16px] items-center left-[-1px] top-[13px]">
      <Helper3 text="5주차" text1="(4H)" />
      <p className="font-['Pretendard:SemiBold',sans-serif] leading-[1.3] not-italic relative shrink-0 text-[16px] text-black text-center whitespace-nowrap">{text}</p>
    </div>
  );
}
type Text6Props = {
  text: string;
};

function Text6({ text }: Text6Props) {
  return (
    <div className="absolute content-stretch flex gap-[16px] items-center left-[-1px] top-[13px]">
      <Helper3 text="4주차" text1="(4H)" />
      <p className="font-['Pretendard:SemiBold',sans-serif] leading-[1.3] not-italic relative shrink-0 text-[16px] text-black text-center whitespace-nowrap">{text}</p>
    </div>
  );
}
type Text5Props = {
  text: string;
};

function Text5({ text }: Text5Props) {
  return (
    <div className="absolute content-stretch flex gap-[16px] items-center left-[-1px] top-[13px]">
      <Helper3 text="2주차" text1="(4H)" />
      <p className="font-['Pretendard:SemiBold',sans-serif] leading-[1.3] not-italic relative shrink-0 text-[16px] text-black text-center whitespace-nowrap">{text}</p>
    </div>
  );
}
type Helper3Props = {
  text: string;
  text1: string;
};

function Helper3({ text, text1 }: Helper3Props) {
  return (
    <div className="content-stretch flex gap-[4px] items-center justify-center relative shrink-0 w-[160px]">
      <div aria-hidden="true" className="absolute border-[#e5e7eb] border-r border-solid inset-0 pointer-events-none" />
      <p className="font-['Pretendard:SemiBold',sans-serif] leading-[1.3] not-italic relative shrink-0 text-[16px] text-black whitespace-nowrap">{text}</p>
      <p className="font-['Pretendard:SemiBold',sans-serif] leading-[1.3] not-italic relative shrink-0 text-[16px] text-black whitespace-nowrap">{text1}</p>
    </div>
  );
}
type StatMinus124Dp000000Fill1Wght400Grad0OpszProps = {
  additionalClassNames?: string;
};

function StatMinus124Dp000000Fill1Wght400Grad0Opsz({ additionalClassNames = "" }: StatMinus124Dp000000Fill1Wght400Grad0OpszProps) {
  return (
    <Wrapper3 additionalClassNames={clsx("-translate-y-1/2 absolute size-[24px]", additionalClassNames)}>
      <g id="stat_minus_1_24dp_000000_FILL1_wght400_GRAD0_opsz24 1">
        <path d={svgPaths.p1be4b900} fill="var(--fill-0, black)" id="Vector" />
      </g>
    </Wrapper3>
  );
}
type Frame157HelperProps = {
  additionalClassNames?: string;
};

function Frame157Helper({ additionalClassNames = "" }: Frame157HelperProps) {
  return (
    <div className={clsx("absolute h-0 left-[24px] w-[828px]", additionalClassNames)}>
      <div className="absolute inset-[-1px_0_0_0]">
        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 828 1">
          <line id="Line 9" stroke="var(--stroke-0, #E5E7EB)" x2="828" y1="0.5" y2="0.5" />
        </svg>
      </div>
    </div>
  );
}
type Text4Props = {
  text: string;
  additionalClassNames?: string;
};

function Text4({ text, additionalClassNames = "" }: Text4Props) {
  return (
    <div className={clsx("absolute content-stretch flex gap-[4px] items-center left-[24px]", additionalClassNames)}>
      <Wrapper additionalClassNames="relative shrink-0">
        <path d={svgPaths.p37dae7f0} fill="var(--fill-0, #314DCC)" id="Vector" />
      </Wrapper>
      <p className="font-['Pretendard:Bold',sans-serif] leading-[1.3] not-italic relative shrink-0 text-[16px] text-black whitespace-nowrap">{text}</p>
    </div>
  );
}
type Helper2Props = {
  text: string;
  text1: string;
  additionalClassNames?: string;
};

function Helper2({ text, text1, additionalClassNames = "" }: Helper2Props) {
  return (
    <div className={clsx("absolute bg-white border border-[#e5e7eb] border-solid h-[162px] overflow-clip rounded-[20px] w-[408px]", additionalClassNames)}>
      <p className="absolute font-['Pretendard:Medium',sans-serif] leading-[1.6] left-[23px] not-italic text-[14px] text-black top-[96px] w-[355px]">{text}</p>
      <p className="absolute font-['Pretendard:SemiBold',sans-serif] leading-[1.6] left-[23px] not-italic text-[16px] text-black top-[64px] whitespace-nowrap">{text1}</p>
      <Wrapper additionalClassNames="absolute left-[23px] top-[23px]">
        <path d={svgPaths.p37dae7f0} fill="var(--fill-0, #FF4ACC)" id="Vector" />
      </Wrapper>
    </div>
  );
}
type Text3Props = {
  text: string;
};

function Text3({ text }: Text3Props) {
  return (
    <div className="content-stretch flex gap-[4px] items-start relative shrink-0">
      <CheckCircle24Dp000000Fill1Wght400Grad0Opsz />
      <p className="font-['Pretendard:Medium',sans-serif] leading-[1.6] not-italic relative shrink-0 text-[14px] text-black whitespace-nowrap">{text}</p>
    </div>
  );
}

function CheckCircle24Dp000000Fill1Wght400Grad0Opsz() {
  return (
    <Wrapper additionalClassNames="relative shrink-0">
      <path d={svgPaths.p37dae7f0} fill="var(--fill-0, #2EA995)" id="Vector" />
    </Wrapper>
  );
}
type Helper1Props = {
  text: string;
  text1: string;
  additionalClassNames?: string;
};

function Helper1({ text, text1, additionalClassNames = "" }: Helper1Props) {
  return (
    <div className={clsx("absolute bg-[#f9fafb] left-[24px] not-italic overflow-clip rounded-[20px] text-black w-[828px]", additionalClassNames)}>
      <p className="absolute font-['Pretendard:Bold',sans-serif] leading-[1.3] left-[24px] text-[16px] top-[20px] whitespace-nowrap">{text}</p>
      <ul className="absolute block font-['Pretendard:Medium',sans-serif] leading-[0] left-[calc(50%-390px)] text-[14px] top-[49px] w-[774px]">
        <li className="list-disc ms-[21px]">
          <span className="leading-[1.6]">{text1}</span>
        </li>
      </ul>
    </div>
  );
}
type Text2Props = {
  text: string;
};

function Text2({ text }: Text2Props) {
  return (
    <div className="content-stretch flex h-[80px] items-center justify-center py-[10px] relative shrink-0">
      <p className="font-['Pretendard:Regular',sans-serif] leading-[1.3] not-italic relative shrink-0 text-[#9ca3af] text-[20px] whitespace-nowrap">{text}</p>
    </div>
  );
}
type Text1Props = {
  text: string;
};

function Text1({ text }: Text1Props) {
  return (
    <div className="bg-[#f3f4f6] content-stretch flex items-center justify-center px-[10px] py-[2px] relative rounded-[999px] shrink-0">
      <p className="font-['Pretendard:Medium',sans-serif] leading-[1.3] not-italic relative shrink-0 text-[#6b7280] text-[12px] whitespace-nowrap">{text}</p>
    </div>
  );
}
type TextProps = {
  text: string;
};

function Text({ text }: TextProps) {
  return (
    <div className="content-stretch flex gap-[4px] items-center relative shrink-0">
      <Helper />
      <p className="font-['Pretendard:SemiBold',sans-serif] leading-[1.3] not-italic relative shrink-0 text-[16px] text-black whitespace-nowrap">{text}</p>
    </div>
  );
}

function Helper() {
  return (
    <div className="content-stretch flex items-center relative shrink-0">
      <Star24Dp000000Fill1Wght400Grad0Opsz />
      <Star24Dp000000Fill1Wght400Grad0Opsz />
      <Star24Dp000000Fill1Wght400Grad0Opsz />
      <Star24Dp000000Fill1Wght400Grad0Opsz />
      <Star24Dp000000Fill1Wght400Grad0Opsz />
    </div>
  );
}

function Star24Dp000000Fill1Wght400Grad0Opsz() {
  return (
    <Wrapper1 additionalClassNames="relative shrink-0">
      <g id="star_24dp_000000_FILL1_wght400_GRAD0_opsz24 1">
        <path d={svgPaths.p1bf65e00} fill="var(--fill-0, #FFC32C)" id="Vector" />
      </g>
    </Wrapper1>
  );
}

export default function Detail() {
  return (
    <div className="bg-white relative size-full" data-name="Detail">
      <div className="absolute bg-white border-[#e5e7eb] border-b border-solid h-[2920px] left-0 overflow-clip top-[572px] w-[876px]">
        <div className="absolute border-[#e5e7eb] border-b border-solid h-[80px] left-0 top-0 w-[876px]" />
        <div className="absolute bg-[#f9fafb] h-[262px] left-[24px] overflow-clip rounded-[30px] top-[151px] w-[828px]">
          <div className="absolute bg-white border border-[#e5e7eb] border-solid left-[8px] overflow-clip rounded-[10px] size-[40px] top-[110px]">
            <Wrapper2 additionalClassNames="left-[7px] top-[7px]">
              <g id="chevron_left_24dp_000000_FILL0_wght400_GRAD0_opsz24 1">
                <path d={svgPaths.pc87b500} fill="var(--fill-0, black)" id="Vector" />
              </g>
            </Wrapper2>
          </div>
          <div className="absolute content-stretch flex gap-[12px] items-center left-[60px] top-[12px]">
            <Wrapper4>
              <p className="absolute font-['Pretendard:Medium',sans-serif] leading-[1.3] left-[24px] not-italic text-[14px] text-black top-[24px] whitespace-nowrap">newzest01</p>
              <div className="absolute font-['Pretendard:Regular',sans-serif] leading-[1.6] left-[24px] not-italic text-[14px] text-black top-[81px] w-[301px]">
                <p className="mb-0">동해물과 백두산이 마르고 닳도록 하느님이 보우하사 우리 나라 만세. 무궁화 삼천리 화려 강산 대한사람 대한으로 길이 보전하세. 남산 위에 저 소나무 철갑을 두른 듯 바람 서리 불변함은 우리 기상일세.</p>
                <p>무궁화 삼천리 화려 강산 대한사람 대한으로 길이 보전하세. 가을하늘 공활한데 높고 구름 없이 밝은 달은 우...</p>
              </div>
              <div className="absolute content-stretch flex gap-[8px] items-center left-[24px] top-[48px]">
                <Text text="5.0" />
                <Text1 text="100% 수강 후 작성" />
              </div>
            </Wrapper4>
            <Wrapper4>
              <p className="absolute font-['Pretendard:Medium',sans-serif] leading-[1.3] left-[24px] not-italic text-[14px] text-black top-[24px] whitespace-nowrap">newzest01</p>
              <div className="absolute font-['Pretendard:Regular',sans-serif] leading-[1.6] left-[24px] not-italic text-[14px] text-black top-[81px] w-[301px]">
                <p className="mb-0">동해물과 백두산이 마르고 닳도록 하느님이 보우하사 우리 나라 만세. 무궁화 삼천리 화려 강산 대한사람 대한으로 길이 보전하세. 남산 위에 저 소나무 철갑을 두른 듯 바람 서리 불변함은 우리 기상일세.</p>
                <p>무궁화 삼천리 화려 강산 대한사람 대한으로 길이 보전하세. 가을하늘 공활한데 높고 구름 없이 밝은 달은 우...</p>
              </div>
              <div className="absolute content-stretch flex gap-[8px] items-center left-[24px] top-[48px]">
                <Text text="5.0" />
                <Text1 text="100% 수강 후 작성" />
              </div>
            </Wrapper4>
            <Wrapper4 additionalClassNames="opacity-20">
              <p className="absolute font-['Pretendard:Medium',sans-serif] leading-[1.3] left-[24px] not-italic text-[14px] text-black top-[24px] whitespace-nowrap">newzest01</p>
              <div className="absolute font-['Pretendard:Regular',sans-serif] leading-[1.6] left-[24px] not-italic text-[14px] text-black top-[81px] w-[301px]">
                <p className="mb-0">동해물과 백두산이 마르고 닳도록 하느님이 보우하사 우리 나라 만세. 무궁화 삼천리 화려 강산 대한사람 대한으로 길이 보전하세. 남산 위에 저 소나무 철갑을 두른 듯 바람 서리 불변함은 우리 기상일세.</p>
                <p>무궁화 삼천리 화려 강산 대한사람 대한으로 길이 보전하세. 가을하늘 공활한데 높고 구름 없이 밝은 달은 우...</p>
              </div>
              <div className="absolute content-stretch flex gap-[8px] items-center left-[24px] top-[48px]">
                <Text text="5.0" />
                <Text1 text="100% 수강 후 작성" />
              </div>
            </Wrapper4>
          </div>
          <div className="absolute bg-white border border-[#e5e7eb] border-solid left-[780px] overflow-clip rounded-[10px] size-[40px] top-[110px]">
            <Wrapper2 additionalClassNames="left-[7px] top-[7px]">
              <g id="chevron_right_24dp_000000_FILL0_wght400_GRAD0_opsz24 (1) 1">
                <path d={svgPaths.pa1eb970} fill="var(--fill-0, black)" id="Vector" />
              </g>
            </Wrapper2>
          </div>
        </div>
        <div className="absolute content-stretch flex gap-[40px] h-[80px] items-center left-[24px] top-0">
          <div className="content-stretch flex h-[80px] items-center justify-center py-[10px] relative shrink-0">
            <div aria-hidden="true" className="absolute border-[#2ea995] border-b-2 border-solid inset-0 pointer-events-none" />
            <p className="font-['Pretendard:Bold',sans-serif] leading-[1.3] not-italic relative shrink-0 text-[#2ea995] text-[18px] whitespace-nowrap">강의 소개</p>
          </div>
          <Text2 text="커리큘럼" />
          <Text2 text="수강평" />
          <div className="content-stretch flex h-[80px] items-center justify-center py-[10px] relative shrink-0">
            <div className="flex flex-col font-['Pretendard:Regular',sans-serif] justify-center leading-[0] not-italic relative shrink-0 text-[#9ca3af] text-[20px] whitespace-nowrap">
              <p className="leading-[1.3]">자주하는 질문</p>
            </div>
          </div>
        </div>
        <p className="absolute font-['Pretendard:Bold',sans-serif] leading-[1.3] left-[24px] not-italic text-[24px] text-black top-[104px] whitespace-nowrap">먼저 경험한 수강생들 후기</p>
        <p className="absolute font-['Pretendard:Bold',sans-serif] leading-[1.3] left-[24px] not-italic text-[24px] text-black top-[453px] whitespace-nowrap">강의 소개</p>
        <div className="absolute bg-white h-[2542px] left-0 overflow-clip top-[500px] w-[876px]">
          <p className="absolute font-['Pretendard:SemiBold',sans-serif] leading-[1.3] left-[24px] not-italic text-[20px] text-black top-[40px] whitespace-nowrap">실전력을 극대화하는 SRDMS만의 핵심 포인트</p>
          <p className="absolute font-['Pretendard:SemiBold',sans-serif] leading-[1.3] left-[24px] not-italic text-[20px] text-black top-[520px] whitespace-nowrap">12주 후, 당신의 초음파 전문성은 이렇게 달라집니다</p>
          <p className="absolute font-['Pretendard:SemiBold',sans-serif] leading-[1.3] left-[24px] not-italic text-[20px] text-black top-[932px] whitespace-nowrap">이런 고민을 가진 분들께 강력히 추천합니다</p>
          <p className="absolute font-['Pretendard:SemiBold',sans-serif] leading-[1.3] left-[24px] not-italic text-[20px] text-black top-[1275px] whitespace-nowrap">학습 효과를 높이기 위한 수강 전 체크리스트</p>
          <p className="absolute font-['Pretendard:SemiBold',sans-serif] leading-[1.3] left-[24px] not-italic text-[20px] text-black top-[1771px] whitespace-nowrap">기초부터 심화까지, 12주 마스터 로드맵</p>
          <p className="absolute font-['Pretendard:SemiBold',sans-serif] leading-[1.3] left-[24px] not-italic text-[#9ca3af] text-[18px] top-[74px] whitespace-nowrap">이론을 넘어 진단적 사고력을 키우는 3가지 차별점</p>
          <p className="absolute font-['Pretendard:SemiBold',sans-serif] leading-[1.3] left-[24px] not-italic text-[#9ca3af] text-[18px] top-[554px] whitespace-nowrap">자신감 있는 스캔부터 완벽한 결과지 작성까지의 변화</p>
          <p className="absolute font-['Pretendard:SemiBold',sans-serif] leading-[1.3] left-[24px] not-italic text-[#9ca3af] text-[18px] top-[966px] whitespace-nowrap">초음파 입문자부터 판독의 확신이 필요한 숙련자까지</p>
          <p className="absolute font-['Pretendard:SemiBold',sans-serif] leading-[1.3] left-[24px] not-italic text-[#9ca3af] text-[18px] top-[1309px] whitespace-nowrap">원활한 학습을 위해 꼭 확인해야 할 유의사항</p>
          <p className="absolute font-['Pretendard:SemiBold',sans-serif] leading-[1.3] left-[24px] not-italic text-[#9ca3af] text-[18px] top-[1805px] whitespace-nowrap">해부학적 기초와 실전 병리학을 잇는 체계적인 교육 단계</p>
          <Helper1 text="4+4 하이브리드 학습 체계" text1="기초 과정의 4대 요소(해부학, 스캔 기술, 정상 소견, 변이)와 심화 과정의 4대 요소(병리학, 표준 영상, 감별 진단, 결과지 작성)를 결합하여 빈틈없는 실력을 구축합니다." additionalClassNames="h-[113px] top-[121px]" />
          <div className="absolute bg-white border border-[#e5e7eb] border-solid h-[182px] left-[24px] overflow-clip rounded-[20px] top-[1013px] w-[828px]">
            <div className="absolute font-['Pretendard:Bold',sans-serif] leading-[1.3] left-[68px] not-italic text-[16px] text-black top-[102px] whitespace-nowrap">
              <p className="mb-0">강의 대상은</p>
              <p>누구인가요?</p>
            </div>
            <div className="absolute content-stretch flex flex-col gap-[8px] items-start left-[223px] top-[23px] w-[557px]">
              <Text3 text="초음파 입문 의료진: 기초 해부학부터 장비 사용법까지 체계적으로 배우고 싶은 분" />
              <Text3 text="실전 진단에 확신이 필요한 분: 병변 포착과 감별 진단, 결과지 작성에 어려움을 겪는 숙련자" />
              <div className="content-stretch flex gap-[4px] items-start relative shrink-0 w-full">
                <CheckCircle24Dp000000Fill1Wght400Grad0Opsz />
                <p className="font-['Pretendard:Medium',sans-serif] leading-[1.6] not-italic relative shrink-0 text-[14px] text-black w-[533px]">검사 영역을 확장하고 싶은 분: 상복부 위주에서 비뇨기계, 갑상선까지 폭넓은 진단 역량을 갖추고 싶은 분</p>
              </div>
              <Text3 text="독학의 한계를 느끼는 분: 파편화된 지식을 하나의 계통으로 정리하고 싶은 분" />
            </div>
            <div className="absolute left-[79px] size-[55px] top-[35px]">
              <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 55 55">
                <circle cx="27.5" cy="27.5" fill="var(--fill-0, #D9D9D9)" id="Ellipse 8" r="27.5" />
              </svg>
            </div>
          </div>
          <div className="absolute bg-white border border-[#e5e7eb] border-solid h-[168px] left-[24px] overflow-clip rounded-[20px] top-[1852px] w-[828px]">
            <div className="absolute bg-[#f9fafb] border border-[#e5e7eb] border-solid h-[50px] left-[-1px] overflow-clip top-[-1px] w-[828px]">
              <div className="-translate-x-1/2 absolute content-stretch flex gap-[4px] items-center left-1/2 top-[11px]">
                <Wrapper3 additionalClassNames="relative shrink-0 size-[24px]">
                  <g id="footprint_24dp_000000_FILL1_wght400_GRAD0_opsz24 1">
                    <path d={svgPaths.p2c931d00} fill="var(--fill-0, #96A5E7)" id="Vector" />
                  </g>
                </Wrapper3>
                <p className="font-['Pretendard:Bold',sans-serif] leading-[1.6] not-italic relative shrink-0 text-[16px] text-black whitespace-nowrap">STEP 1. 기초 다지기 (1~4주)표준 스캔 및 정상 소견 마스터</p>
              </div>
            </div>
            <div className="absolute font-['Pretendard:Medium',sans-serif] leading-[1.6] left-[calc(50%-150px)] not-italic text-[16px] text-black top-[69px] whitespace-nowrap">
              <p className="mb-0">• 초음파 물리 및 장비 조절(Knobology) 최적화</p>
              <p className="mb-0">• 상복부·비뇨기계·갑상선 해부학적 구조 이해</p>
              <p>• 장기별 표준 단면(Standard View) 확보 기술</p>
            </div>
          </div>
          <div className="absolute bg-white border border-[#e5e7eb] border-solid h-[168px] left-[24px] overflow-clip rounded-[20px] top-[2032px] w-[828px]">
            <div className="absolute bg-[#f9fafb] border border-[#e5e7eb] border-solid h-[50px] left-[-1px] overflow-clip top-[-1px] w-[828px]">
              <div className="-translate-x-1/2 absolute content-stretch flex gap-[4px] items-center left-1/2 top-[11px]">
                <Wrapper3 additionalClassNames="relative shrink-0 size-[24px]">
                  <g id="footprint_24dp_000000_FILL1_wght400_GRAD0_opsz24 2">
                    <path d={svgPaths.p2c931d00} fill="var(--fill-0, #435DD1)" id="Vector" />
                  </g>
                </Wrapper3>
                <p className="font-['Pretendard:Bold',sans-serif] leading-[1.6] not-italic relative shrink-0 text-[16px] text-black whitespace-nowrap">STEP 2. 심화 분석 (5~10주)병리학적 판독 및 감별 진단</p>
              </div>
            </div>
            <div className="absolute font-['Pretendard:Medium',sans-serif] leading-[1.6] left-[calc(50%-153px)] not-italic text-[16px] text-black top-[69px] whitespace-nowrap">
              <p className="mb-0">• 주요 장기별 병변 포착 및 양성·악성 감별 포인트</p>
              <p className="mb-0">• 임상 케이스별 영상 특징 분석 및 판독 루틴 구축</p>
              <p>• 놓치기 쉬운 비정상 소견 및 정상 변이 대조 학습</p>
            </div>
          </div>
          <div className="absolute bg-white border border-[#e5e7eb] border-solid h-[168px] left-[24px] overflow-clip rounded-[20px] top-[2212px] w-[828px]">
            <div className="absolute bg-[#f9fafb] border border-[#e5e7eb] border-solid h-[50px] left-[-1px] overflow-clip top-[-1px] w-[828px]">
              <div className="-translate-x-1/2 absolute content-stretch flex gap-[4px] items-center left-1/2 top-[11px]">
                <Wrapper3 additionalClassNames="relative shrink-0 size-[24px]">
                  <g id="footprint_24dp_000000_FILL1_wght400_GRAD0_opsz24 3">
                    <path d={svgPaths.p2c931d00} fill="var(--fill-0, #203490)" id="Vector" />
                  </g>
                </Wrapper3>
                <p className="font-['Pretendard:Bold',sans-serif] leading-[1.6] not-italic relative shrink-0 text-[16px] text-black whitespace-nowrap">STEP 3. 실무 완성 (11~12주)결과지 작성 및 실전 프로세스</p>
              </div>
            </div>
            <div className="absolute font-['Pretendard:Medium',sans-serif] leading-[1.6] left-[calc(50%-184px)] not-italic text-[16px] text-black top-[69px] whitespace-nowrap">
              <p className="mb-0">• 표준 의학 용어를 활용한 정교한 결과지(Reporting) 작성</p>
              <p className="mb-0">• 실제 임상 환경을 가정한 종합 진단 시뮬레이션</p>
              <p>• 전문가 수준의 최종 진단 도출 및 학습 내용 통합</p>
            </div>
          </div>
          <Helper2 text="기본적인 해부학 용어에 대한 이해가 있다면 학습 효과가 더욱 극대화됩니다." text1="선수 지식" additionalClassNames="left-[24px] top-[1356px]" />
          <Helper2 text="UHD 고화질 영상으로 제작되어 대화면 모니터에서 더욱 선명한 초음파 영상을 확인하실 수 있습니다." text1="최적화 환경" additionalClassNames="left-[24px] top-[1529px]" />
          <Helper2 text="주차별 강의 PDF 교안과 실전 결과지 템플릿이 자료실을 통해 제공됩니다." text1="학습 자료" additionalClassNames="left-[444px] top-[1356px]" />
          <Helper2 text="전체 강의의 80% 이상 수강 시 공식 수료증이 발급됩니다." text1="수료 기준" additionalClassNames="left-[444px] top-[1529px]" />
          <ul className="absolute block font-['Pretendard:Medium',sans-serif] leading-[0] left-[calc(50%-414px)] not-italic text-[14px] text-black top-[630px] w-[480px]">
            <li className="list-disc ms-[21px]">
              <span className="leading-[1.6]">장비 조절(Knobology) 최적화와 장기별 표준 단면 확보 기술을 통해 어떤 환자 앞에서도 당황하지 않는 자신감을 얻게 됩니다.</span>
            </li>
          </ul>
          <ul className="absolute block font-['Pretendard:Medium',sans-serif] leading-[0] left-[calc(50%-414px)] not-italic text-[14px] text-black top-[719px] w-[480px]">
            <li className="list-disc ms-[21px]">
              <span className="leading-[1.6]">정상 변이와 실제 병변을 명확히 구분하고, 양성/악성 종양의 결정적 차이를 판별하는 안목이 생깁니다.</span>
            </li>
          </ul>
          <ul className="absolute block font-['Pretendard:Medium',sans-serif] leading-[0] left-[calc(50%-414px)] not-italic text-[14px] text-black top-[808px] w-[480px]">
            <li className="list-disc ms-[21px]">
              <span className="leading-[1.6]">12주 완주 후 발급되는 공식 수료증과 함께, 결과지 작성 능력을 갖춘 숙련된 전문가로 거듭납니다.</span>
            </li>
          </ul>
          <Helper1 text="12주 완성 올인원 로드맵" text1="상복부, 비뇨기계, 갑상선 등 전 장기를 아우르며 입문자도 전문가 수준으로 성장할 수 있는 체계적인 단계를 제안합니다." additionalClassNames="h-[91px] top-[246px]" />
          <Helper1 text="실전 결과지(Reporting) 가이드" text1="병변을 찾는 것을 넘어, 실제 임상 용어를 활용해 표준화된 보고서를 작성하는 노하우를 전수합니다." additionalClassNames="h-[91px] top-[349px]" />
          <div className="absolute bg-[#d9d9d9] h-[238px] left-[532px] top-[601px] w-[320px]" />
          <Text4 text="스캔 자신감 확보" additionalClassNames="top-[601px]" />
          <Text4 text="정교한 판독 역량" additionalClassNames="top-[690px]" />
          <Text4 text="커리어 전문성 강화" additionalClassNames="top-[779px]" />
          <Frame157Helper additionalClassNames="top-[480px]" />
          <Frame157Helper additionalClassNames="top-px" />
          <Frame157Helper additionalClassNames="top-[892px]" />
          <Frame157Helper additionalClassNames="top-[1235px]" />
          <Frame157Helper additionalClassNames="top-[1731px]" />
        </div>
      </div>
      <div className="absolute bg-white border-[#e5e7eb] border-b border-solid h-[1932px] left-0 overflow-clip top-[3492px] w-[876px]">
        <div className="absolute bottom-[39px] contents left-[24px]">
          <p className="absolute bottom-[1887px] font-['Pretendard:Bold',sans-serif] leading-[1.3] left-[24px] not-italic text-[24px] text-black translate-y-full whitespace-nowrap">커리큘럼</p>
          <div className="absolute bg-[#f9fafb] border border-[#e5e7eb] border-solid bottom-[1542px] h-[50px] left-[24px] overflow-clip rounded-[20px] w-[824px]">
            <StatMinus124Dp000000Fill1Wght400Grad0Opsz additionalClassNames="left-[788px] top-[calc(50%-1px)]" />
            <Text5 text="Liver anatomy (Liver segment 분류)" />
          </div>
          <div className="absolute bg-[#f9fafb] border border-[#e5e7eb] border-solid bottom-[1480px] h-[50px] left-[24px] overflow-clip rounded-[20px] w-[824px]">
            <StatMinus124Dp000000Fill1Wght400Grad0Opsz additionalClassNames="left-[788px] top-[calc(50%-1px)]" />
            <Wrapper5>{`GB & Biliary tract`}</Wrapper5>
          </div>
          <div className="absolute bg-[#f9fafb] border border-[#e5e7eb] border-solid bottom-[1418px] h-[50px] left-[24px] overflow-clip rounded-[20px] w-[824px]">
            <StatMinus124Dp000000Fill1Wght400Grad0Opsz additionalClassNames="left-[788px] top-[calc(50%-1px)]" />
            <Text6 text="pancreas, spleen anatomy" />
          </div>
          <div className="absolute bg-[#f9fafb] border border-[#e5e7eb] border-solid bottom-[1356px] h-[50px] left-[24px] overflow-clip rounded-[20px] w-[824px]">
            <StatMinus124Dp000000Fill1Wght400Grad0Opsz additionalClassNames="left-[788px] top-[calc(50%-1px)]" />
            <Text7 text="urinary tract anatomy" />
          </div>
          <div className="absolute bg-[#f9fafb] border border-[#e5e7eb] border-solid bottom-[1294px] h-[50px] left-[24px] overflow-clip rounded-[20px] w-[824px]">
            <StatMinus124Dp000000Fill1Wght400Grad0Opsz additionalClassNames="left-[788px] top-[calc(50%-1px)]" />
            <Text8 text="thyroid / parathyroid gland" />
          </div>
          <div className="absolute bg-[#f9fafb] bottom-[1118px] h-[164px] left-[24px] overflow-clip rounded-[30px] w-[824px]">
            <ul className="absolute block font-['Pretendard:Medium',sans-serif] leading-[0] left-[24px] list-disc not-italic text-[#9ca3af] text-[16px] top-[30px] whitespace-nowrap">
              <li className="mb-0 ms-[24px]">
                <span className="leading-[1.6]">생리 해부학 (Physiology and Anatomy</span>
              </li>
              <li className="mb-0 ms-[24px]">
                <span className="leading-[1.6]">스캔 기술 (Scan Techniques)</span>
              </li>
              <li className="mb-0 ms-[24px]">
                <span className="leading-[1.6]">정상 초음파 소견 (Normal Ultrasound Findings)</span>
              </li>
              <li className="ms-[24px]">
                <span className="leading-[1.6]">정상 변이 (normal variation)</span>
              </li>
            </ul>
          </div>
          <div className="absolute bg-[#f9fafb] bottom-[40px] h-[164px] left-[24px] overflow-clip rounded-[30px] w-[824px]">
            <ol className="absolute block font-['Pretendard:Medium',sans-serif] leading-[0] left-[24px] not-italic text-[#9ca3af] text-[16px] top-[30px] whitespace-nowrap" start="1">
              <li className="mb-0 ms-[24px]">
                <span className="leading-[1.6]">병리학(Pathology): 질환별 발생 기전과 그에 따른 초음파적 특징(Echogenicity, Margin 등) 심층 분석</span>
              </li>
              <li className="mb-0 ms-[24px]">
                <span className="leading-[1.6]">표준 영상(Standard Images): 오진을 줄이는 표준 스캔 단면과 병변 노출 최적화 기법</span>
              </li>
              <li className="mb-0 ms-[24px]">
                <span className="leading-[1.6]">감별 진단(Differential Diagnosis): 유사한 에코를 가진 양성/악성 병변의 결정적 차이점 비교</span>
              </li>
              <li className="ms-[24px]">
                <span className="leading-[1.6]">결과지 작성(Reporting): 실제 임상에서 사용하는 용어를 활용한 표준 결과지 작성 실습</span>
              </li>
            </ol>
          </div>
          <Text9 text="Basic-6주" additionalClassNames="bottom-[1814px]" />
          <Text9 text="Advance-6주" additionalClassNames="bottom-[1052px]" />
          <div className="absolute bg-white border border-[#e5e7eb] border-solid bottom-[1604px] h-[198px] left-[24px] overflow-clip rounded-[20px] w-[824px]">
            <ol className="absolute block font-['Pretendard:Medium',sans-serif] leading-[0] left-[23px] not-italic text-[#9ca3af] text-[16px] top-[59px] whitespace-nowrap" start="1">
              <li className="ms-[24px]">
                <span className="leading-[1.6]">physics</span>
              </li>
            </ol>
            <ol className="absolute block font-['Pretendard:Medium',sans-serif] leading-[0] left-[23px] not-italic text-[#9ca3af] text-[16px] top-[133px] whitespace-nowrap" start="2">
              <li className="ms-[24px]">
                <span className="leading-[1.6]">Vascular</span>
              </li>
            </ol>
            <p className="-translate-x-full absolute font-['Pretendard:Medium',sans-serif] leading-[1.6] left-[799px] not-italic text-[#9ca3af] text-[16px] text-right top-[59px] whitespace-nowrap">52분</p>
            <div className="absolute bg-[#f9fafb] border border-[#e5e7eb] border-solid h-[50px] left-[-1px] overflow-clip rounded-tl-[20px] rounded-tr-[20px] top-[-1px] w-[828px]">
              <Text10 text="장비 control, vessel anatomy" />
              <Stat124Dp000000Fill1Wght400Grad0Opsz additionalClassNames="inset-[calc(24%-0.52px)_calc(1.33%-0.97px)_calc(28%-0.44px)_calc(95.75%+0.92px)]" />
            </div>
            <div className="-translate-x-1/2 absolute h-0 left-1/2 top-[121px] w-[776px]">
              <div className="absolute inset-[-1px_0_0_0]">
                <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 776 1">
                  <line id="Line 4" stroke="var(--stroke-0, #E5E7EB)" x2="776" y1="0.5" y2="0.5" />
                </svg>
              </div>
            </div>
            <p className="-translate-x-full absolute font-['Pretendard:Medium',sans-serif] leading-[1.6] left-[799px] not-italic text-[#9ca3af] text-[16px] text-right top-[133px] whitespace-nowrap">44분</p>
            <Helper4 text="초음파 발생 원리 및 인공물(Artifact)의 이해" text1="영상 질 개선을 위한 Knobology 실습 (Gain, Focus, Dynamic Range 등)" additionalClassNames="left-[170px] top-[57px] w-[555px]" />
            <Helper4 text="[해부학] Aorta, IVC, Portal vein의 주행과 해부학적 관계" text1="[스캔] 복부 혈관 표준 단면도 확보 기술 및 도플러 기초" additionalClassNames="left-[170px] top-[133px] w-[555px]" />
          </div>
          <div className="absolute bg-white border border-[#e5e7eb] border-solid bottom-[732px] h-[148px] left-[24px] overflow-clip rounded-[20px] w-[824px]">
            <p className="-translate-x-full absolute font-['Pretendard:Medium',sans-serif] leading-[1.6] left-[799px] not-italic text-[#9ca3af] text-[16px] text-right top-[59px] whitespace-nowrap">120분</p>
            <div className="absolute bg-[#f9fafb] border border-[#e5e7eb] border-solid h-[50px] left-[-1px] overflow-clip rounded-tl-[20px] rounded-tr-[20px] top-[-1px] w-[828px]">
              <Text5 text="Liver" />
              <Stat124Dp000000Fill1Wght400Grad0Opsz additionalClassNames="inset-[calc(24%-0.52px)_calc(1.33%-0.97px)_calc(28%-0.44px)_calc(95.75%+0.92px)]" />
            </div>
            <Helper5 text="간 낭종/다낭성 간질환, 간 농양(Abscess): 양성 vs 악성 종양의 에코 패턴 감별" text1="간염(Hepatitis), 지방간(Fatty Liver), 간경변(Cirrhosis): 간 실질 거칠기(Coarseness) 등급 분류" text2="혈관종, 간세포선종, FNH, 간암(HCC), 전이성 간암" />
          </div>
          <div className="absolute bg-white border border-[#e5e7eb] border-solid bottom-[572px] h-[148px] left-[24px] overflow-clip rounded-[20px] w-[824px]">
            <p className="-translate-x-full absolute font-['Pretendard:Medium',sans-serif] leading-[1.6] left-[798px] not-italic text-[#9ca3af] text-[16px] text-right top-[59px] whitespace-nowrap">100분</p>
            <div className="absolute bg-[#f9fafb] border border-[#e5e7eb] border-solid h-[50px] left-[-1px] overflow-clip rounded-tl-[20px] rounded-tr-[20px] top-[-1px] w-[828px]">
              <Wrapper5>Biliary system</Wrapper5>
              <Stat124Dp000000Fill1Wght400Grad0Opsz additionalClassNames="inset-[calc(24%-0.52px)_calc(1.33%-0.97px)_calc(28%-0.44px)_calc(95.75%+0.92px)]" />
            </div>
            <Helper5 text="담석/담도결석, 담낭 슬러지 및 용종(Polyp): 담낭벽 두께 측정 및 Murphy’s sign 확인" text1="담낭선근종증, 도자기 담낭(Porcelain GB): 담도 확장 부위별 원인 감별 기술" text2="급/만성 담낭염, 담관염, 미리지 증후군, Klatskin 종양" />
          </div>
          <div className="absolute bg-white border border-[#e5e7eb] border-solid bottom-[412px] h-[148px] left-[24px] overflow-clip rounded-[20px] w-[824px]">
            <p className="-translate-x-full absolute font-['Pretendard:Medium',sans-serif] leading-[1.6] left-[799px] not-italic text-[#9ca3af] text-[16px] text-right top-[59px] whitespace-nowrap">90분</p>
            <div className="absolute bg-[#f9fafb] border border-[#e5e7eb] border-solid h-[50px] left-[-1px] overflow-clip rounded-tl-[20px] rounded-tr-[20px] top-[-1px] w-[828px]">
              <Text6 text="Pancreas" />
              <Stat124Dp000000Fill1Wght400Grad0Opsz additionalClassNames="inset-[calc(24%-0.52px)_calc(1.33%-0.97px)_calc(28%-0.44px)_calc(95.75%+0.92px)]" />
            </div>
            <Helper5 text="급/만성 췌장염 및 췌장 농양, 가성낭종(Pseudocyst): 췌관(Duct) 확장 및 췌장 실질 위축 판독" text1="VHL 증후군/다낭성 질환 관련 낭종: 가스에 가려진 병변 포착 기술" text2="Islet cell tumor, 선암(Adenocarcinoma) 등 종양" />
          </div>
          <div className="absolute bg-white border border-[#e5e7eb] border-solid bottom-[278px] h-[122px] left-[24px] overflow-clip rounded-[20px] w-[824px]">
            <p className="-translate-x-full absolute font-['Pretendard:Medium',sans-serif] leading-[1.6] left-[799px] not-italic text-[#9ca3af] text-[16px] text-right top-[59px] whitespace-nowrap">80분</p>
            <div className="absolute bg-[#f9fafb] border border-[#e5e7eb] border-solid h-[50px] left-[-1px] overflow-clip rounded-tl-[20px] rounded-tr-[20px] top-[-1px] w-[828px]">
              <Text7 text="Spleen" />
              <Stat124Dp000000Fill1Wght400Grad0Opsz additionalClassNames="inset-[calc(24%-0.52px)_calc(1.33%-0.97px)_calc(28%-0.44px)_calc(95.75%+0.92px)]" />
            </div>
            <Helper4 text="비종대(Splenomegaly) 및 비장 내 낭종/농양: 비장 지수(Spleen Index) 정밀 측정" text1="비장 석회화(Calcifications) 및 칸디다증(Candidiasis): 부비장(Accessory spleen)과의 감별 진단" additionalClassNames="left-[23px] top-[57px] w-[700px]" />
          </div>
          <div className="absolute bg-white border border-[#e5e7eb] border-solid bottom-[892px] h-[148px] left-[24px] overflow-clip rounded-[20px] w-[824px]">
            <p className="-translate-x-full absolute font-['Pretendard:Medium',sans-serif] leading-[1.6] left-[799px] not-italic text-[#9ca3af] text-[16px] text-right top-[59px] whitespace-nowrap">90분</p>
            <div className="absolute bg-[#f9fafb] border border-[#e5e7eb] border-solid h-[50px] left-[-1px] overflow-clip rounded-tl-[20px] rounded-tr-[20px] top-[-1px] w-[828px]">
              <Text10 text="Vessel" />
              <Stat124Dp000000Fill1Wght400Grad0Opsz additionalClassNames="inset-[calc(24%-0.52px)_calc(1.33%-0.97px)_calc(28%-0.44px)_calc(95.75%+0.92px)]" />
            </div>
            <Helper5 text="복부 대동맥류(Aorta aneurysm) 및 IVC 혈전/확장증: 혈관벽 측정 및 도플러 신호 분석법" text1="후복막 섬유화증(Retroperitoneal fibrosis): 협착 및 폐쇄 유무 판독" text2="버드-키아리 증후군(Budd-chiari syndrome)" />
          </div>
          <div className="absolute bg-[#f9fafb] border border-[#e5e7eb] border-solid bottom-[216px] h-[50px] left-[24px] overflow-clip rounded-[20px] w-[824px]">
            <StatMinus124Dp000000Fill1Wght400Grad0Opsz additionalClassNames="left-[788px] top-[calc(50%-1px)]" />
            <Text8 text="Thyroid" />
          </div>
        </div>
      </div>
      <div className="absolute bg-white border-[#e5e7eb] border-b border-solid h-[1585px] left-0 overflow-clip top-[5424px] w-[876px]">
        <div className="absolute bottom-[39px] contents left-[24px]">
          <p className="absolute bottom-[1534px] font-['Pretendard:Bold',sans-serif] leading-[1.3] left-[24px] not-italic text-[24px] text-black translate-y-full whitespace-nowrap">수강평</p>
          <div className="absolute bg-white border border-[#e2e2e2] border-solid bottom-[1384px] h-[36px] left-[682px] overflow-clip rounded-[10px] w-[170px]">
            <p className="absolute font-['Pretendard:Medium',sans-serif] leading-[1.3] left-[15px] not-italic opacity-50 text-[16px] text-black top-[7px] whitespace-nowrap">추천순</p>
            <StatMinus124Dp000000Fill1Wght400Grad0Opsz additionalClassNames="left-[129px] top-1/2" />
          </div>
          <div className="-translate-x-1/2 absolute bottom-[1444px] content-stretch flex gap-[8px] items-center left-[calc(50%+0.5px)]">
            <div className="content-stretch flex h-[24px] items-center relative shrink-0">
              <div className="relative shrink-0 size-[32px]" data-name="star_24dp_000000_FILL1_wght400_GRAD0_opsz24 1">
                <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 32 32">
                  <g id="star_24dp_000000_FILL1_wght400_GRAD0_opsz24 1">
                    <path d={svgPaths.p5cde200} fill="var(--fill-0, #FFC32C)" id="Vector" />
                  </g>
                </svg>
              </div>
            </div>
            <p className="font-['Pretendard:Bold',sans-serif] leading-[1.3] not-italic relative shrink-0 text-[32px] text-black whitespace-nowrap">5.0</p>
            <p className="font-['Pretendard:Regular',sans-serif] leading-[1.3] not-italic relative shrink-0 text-[#9ca3af] text-[32px] whitespace-nowrap">(9,999)</p>
          </div>
          <p className="absolute bottom-[1415px] font-['Pretendard:SemiBold',sans-serif] leading-[1.3] left-[24px] not-italic text-[20px] text-black translate-y-full whitespace-nowrap">전체 수강평</p>
          <div className="absolute bottom-[40px] content-stretch flex flex-col gap-[20px] items-start left-[24px] w-[828px]">
            <div className="content-stretch flex flex-col items-start relative shrink-0 w-full">
              <Wrapper6 additionalClassNames="h-[471px]">
                <p className="absolute font-['Pretendard:SemiBold',sans-serif] leading-[1.3] left-0 not-italic text-[14px] text-black top-[24px] whitespace-nowrap">newzest01</p>
                <p className="-translate-x-full absolute font-['Pretendard:Medium',sans-serif] leading-[1.3] left-[828px] not-italic text-[#9ca3af] text-[14px] text-right top-[24px] whitespace-nowrap">2026.00.00</p>
                <div className="absolute font-['Pretendard:Regular',sans-serif] leading-[1.6] left-0 not-italic text-[16px] text-black top-[81px] w-[800px] whitespace-pre-wrap">
                  <p className="mb-0">{`동해물과 백두산이 마르고 닳도록 하느님이 보우하사 우리 나라 만세. 무궁화 삼천리 화려 강산 대한사람 대한으로 길이 보전하세. 남산 위에 저 소나무 철갑을 두른 듯 바람 서리 불변함은 우리 기상일세. 무궁화 삼천리 화려 강산 대한사람 대한으로 길이 보전하세. `}</p>
                  <p className="mb-0">{`가을하늘 공활한데 높고 구름 없이 밝은 달은 우리 기상일세. 무궁화 삼천리 화려 강산 대한 사람 대한으로 길이 보전하세. `}</p>
                  <p>이 기상과 이 맘으로 충성을 다하여 괴로우나 즐거우나 나라 사랑하세. 무궁화 삼천리 화려 강산 대한 사람 대한으로 길이 보전하세.</p>
                </div>
                <div className="absolute content-stretch flex gap-[8px] items-center left-0 top-[48px]">
                  <Text text="5.0" />
                  <Text1 text="100% 수강 후 작성" />
                </div>
                <div className="absolute bg-[#f9fafb] h-[168px] left-0 overflow-clip rounded-[20px] top-[279px] w-[828px]">
                  <p className="absolute font-['Pretendard:SemiBold',sans-serif] leading-[1.3] left-[20px] not-italic text-[14px] text-black top-[12px] whitespace-nowrap">OOO 교수</p>
                  <p className="-translate-x-full absolute font-['Pretendard:Medium',sans-serif] leading-[1.3] left-[95px] not-italic text-[#9ca3af] text-[14px] text-right top-[34px] whitespace-nowrap">2026.00.00</p>
                  <p className="absolute font-['Pretendard:Regular',sans-serif] leading-[1.6] left-[20px] not-italic text-[16px] text-black top-[60px] w-[800px]">가을하늘 공활한데 높고 구름 없이 밝은 달은 우리 기상일세. 무궁화 삼천리 화려 강산 대한 사람 대한으로 길이 보전하세. 이 기상과 이 맘으로 충성을 다하여 괴로우나 즐거우나 나라 사랑하세. 무궁화 삼천리 화려 강산 대한 사람 대한으로 길이 보전하세.</p>
                  <Text11 text="99" additionalClassNames="bg-white left-[20px] top-[120px]" />
                </div>
                <div className="absolute bg-[#f1f4fc] border border-[#e5e7eb] border-solid h-[36px] left-0 overflow-clip rounded-[20px] top-[223px] w-[82px]">
                  <div className="-translate-x-1/2 -translate-y-1/2 absolute left-[calc(50%-13px)] size-[16px] top-1/2" data-name="thumb_up_24dp_000000_FILL1_wght400_GRAD0_opsz24 1">
                    <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
                      <g id="thumb_up_24dp_000000_FILL1_wght400_GRAD0_opsz24 1">
                        <path d={svgPaths.p2a494a00} fill="var(--fill-0, #314DCC)" id="Vector" />
                      </g>
                    </svg>
                  </div>
                  <p className="absolute font-['Pretendard:Bold',sans-serif] leading-[1.6] left-[43px] not-italic text-[14px] text-black top-[6px] whitespace-nowrap">99</p>
                </div>
              </Wrapper6>
              <Wrapper6 additionalClassNames="h-[252px]">
                <p className="absolute font-['Pretendard:SemiBold',sans-serif] leading-[1.3] left-0 not-italic text-[14px] text-black top-[24px] whitespace-nowrap">newzest01</p>
                <p className="-translate-x-full absolute font-['Pretendard:Medium',sans-serif] leading-[1.3] left-[828px] not-italic text-[#9ca3af] text-[14px] text-right top-[24px] whitespace-nowrap">2026.00.00</p>
                <p className="absolute font-['Pretendard:Regular',sans-serif] leading-[1.6] left-0 not-italic text-[16px] text-black top-[81px] w-[800px]">{`동해물과 백두산이 마르고 닳도록 하느님이 보우하사 우리 나라 만세. 무궁화 삼천리 화려 강산 대한사람 대한으로 길이 보전하세. 남산 위에 저 소나무 철갑을 두른 듯 바람 서리 불변함은 우리 기상일세. 무궁화 삼천리 화려 강산 대한사람 대한으로 길이 보전하세. `}</p>
                <div className="absolute content-stretch flex gap-[8px] items-center left-0 top-[48px]">
                  <Text text="5.0" />
                  <Text1 text="100% 수강 후 작성" />
                </div>
                <div className="absolute bg-[#f9fafb] border border-[#e5e7eb] border-solid h-[36px] left-0 overflow-clip rounded-[20px] top-[171px] w-[73px]">
                  <ThumbUp24Dp000000Fill0Wght400Grad0Opsz />
                  <p className="absolute font-['Pretendard:Medium',sans-serif] leading-[1.6] left-[43px] not-italic text-[14px] text-black top-[6px] whitespace-nowrap">0</p>
                  <ThumbUp24Dp000000Fill0Wght400Grad0Opsz />
                </div>
              </Wrapper6>
              <Wrapper6 additionalClassNames="h-[179px]">
                <p className="absolute font-['Pretendard:SemiBold',sans-serif] leading-[1.3] left-0 not-italic text-[14px] text-black top-[24px] whitespace-nowrap">newzest01</p>
                <p className="-translate-x-full absolute font-['Pretendard:Medium',sans-serif] leading-[1.3] left-[828px] not-italic text-[#9ca3af] text-[14px] text-right top-[24px] whitespace-nowrap">2026.00.00</p>
                <p className="absolute font-['Pretendard:Regular',sans-serif] leading-[1.6] left-0 not-italic text-[16px] text-black top-[81px] w-[800px]">{`동해물과 백두산이 마르고 닳도록 하느님이 보우하사 우리 나라 만세. 무궁화 삼천리 화려 강산 대한사람 대한으로 길이 보전하세. `}</p>
                <div className="absolute content-stretch flex gap-[8px] items-center left-0 top-[48px]">
                  <Text text="5.0" />
                  <Text1 text="100% 수강 후 작성" />
                </div>
                <Text11 text="99" additionalClassNames="bg-[#f9fafb] left-0 top-[119px]" />
              </Wrapper6>
              <Wrapper6 additionalClassNames="h-[179px]">
                <p className="absolute font-['Pretendard:SemiBold',sans-serif] leading-[1.3] left-0 not-italic text-[14px] text-black top-[24px] whitespace-nowrap">newzest01</p>
                <p className="-translate-x-full absolute font-['Pretendard:Medium',sans-serif] leading-[1.3] left-[828px] not-italic text-[#9ca3af] text-[14px] text-right top-[24px] whitespace-nowrap">2026.00.00</p>
                <p className="absolute font-['Pretendard:Regular',sans-serif] leading-[1.6] left-0 not-italic text-[16px] text-black top-[81px] w-[800px]">{`동해물과 백두산이 마르고 닳도록 하느님이 보우하사 우리 나라 만세. 무궁화 삼천리 화려 강산 대한사람 대한으로 길이 보전하세. `}</p>
                <div className="absolute content-stretch flex gap-[8px] items-center left-0 top-[48px]">
                  <Text text="5.0" />
                  <Text1 text="100% 수강 후 작성" />
                </div>
                <Text11 text="99" additionalClassNames="bg-[#f9fafb] left-0 top-[119px]" />
              </Wrapper6>
              <Wrapper6 additionalClassNames="h-[179px]">
                <p className="absolute font-['Pretendard:SemiBold',sans-serif] leading-[1.3] left-0 not-italic text-[14px] text-black top-[24px] whitespace-nowrap">newzest01</p>
                <p className="-translate-x-full absolute font-['Pretendard:Medium',sans-serif] leading-[1.3] left-[828px] not-italic text-[#9ca3af] text-[14px] text-right top-[24px] whitespace-nowrap">2026.00.00</p>
                <p className="absolute font-['Pretendard:Regular',sans-serif] leading-[1.6] left-0 not-italic text-[16px] text-black top-[81px] w-[800px]">{`동해물과 백두산이 마르고 닳도록 하느님이 보우하사 우리 나라 만세. 무궁화 삼천리 화려 강산 대한사람 대한으로 길이 보전하세. `}</p>
                <div className="absolute content-stretch flex gap-[8px] items-center left-0 top-[48px]">
                  <Text text="5.0" />
                  <Text1 text="100% 수강 후 작성" />
                </div>
                <Text11 text="99" additionalClassNames="bg-[#f9fafb] left-0 top-[119px]" />
              </Wrapper6>
            </div>
            <div className="h-[48px] relative rounded-[999999px] shrink-0 w-full">
              <div className="overflow-clip relative rounded-[inherit] size-full">
                <p className="-translate-x-1/2 absolute font-['Pretendard:SemiBold',sans-serif] leading-[1.3] left-[calc(50%+0.5px)] not-italic text-[16px] text-black text-center top-[calc(50%-10px)] whitespace-nowrap">수강평 더보기</p>
              </div>
              <div aria-hidden="true" className="absolute border border-[#e5e7eb] border-solid inset-0 pointer-events-none rounded-[999999px]" />
            </div>
          </div>
        </div>
      </div>
      <div className="absolute bg-white h-[895px] left-0 overflow-clip top-[7009px] w-[876px]">
        <div className="absolute bottom-[40px] contents left-[24px]">
          <p className="absolute bottom-[855px] font-['Pretendard:Bold',sans-serif] leading-[1.3] left-[24px] not-italic text-[24px] text-black translate-y-full whitespace-nowrap">자주하는 질문</p>
          <div className="absolute bg-white border border-[#e2e2e2] border-solid bottom-[772px] h-[36px] left-[24px] overflow-clip rounded-[10px] w-[408px]">
            <p className="absolute font-['Pretendard:Medium',sans-serif] leading-[1.3] left-[15px] not-italic text-[#9ca3af] text-[16px] top-[7px] whitespace-nowrap">전체 카테고리</p>
            <StatMinus124Dp000000Fill1Wght400Grad0Opsz additionalClassNames="right-[15px] top-1/2" />
          </div>
          <div className="absolute bottom-[40px] content-stretch flex flex-col items-start left-[24px] w-[828px]">
            <div className="bg-white h-[60px] relative shrink-0 w-full">
              <div className="overflow-clip relative rounded-[inherit] size-full">
                <Text12 text="결제는 어떤 수단이 가능한가요?" />
                <Stat124Dp000000Fill1Wght400Grad0Opsz additionalClassNames="inset-[20%_1.33%_40%_95.75%]" />
              </div>
              <div aria-hidden="true" className="absolute border-[#e5e7eb] border-b border-solid border-t inset-0 pointer-events-none" />
            </div>
            <Wrapper6 additionalClassNames="h-[60px]">
              <Text12 text="환불 규정이 어떻게 되나요?" />
              <Stat124Dp000000Fill1Wght400Grad0Opsz additionalClassNames="inset-[20%_1.33%_40%_95.75%]" />
            </Wrapper6>
            <Wrapper6 additionalClassNames="h-[60px]">
              <Text13 text="모바일이나 태블릿에서도 볼 수 있나요?" />
              <Stat124Dp000000Fill1Wght400Grad0Opsz additionalClassNames="inset-[20%_1.33%_40%_95.75%]" />
            </Wrapper6>
            <Wrapper6 additionalClassNames="h-[60px]">
              <Text13 text="한 ID로 여러 명과 공유해도 되나요?" />
              <Stat124Dp000000Fill1Wght400Grad0Opsz additionalClassNames="inset-[20%_1.33%_40%_95.75%]" />
            </Wrapper6>
            <Wrapper6 additionalClassNames="h-[60px]">
              <Text13 text="강의 교안(PDF)은 어디서 다운로드하나요?" />
              <Stat124Dp000000Fill1Wght400Grad0Opsz additionalClassNames="inset-[20%_1.33%_40%_95.75%]" />
            </Wrapper6>
            <Wrapper6 additionalClassNames="h-[168px]">
              <div className="absolute bg-[#f9fafb] border-[#e5e7eb] border-b border-solid h-[60px] left-0 overflow-clip top-0 w-[828px]">
                <Text14 text="기초(Basic)와 심화(Advance) 과정의 차이가 무엇인가요?" additionalClassNames="top-[calc(50%+0.5px)]" />
                <div className="-translate-y-1/2 absolute h-[24px] left-[95.75%] overflow-clip right-[1.33%] top-[calc(50%+0.5px)]" data-name="stat_1_24dp_000000_FILL1_wght400_GRAD0_opsz24 1">
                  <div className="absolute bottom-[35.94%] left-1/4 right-1/4 top-[33.23%]" data-name="Vector">
                    <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 12.0583 7.4">
                      <path d={svgPaths.pe2e2780} fill="var(--fill-0, black)" id="Vector" />
                    </svg>
                  </div>
                </div>
              </div>
              <p className="absolute font-['Pretendard:Medium',sans-serif] leading-[1.6] left-[32px] not-italic text-[16px] text-black top-[77px] w-[730px]">기초 과정은 장기별 표준 스캔 기술과 정상 해부학, 정상 변이를 익히는 단계입니다. 심화 과정은 질환별 병리학 소견 분석, 양성/악성 감별 진단, 그리고 실전 결과지(Reporting) 작성에 집중합니다.</p>
            </Wrapper6>
            <Wrapper6 additionalClassNames="h-[60px]">
              <Text14 text="전체 수강 기간과 강의 시간은 어떻게 되나요?" additionalClassNames="top-1/2" />
              <Stat124Dp000000Fill1Wght400Grad0Opsz additionalClassNames="inset-[20%_1.33%_40%_95.75%]" />
            </Wrapper6>
            <Wrapper6 additionalClassNames="h-[60px]">
              <Text14 text="의학적 기초 지식이 없어도 수강할 수 있나요?" additionalClassNames="top-1/2" />
              <Stat124Dp000000Fill1Wght400Grad0Opsz additionalClassNames="inset-[20%_1.33%_40%_95.75%]" />
            </Wrapper6>
            <Wrapper6 additionalClassNames="h-[60px]">
              <div className="-translate-y-1/2 absolute content-stretch flex gap-[8px] items-center left-[20px] top-1/2">
                <div className="bg-white content-stretch flex items-center justify-center px-[12px] py-[4px] relative rounded-[99999px] shrink-0">
                  <ol className="block font-['Pretendard:Medium',sans-serif] leading-[0] not-italic relative shrink-0 text-[#6b7280] text-[14px] whitespace-nowrap" start="4">
                    <li className="ms-[21px]">
                      <span className="leading-[1.3]">수료증 및 혜택</span>
                    </li>
                  </ol>
                </div>
                <p className="font-['Pretendard:Regular',sans-serif] leading-[1.6] not-italic relative shrink-0 text-[16px] text-black whitespace-nowrap">수료증 발급 기준은 어떻게 되나요?</p>
              </div>
              <Stat124Dp000000Fill1Wght400Grad0Opsz additionalClassNames="inset-[20%_1.33%_40%_95.75%]" />
            </Wrapper6>
            <Wrapper6 additionalClassNames="h-[60px]">
              <div className="-translate-y-1/2 absolute content-stretch flex gap-[8px] items-center left-[20px] top-1/2">
                <div className="bg-white content-stretch flex items-center justify-center px-[12px] py-[4px] relative rounded-[99999px] shrink-0">
                  <ol className="block font-['Pretendard:Medium',sans-serif] leading-[0] not-italic relative shrink-0 text-[#6b7280] text-[14px] whitespace-nowrap" start="5">
                    <li className="ms-[21px]">
                      <span className="leading-[1.3]">문의하기</span>
                    </li>
                  </ol>
                </div>
                <p className="font-['Pretendard:Regular',sans-serif] leading-[1.6] not-italic relative shrink-0 text-[16px] text-black whitespace-nowrap">{` 강의 내용에 대해 질문이 생기면 어떻게 하나요?`}</p>
              </div>
              <Stat124Dp000000Fill1Wght400Grad0Opsz additionalClassNames="inset-[20%_1.33%_40%_95.75%]" />
            </Wrapper6>
          </div>
        </div>
      </div>
      <div className="absolute bg-[#111827] h-[450px] left-0 overflow-clip top-[122px] w-[1440px]">
        <div className="absolute h-[509px] left-[671px] top-0 w-[912px]" data-name="Gemini_Generated_Image_5sqw3l5sqw3l5sqw 1">
          <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgGeminiGeneratedImage5Sqw3L5Sqw3L5Sqw1} />
        </div>
        <div className="absolute bg-gradient-to-r from-[#111827] h-[450px] left-[671px] to-[rgba(17,24,39,0)] top-0 w-[769px]" />
        <p className="absolute font-['Pretendard:SemiBold',sans-serif] leading-[1.3] left-[24px] not-italic text-[32px] text-white top-[102px] w-[700px]">복부 초음파 정규 과정복부 초음파 정규 과정복부 초음파 정규 과정 복부 초음파 정규 과정</p>
        <div className="absolute bg-[#f3f4f6] content-stretch flex items-center justify-center left-[24px] px-[10px] py-[6px] rounded-[10px] top-[37px]">
          <p className="font-['Pretendard:SemiBold',sans-serif] leading-[1.3] not-italic relative shrink-0 text-[12px] text-black uppercase whitespace-nowrap">best</p>
        </div>
        <div className="absolute content-stretch flex gap-[8px] items-center left-[24px] top-[66px]">
          <Text15 text="#복부" />
          <Text15 text="#정규과정" />
          <Text15 text="#온라인강의" />
        </div>
        <p className="absolute font-['Pretendard:Medium',sans-serif] leading-[1.6] left-[24px] not-italic text-[#9ca3af] text-[16px] top-[227px] uppercase w-[700px]">복부 초음파를 처음 시작하시는 분들을 위한 SCAN 중심의 실무 종합반입니다. 정상 해부학을 이해하고 정상 구조와 초음파 영상에서 기본적인 모습을 이해하고, 초음파 검사를 수행하기 위한 기본적인 기술을 습득할 수 있습니다.</p>
        <div className="absolute content-stretch flex gap-[4px] items-center left-[24px] top-[198px]">
          <Helper />
          <p className="font-['Pretendard:SemiBold',sans-serif] leading-[1.3] not-italic relative shrink-0 text-[16px] text-white whitespace-nowrap">5.0</p>
          <p className="font-['Pretendard:Regular',sans-serif] leading-[1.3] not-italic relative shrink-0 text-[16px] text-white whitespace-nowrap">(9,999)</p>
        </div>
        <div className="absolute content-center flex flex-wrap gap-[8px] items-center left-[24px] top-[345px] w-[492px]">
          <Helper6 text="난이도" text1="초급" />
          <Helper6 text="모집 기간" text1="상시 모집" />
          <Helper6 text="강의 기간" text1="12주" />
          <Helper6 text="커리큘럼" text1="이론 및 실습 12개" />
          <Helper6 text="수업 구분" text1="팀 수업" />
        </div>
      </div>
      <div className="absolute h-[80px] left-0 overflow-clip top-0 w-[1440px]">
        <div className="absolute h-[48px] left-0 top-[16px] w-[169px]" data-name="아트보드 29@3x 1">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <img alt="" className="absolute h-[140.84%] left-[-4.74%] max-w-none top-[-20.42%] w-[113.16%]" src={img293X1} />
          </div>
        </div>
        <div className="absolute bg-[#f3f4f6] left-[1308px] overflow-clip rounded-[9999px] size-[48px] top-[16px]">
          <Wrapper2 additionalClassNames="left-[12px] top-[12px]">
            <g id="shopping_cart_24dp_000000_FILL0_wght400_GRAD0_opsz24 1">
              <path d={svgPaths.p30b1b500} fill="var(--fill-0, black)" id="Vector" />
            </g>
          </Wrapper2>
        </div>
        <div className="absolute h-[48px] left-[525px] overflow-clip top-[16px] w-[120px]">
          <p className="absolute font-['Pretendard:Medium',sans-serif] leading-[1.3] left-[calc(50%-30px)] not-italic text-[16px] text-black top-[calc(50%-11px)] whitespace-nowrap">강의 듣기</p>
        </div>
        <div className="absolute h-[48px] left-[657px] overflow-clip top-[16px] w-[120px]">
          <p className="absolute capitalize font-['Pretendard:Medium',sans-serif] leading-[1.3] left-[calc(50%-28px)] not-italic text-[16px] text-black top-[calc(50%-11px)] whitespace-nowrap">커뮤니티</p>
        </div>
        <div className="absolute h-[48px] left-[261px] overflow-clip top-[16px] w-[120px]">
          <p className="absolute font-['Pretendard:Medium',sans-serif] leading-[1.3] left-[calc(50%-43px)] not-italic text-[16px] text-black top-[calc(50%-11px)] whitespace-nowrap">SRDMS 소개</p>
        </div>
        <div className="absolute h-[48px] left-[393px] overflow-clip top-[16px] w-[120px]">
          <p className="absolute font-['Pretendard:Medium',sans-serif] leading-[1.3] left-[calc(50%-28px)] not-italic text-[16px] text-black top-[calc(50%-11px)] whitespace-nowrap">자격유지</p>
        </div>
        <div className="absolute bg-[#d1d5db] left-[1368px] overflow-clip rounded-[99999px] size-[48px] top-[16px]">
          <Wrapper2 additionalClassNames="left-[12px] top-[12px]">
            <g id="person_24dp_000000_FILL0_wght400_GRAD0_opsz24 1">
              <path d={svgPaths.pb610800} fill="var(--fill-0, black)" id="Vector" />
            </g>
          </Wrapper2>
        </div>
      </div>
      <p className="absolute font-['Pretendard:Medium',sans-serif] leading-[1.3] left-[24px] not-italic opacity-40 text-[#9ca3af] text-[14px] top-[92px] whitespace-nowrap">{`Home>Class>Online`}</p>
      <div className="absolute bg-white h-[450px] left-[calc(58.33%+36px)] overflow-clip rounded-[30px] shadow-[0px_0px_30px_0px_rgba(0,0,0,0.1)] top-[592px] w-[540px]">
        <p className="absolute font-['Pretendard:SemiBold',sans-serif] leading-[1.3] left-[295px] not-italic text-[36px] text-black top-[72px] whitespace-nowrap">9,999,999 원</p>
        <p className="-translate-x-full absolute font-['Pretendard:SemiBold',sans-serif] leading-[1.3] left-[512px] not-italic text-[36px] text-black text-right top-[302px] whitespace-nowrap">99,999,999 원</p>
        <p className="absolute font-['Pretendard:SemiBold',sans-serif] leading-[1.3] left-[210px] not-italic text-[#33bda7] text-[36px] top-[72px] whitespace-nowrap">15%</p>
        <Text16 text="예약하기" additionalClassNames="bg-[#111827] left-[24px] w-[158px]" />
        <Text16 text="장바구니" additionalClassNames="bg-[#374151] left-[190px] w-[156px]" />
        <div className="absolute bg-[#33bda7] h-[48px] left-[354px] overflow-clip rounded-[20px] top-[369px] w-[158px]">
          <p className="-translate-x-1/2 absolute font-['Pretendard:SemiBold',sans-serif] leading-[1.3] left-1/2 not-italic text-[18px] text-center text-white top-[12px] whitespace-nowrap">수강 신청 하기</p>
        </div>
        <div className="absolute bg-white border border-[#e5e7eb] border-solid h-[48px] left-[24px] overflow-clip rounded-[10px] top-[162px] w-[488px]">
          <p className="absolute font-['Pretendard:Medium',sans-serif] leading-[1.3] left-[19px] not-italic text-[#9ca3af] text-[16px] top-[11px] whitespace-nowrap">옵션을 선택하세요</p>
          <StatMinus124Dp000000Fill1Wght400Grad0Opsz additionalClassNames="left-[443px] top-1/2" />
        </div>
        <p className="absolute font-['Pretendard:SemiBold',sans-serif] leading-[1.3] left-[calc(50%-246px)] not-italic text-[16px] text-black top-[239px] whitespace-nowrap">옵션을 선택하세요</p>
        <p className="-translate-x-full absolute font-['Pretendard:SemiBold',sans-serif] leading-[1.3] left-[calc(50%+191px)] not-italic text-[16px] text-black text-right top-[238px] whitespace-nowrap">99,999,999</p>
        <p className="absolute font-['Pretendard:SemiBold',sans-serif] leading-[1.3] left-[calc(50%-246px)] not-italic text-[18px] text-black top-[131px] whitespace-nowrap">옵션</p>
        <div className="absolute h-0 left-[24px] top-[290px] w-[488px]">
          <div className="absolute inset-[-1px_0_0_0]">
            <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 488 1">
              <line id="Line 2" stroke="var(--stroke-0, black)" x2="488" y1="0.5" y2="0.5" />
            </svg>
          </div>
        </div>
        <div className="absolute left-[475px] overflow-clip size-[48px] top-[220px]">
          <Wrapper2 additionalClassNames="left-[12px] top-[12px]">
            <g id="cancel_24dp_000000_FILL1_wght400_GRAD0_opsz24 1">
              <path d={svgPaths.p2c8a6480} fill="var(--fill-0, black)" id="Vector" />
            </g>
          </Wrapper2>
        </div>
        <div className="absolute bg-white border border-[#e5e7eb] border-solid left-[307px] overflow-clip rounded-[10px] size-[40px] top-[230px]">
          <Wrapper2 additionalClassNames="left-[7px] top-[7px]">
            <g id="check_indeterminate_small_24dp_000000_FILL1_wght400_GRAD0_opsz24 1">
              <path d="M6 13V11H18V13H6Z" fill="var(--fill-0, black)" id="Vector" />
            </g>
          </Wrapper2>
        </div>
        <div className="absolute bg-white border border-[#e5e7eb] border-solid left-[211px] overflow-clip rounded-[10px] size-[40px] top-[230px]">
          <Wrapper2 additionalClassNames="left-[7px] top-[7px]">
            <g id="add_24dp_000000_FILL1_wght400_GRAD0_opsz24 1">
              <path d={svgPaths.p2a6e0600} fill="var(--fill-0, black)" id="Vector" />
            </g>
          </Wrapper2>
        </div>
        <div className="absolute left-[259px] overflow-clip size-[40px] top-[230px]">
          <p className="absolute font-['Pretendard:SemiBold',sans-serif] leading-[1.3] left-[calc(50%-11px)] not-italic text-[16px] text-black top-[calc(50%-11px)] whitespace-nowrap">99</p>
        </div>
        <p className="[text-decoration-skip-ink:none] absolute decoration-solid font-['Pretendard:Regular',sans-serif] leading-[1.3] left-[324px] line-through not-italic opacity-50 text-[32px] text-black top-[30px] whitespace-nowrap">9,999,999 원</p>
      </div>
      <div className="absolute bg-[#f9fafb] h-[48px] left-[calc(58.33%+16px)] overflow-clip rounded-[99999px] top-[16px] w-[440px]">
        <Wrapper2 additionalClassNames="-translate-y-1/2 right-[20px] top-1/2">
          <g id="search_24dp_000000_FILL0_wght400_GRAD0_opsz24 1">
            <path d={svgPaths.pc423380} fill="var(--fill-0, black)" id="Vector" />
          </g>
        </Wrapper2>
        <p className="absolute font-['Pretendard:Medium',sans-serif] leading-[1.3] left-[24px] not-italic text-[#9ca3af] text-[16px] top-[calc(50%-11px)] whitespace-nowrap">Search</p>
      </div>
    </div>
  );
}