import { useState, useRef } from "react";
import svgPaths from "../../imports/svg-1xtnmim35a";

function Stars() {
  return (
    <div className="flex items-center">
      {[...Array(5)].map((_, i) => (
        <svg key={i} className="w-5 h-5" fill="none" viewBox="0 0 20 20">
          <path d={svgPaths.p1bf65e00} fill="#FFC32C" />
        </svg>
      ))}
    </div>
  );
}

const carouselReviews = [
  {
    id: 1,
    username: "newzest01",
    rating: "5.0",
    badge: "100% 수강 후 작성",
    content: "동해물과 백두산이 마르고 닳도록 하느님이 보우하사 우리 나라 만세. 무궁화 삼천리 화려 강산 대한사람 대한으로 길이 보전하세. 남산 위에 저 소나무 철갑을 두른 듯 바람 서리 불변함은 우리 기상일세.\n\n무궁화 삼천리 화려 강산 대한사람 대한으로 길이 보전하세. 가을하늘 공활한데 높고 구름 없이 밝은 달은 우...",
  },
  {
    id: 2,
    username: "newzest01",
    rating: "5.0",
    badge: "100% 수강 후 작성",
    content: "동해물과 백두산이 마르고 닳도록 하느님이 보우하사 우리 나라 만세. 무궁화 삼천리 화려 강산 대한사람 대한으로 길이 보전하세. 남산 위에 저 소나무 철갑을 두른 듯 바람 서리 불변함은 우리 기상일세.\n\n무궁화 삼천리 화려 강산 대한사람 대한으로 길이 보전하세. 가을하늘 공활한데 높고 구름 없이 밝은 달은 우...",
  },
  {
    id: 3,
    username: "newzest01",
    rating: "5.0",
    badge: "100% 수강 후 작성",
    content: "동해물과 백두산이 마르고 닳도록 하느님이 보우하사 우리 나라 만세. 무궁화 삼천리 화려 강산 대한사람 대한으로 길이 보전하세.",
  },
];

function ReviewCard({ review, opacity = 1 }: { review: typeof carouselReviews[0]; opacity?: number }) {
  return (
    <div
      className="bg-white border border-gray-200 rounded-[30px] p-6 w-[348px] h-[237px] shrink-0 overflow-hidden"
      style={{ opacity }}
    >
      <p className="text-black text-[14px] font-['Pretendard_Variable'] mb-2">{review.username}</p>
      <div className="flex items-center gap-2 mb-4">
        <Stars />
        <span className="text-black text-[16px] font-['Pretendard_Variable']" style={{ fontWeight: 600 }}>{review.rating}</span>
        <span className="bg-gray-100 text-gray-500 text-[12px] font-['Pretendard_Variable'] px-2.5 py-0.5 rounded-full">{review.badge}</span>
      </div>
      <p className="text-black text-[14px] font-['Pretendard_Variable'] leading-relaxed whitespace-pre-line line-clamp-5">{review.content}</p>
    </div>
  );
}

export function ReviewCarousel() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollPos, setScrollPos] = useState(0);

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = 360;
    const newPos = direction === "left" ? scrollPos - amount : scrollPos + amount;
    scrollRef.current.scrollTo({ left: newPos, behavior: "smooth" });
    setScrollPos(newPos);
  };

  return (
    <div className="bg-gray-50 rounded-[30px] p-3 relative">
      <div ref={scrollRef} className="flex gap-3 overflow-x-auto scrollbar-hide" style={{ scrollbarWidth: "none" }}>
        {carouselReviews.map((review, i) => (
          <ReviewCard key={review.id} review={review} opacity={i === carouselReviews.length - 1 ? 0.2 : 1} />
        ))}
      </div>
      <button
        onClick={() => scroll("left")}
        className="absolute left-2 top-1/2 -translate-y-1/2 bg-white border border-gray-200 rounded-[10px] w-[40px] h-[40px] flex items-center justify-center hover:bg-gray-50 shadow-sm"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24">
          <path d={svgPaths.pc87b500} fill="black" />
        </svg>
      </button>
      <button
        onClick={() => scroll("right")}
        className="absolute right-2 top-1/2 -translate-y-1/2 bg-white border border-gray-200 rounded-[10px] w-[40px] h-[40px] flex items-center justify-center hover:bg-gray-50 shadow-sm"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24">
          <path d={svgPaths.pa1eb970} fill="black" />
        </svg>
      </button>
    </div>
  );
}
