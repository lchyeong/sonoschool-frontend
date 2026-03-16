import { useState } from "react";
import svgPaths from "../../imports/svg-1xtnmim35a";

export function PricingSidebar() {
  const [quantity, setQuantity] = useState(1);
  const [selectedOption, setSelectedOption] = useState("");
  const [showOption, setShowOption] = useState(false);

  return (
    <div className="bg-white rounded-[30px] shadow-[0px_0px_30px_0px_rgba(0,0,0,0.1)] p-6 sticky top-[100px]">
      <p className="text-black text-[32px] line-through opacity-50 font-['Pretendard_Variable'] text-right mb-1">9,999,999 원</p>
      <div className="flex items-baseline justify-end gap-2 mb-6">
        <span className="text-[#33bda7] text-[36px] font-['Pretendard_Variable']" style={{ fontWeight: 600 }}>15%</span>
        <span className="text-black text-[36px] font-['Pretendard_Variable']" style={{ fontWeight: 600 }}>9,999,999 원</span>
      </div>

      <div className="mb-4">
        <p className="text-black text-[18px] font-['Pretendard_Variable'] mb-2" style={{ fontWeight: 600 }}>옵션</p>
        <button
          onClick={() => setShowOption(!showOption)}
          className="w-full flex items-center justify-between border border-gray-200 rounded-[10px] px-4 py-3 text-left"
        >
          <span className="text-gray-400 text-[16px] font-['Pretendard_Variable']">
            {selectedOption || "옵션을 선택하세요"}
          </span>
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24">
            <path d={svgPaths.p1be4b900} fill="black" />
          </svg>
        </button>
        {showOption && (
          <div className="border border-gray-200 rounded-[10px] mt-1 overflow-hidden">
            {["Basic 과정 (6주)", "Advance 과정 (6주)", "전체 과정 (12주)"].map((opt) => (
              <button
                key={opt}
                onClick={() => { setSelectedOption(opt); setShowOption(false); }}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 text-[14px] font-['Pretendard_Variable'] border-b border-gray-100 last:border-b-0"
              >
                {opt}
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedOption && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-black text-[16px] font-['Pretendard_Variable']" style={{ fontWeight: 600 }}>{selectedOption}</span>
            <button onClick={() => setSelectedOption("")} className="p-1">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24">
                <path d={svgPaths.p2c8a6480} fill="black" />
              </svg>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setQuantity(Math.max(1, quantity + 1))}
              className="border border-gray-200 rounded-[10px] w-[40px] h-[40px] flex items-center justify-center hover:bg-gray-50"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24">
                <path d={svgPaths.p2a6e0600} fill="black" />
              </svg>
            </button>
            <div className="w-[40px] h-[40px] flex items-center justify-center">
              <span className="text-black text-[16px] font-['Pretendard_Variable']" style={{ fontWeight: 600 }}>{quantity}</span>
            </div>
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="border border-gray-200 rounded-[10px] w-[40px] h-[40px] flex items-center justify-center hover:bg-gray-50"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24">
                <path d="M6 13V11H18V13H6Z" fill="black" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <div className="border-t border-black mb-4 pt-4">
        <div className="flex items-center justify-between">
          <span className="text-black text-[16px] font-['Pretendard_Variable']" style={{ fontWeight: 600 }}>{selectedOption || "옵션을 선택하세요"}</span>
          <span className="text-black text-[16px] font-['Pretendard_Variable']" style={{ fontWeight: 600 }}>99,999,999</span>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <span className="text-black text-[18px] font-['Pretendard_Variable']" style={{ fontWeight: 600 }}>총 결제 금액</span>
        <span className="text-black text-[36px] font-['Pretendard_Variable']" style={{ fontWeight: 600 }}>99,999,999 원</span>
      </div>

      <div className="flex gap-2">
        <button className="bg-gray-900 text-white rounded-[20px] py-3 flex-1 text-[18px] font-['Pretendard_Variable'] hover:bg-gray-800 transition-colors" style={{ fontWeight: 600 }}>
          예약하기
        </button>
        <button className="bg-gray-700 text-white rounded-[20px] py-3 flex-1 text-[18px] font-['Pretendard_Variable'] hover:bg-gray-600 transition-colors" style={{ fontWeight: 600 }}>
          장바구니
        </button>
        <button className="bg-[#33bda7] text-white rounded-[20px] py-3 flex-1 text-[18px] font-['Pretendard_Variable'] hover:bg-[#2da897] transition-colors" style={{ fontWeight: 600 }}>
          수강 신청 하기
        </button>
      </div>
    </div>
  );
}
