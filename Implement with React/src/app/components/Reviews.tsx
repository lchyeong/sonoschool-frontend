import { useState } from "react";
import svgPaths from "../../imports/svg-1xtnmim35a";

function StarIcon({ size = 20 }: { size?: number }) {
  return (
    <svg className={`w-[${size}px] h-[${size}px]`} style={{ width: size, height: size }} fill="none" viewBox="0 0 20 20">
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

interface ReviewData {
  id: number;
  username: string;
  date: string;
  rating: string;
  badge: string;
  content: string;
  likes: number;
  liked: boolean;
  reply?: {
    author: string;
    date: string;
    content: string;
    likes: number;
  };
}

const reviewsData: ReviewData[] = [
  {
    id: 1,
    username: "newzest01",
    date: "2026.00.00",
    rating: "5.0",
    badge: "100% 수강 후 작성",
    content: "동해물과 백두산이 마르고 닳도록 하느님이 보우하사 우리 나라 만세. 무궁화 삼천리 화려 강산 대한사람 대한으로 길이 보전하세. 남산 위에 저 소나무 철갑을 두른 듯 바람 서리 불변함은 우리 기상일세. 무궁화 삼천리 화려 강산 대한사람 대한으로 길이 보전하세.\n\n가을하늘 공활한데 높고 구름 없이 밝은 달은 우리 기상일세. 무궁화 삼천리 화려 강산 대한 사람 대한으로 길이 보전하세.\n\n이 기상과 이 맘으로 충성을 다하여 괴로우나 즐거우나 나라 사랑하세. 무궁화 삼천리 화려 강산 대한 사람 대한으로 길이 보전하세.",
    likes: 99,
    liked: true,
    reply: {
      author: "OOO 교수",
      date: "2026.00.00",
      content: "가을하늘 공활한데 높고 구름 없이 밝은 달은 우리 기상일세. 무궁화 삼천리 화려 강산 대한 사람 대한으로 길이 보전하세. 이 기상과 이 맘으로 충성을 다하여 괴로우나 즐거우나 나라 사랑하세. 무궁화 삼천리 화려 강산 대한 사람 대한으로 길이 보전하세.",
      likes: 99,
    },
  },
  {
    id: 2,
    username: "newzest01",
    date: "2026.00.00",
    rating: "5.0",
    badge: "100% 수강 후 작성",
    content: "동해물과 백두산이 마르고 닳도록 하느님이 보우하사 우리 나라 만세. 무궁화 삼천리 화려 강산 대한사람 대한으로 길이 보전하세. 남산 위에 저 소나무 철갑을 두른 듯 바람 서리 불변함은 우리 기상일세. 무궁화 삼천리 화려 강산 대한사람 대한으로 길이 보전하세.",
    likes: 0,
    liked: false,
  },
  {
    id: 3,
    username: "newzest01",
    date: "2026.00.00",
    rating: "5.0",
    badge: "100% 수강 후 작성",
    content: "동해물과 백두산이 마르고 닳도록 하느님이 보우하사 우리 나라 만세. 무궁화 삼천리 화려 강산 대한사람 대한으로 길이 보전하세.",
    likes: 99,
    liked: false,
  },
  {
    id: 4,
    username: "newzest01",
    date: "2026.00.00",
    rating: "5.0",
    badge: "100% 수강 후 작성",
    content: "동해물과 백두산이 마르고 닳도록 하느님이 보우하사 우리 나라 만세. 무궁화 삼천리 화려 강산 대한사람 대한으로 길이 보전하세.",
    likes: 99,
    liked: false,
  },
  {
    id: 5,
    username: "newzest01",
    date: "2026.00.00",
    rating: "5.0",
    badge: "100% 수강 후 작성",
    content: "동해물과 백두산이 마르고 닳도록 하느님이 보우하사 우리 나라 만세. 무궁화 삼천리 화려 강산 대한사람 대한으로 길이 보전하세.",
    likes: 99,
    liked: false,
  },
];

function ThumbIcon({ filled = false }: { filled?: boolean }) {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 16 16">
      <path d={filled ? svgPaths.p2a494a00 : svgPaths.p3d297b00} fill={filled ? "#314DCC" : "black"} />
    </svg>
  );
}

function ReviewCard({ review }: { review: ReviewData }) {
  const [likes, setLikes] = useState(review.likes);
  const [liked, setLiked] = useState(review.liked);

  return (
    <div className="border-b border-gray-200 py-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-black text-[14px] font-['Pretendard_Variable']" style={{ fontWeight: 600 }}>{review.username}</span>
        <span className="text-gray-400 text-[14px] font-['Pretendard_Variable']">{review.date}</span>
      </div>
      <div className="flex items-center gap-2 mb-4">
        <Stars />
        <span className="text-black text-[16px] font-['Pretendard_Variable']" style={{ fontWeight: 600 }}>{review.rating}</span>
        <span className="bg-gray-100 text-gray-500 text-[12px] font-['Pretendard_Variable'] px-2.5 py-0.5 rounded-full">{review.badge}</span>
      </div>
      <p className="text-black text-[16px] font-['Pretendard_Variable'] leading-relaxed whitespace-pre-line mb-4">{review.content}</p>
      <button
        onClick={() => { setLiked(!liked); setLikes(liked ? likes - 1 : likes + 1); }}
        className={`flex items-center gap-2 border rounded-[20px] px-4 py-2 transition-colors ${liked ? "bg-[#f1f4fc] border-gray-200" : "bg-gray-50 border-gray-200"}`}
      >
        <ThumbIcon filled={liked} />
        <span className={`text-[14px] font-['Pretendard_Variable'] ${liked ? "font-bold" : ""}`} style={liked ? { fontWeight: 700 } : {}}>{likes}</span>
      </button>
      {review.reply && (
        <div className="bg-gray-50 rounded-[20px] p-5 mt-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-black text-[14px] font-['Pretendard_Variable']" style={{ fontWeight: 600 }}>{review.reply.author}</span>
          </div>
          <span className="text-gray-400 text-[14px] font-['Pretendard_Variable']">{review.reply.date}</span>
          <p className="text-black text-[16px] font-['Pretendard_Variable'] leading-relaxed mt-3 mb-3">{review.reply.content}</p>
          <div className="flex items-center gap-2 border border-gray-200 rounded-[20px] px-4 py-2 bg-white w-fit">
            <ThumbIcon />
            <span className="text-[14px] font-['Pretendard_Variable']">{review.reply.likes}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export function Reviews() {
  return (
    <div>
      <div className="flex flex-col items-center mb-8">
        <div className="flex items-center gap-2 mb-2">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 32 32">
            <path d={svgPaths.p5cde200} fill="#FFC32C" />
          </svg>
          <span className="text-black text-[32px] font-['Pretendard_Variable']" style={{ fontWeight: 700 }}>5.0</span>
          <span className="text-gray-400 text-[32px] font-['Pretendard_Variable']">(9,999)</span>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h3 className="text-black text-[20px] font-['Pretendard_Variable']" style={{ fontWeight: 600 }}>전체 수강평</h3>
        <button className="flex items-center gap-2 border border-gray-200 rounded-[10px] px-4 py-1.5">
          <span className="text-black text-[16px] font-['Pretendard_Variable'] opacity-50">추천순</span>
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24">
            <path d={svgPaths.p1be4b900} fill="black" />
          </svg>
        </button>
      </div>

      <div>
        {reviewsData.map((review) => (
          <ReviewCard key={review.id} review={review} />
        ))}
      </div>

      <button className="w-full border border-gray-200 rounded-full py-3 mt-6 text-black text-[16px] font-['Pretendard_Variable'] hover:bg-gray-50 transition-colors" style={{ fontWeight: 600 }}>
        수강평 더보기
      </button>
    </div>
  );
}
