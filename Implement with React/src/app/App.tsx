import { useState, useRef, useEffect } from "react";
import { Header } from "./components/Header";
import { HeroBanner } from "./components/HeroBanner";
import { PricingSidebar } from "./components/PricingSidebar";
import { ReviewCarousel } from "./components/ReviewCarousel";
import { CourseIntroduction } from "./components/CourseIntroduction";
import { Curriculum } from "./components/Curriculum";
import { Reviews } from "./components/Reviews";
import { FAQ } from "./components/FAQ";

const tabs = ["강의 소개", "커리큘럼", "수강평", "자주하는 질문"] as const;
type Tab = typeof tabs[number];

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("강의 소개");
  const [isTabSticky, setIsTabSticky] = useState(false);
  const tabBarRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Record<Tab, HTMLDivElement | null>>({
    "강의 소개": null,
    "커리큘럼": null,
    "수강평": null,
    "자주하는 질문": null,
  });

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsTabSticky(!entry.isIntersecting);
      },
      { threshold: 0, rootMargin: "-81px 0px 0px 0px" }
    );
    if (tabBarRef.current) observer.observe(tabBarRef.current);
    return () => observer.disconnect();
  }, []);

  const scrollToSection = (tab: Tab) => {
    setActiveTab(tab);
    const el = sectionRefs.current[tab];
    if (el) {
      const offset = 160;
      const top = el.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: "smooth" });
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY + 200;
      for (let i = tabs.length - 1; i >= 0; i--) {
        const el = sectionRefs.current[tabs[i]];
        if (el && el.offsetTop <= scrollY) {
          setActiveTab(tabs[i]);
          break;
        }
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="bg-white min-h-screen font-['Pretendard_Variable',sans-serif]">
      <Header />
      <HeroBanner />

      <div className="max-w-[1440px] mx-auto px-6">
        <div className="flex gap-8 relative">
          {/* Left content */}
          <div className="flex-1 max-w-[876px]">
            {/* Tab sentinel */}
            <div ref={tabBarRef} />

            {/* Sticky Tab Navigation */}
            <div className={`${isTabSticky ? "sticky top-[80px] z-40" : ""} bg-white border-b border-gray-200`}>
              <div className="flex items-center gap-10">
                {tabs.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => scrollToSection(tab)}
                    className={`py-6 relative text-[18px] transition-colors ${
                      activeTab === tab
                        ? "text-[#2ea995]"
                        : "text-gray-400 hover:text-gray-600"
                    }`}
                    style={{ fontWeight: activeTab === tab ? 700 : 400 }}
                  >
                    {tab}
                    {activeTab === tab && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2ea995]" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* 먼저 경험한 수강생들 후기 */}
            <div className="py-8">
              <h2 className="text-black text-[24px] font-['Pretendard_Variable'] mb-6" style={{ fontWeight: 700 }}>먼저 경험한 수강생들 후기</h2>
              <ReviewCarousel />
            </div>

            {/* 강의 소개 */}
            <div ref={(el) => { sectionRefs.current["강의 소개"] = el; }} className="border-t border-gray-200 pt-8 pb-12">
              <h2 className="text-black text-[24px] font-['Pretendard_Variable'] mb-8" style={{ fontWeight: 700 }}>강의 소개</h2>
              <CourseIntroduction />
            </div>

            {/* 커리큘럼 */}
            <div ref={(el) => { sectionRefs.current["커리큘럼"] = el; }} className="border-t border-gray-200 pt-8 pb-12">
              <h2 className="text-black text-[24px] font-['Pretendard_Variable'] mb-8" style={{ fontWeight: 700 }}>커리큘럼</h2>
              <Curriculum />
            </div>

            {/* 수강평 */}
            <div ref={(el) => { sectionRefs.current["수강평"] = el; }} className="border-t border-gray-200 pt-8 pb-12">
              <h2 className="text-black text-[24px] font-['Pretendard_Variable'] mb-8" style={{ fontWeight: 700 }}>수강평</h2>
              <Reviews />
            </div>

            {/* 자주하는 질문 */}
            <div ref={(el) => { sectionRefs.current["자주하는 질문"] = el; }} className="border-t border-gray-200 pt-8 pb-12">
              <h2 className="text-black text-[24px] font-['Pretendard_Variable'] mb-8" style={{ fontWeight: 700 }}>자주하는 질문</h2>
              <FAQ />
            </div>
          </div>

          {/* Right sidebar */}
          <div className="hidden lg:block w-[540px] shrink-0">
            <div className="pt-8">
              <PricingSidebar />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile bottom bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-50 flex gap-2">
        <button className="bg-gray-900 text-white rounded-[20px] py-3 flex-1 text-[16px] font-['Pretendard_Variable']" style={{ fontWeight: 600 }}>
          예약하기
        </button>
        <button className="bg-[#33bda7] text-white rounded-[20px] py-3 flex-1 text-[16px] font-['Pretendard_Variable']" style={{ fontWeight: 600 }}>
          수강 신청
        </button>
      </div>
    </div>
  );
}
