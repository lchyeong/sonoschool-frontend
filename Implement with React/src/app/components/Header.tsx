import svgPaths from "../../imports/svg-1xtnmim35a";
import img293X1 from "figma:asset/852529941015dfb92b29c23252bc879b14d11c78.png";

export function Header() {
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-[1440px] mx-auto flex items-center justify-between h-[80px] px-6">
        <div className="flex items-center gap-8">
          <div className="h-[48px] w-[169px] relative overflow-hidden shrink-0">
            <img alt="SRDMS" className="absolute h-[140.84%] left-[-4.74%] max-w-none top-[-20.42%] w-[113.16%]" src={img293X1} />
          </div>
          <nav className="hidden md:flex items-center gap-2">
            {["SRDMS 소개", "자격유지", "강의 듣기", "커뮤니티"].map((item) => (
              <button key={item} className="px-4 py-2 text-[16px] font-['Pretendard_Variable'] text-black hover:bg-gray-50 rounded-lg transition-colors">
                {item}
              </button>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center bg-gray-50 rounded-full px-5 py-2.5 w-[300px]">
            <input type="text" placeholder="Search" className="bg-transparent outline-none flex-1 text-[16px] font-['Pretendard_Variable'] text-black placeholder:text-gray-400" />
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24">
              <path d={svgPaths.pc423380} fill="black" />
            </svg>
          </div>
          <button className="bg-gray-100 rounded-full w-[48px] h-[48px] flex items-center justify-center">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24">
              <path d={svgPaths.p30b1b500} fill="black" />
            </svg>
          </button>
          <button className="bg-gray-300 rounded-full w-[48px] h-[48px] flex items-center justify-center">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24">
              <path d={svgPaths.pb610800} fill="black" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
