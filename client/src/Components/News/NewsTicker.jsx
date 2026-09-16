import React, { useState, useEffect, useMemo } from "react";
import { FaBullhorn } from "react-icons/fa";
import api from "../axios/axios";
import NewsTickerModal from "./NewsTickerModal";

const DEFAULT_NEWS_TEXT = `
 Welcome to mosttiger.com 🏏আপনি এশিয়ার বিশ্বাসযোগ্য ক্রিকেট ট্রেডিং ও অনলাইন ক্যাসিনো প্ল্যাটফর্মে স্বাগতম!! আমাদের সাথে মেনুয়ালি & নিজে নিজে একাউন্ট খুলে লেনদেন করতে পারবেন! একাউন্ট খুলতে sing up ক্লিক করে আপনার নাম ও নাম্বার দিয়ে রেজিষ্ট্রেশন করে ফেলুন আর ২৪ ঘন্টায় নিজে নিজে ডিপোজিট ও উইথড্র করুন! 📌প্রতি ডিপোজিটে পাবেন ৫%আনলিমিটেড বোনাস!! 📌আমাদের লিংক সমূহ.. 🔗 mosttiger.com 🔗

মেনুয়ালি লেনদেন করতে হোয়াটসঅ্যাপ  ইনবক্স করুন     |    Welcome to our exchange!
`;

const NewsTicker = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [showNewsModal, setShowNewsModal] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchAnnouncements = async () => {
      try {
        const response = await api.get("/api/announcements/active");
        const list = response?.data?.data || response?.data || [];
        if (isMounted && Array.isArray(list) && list.length > 0) {
          setAnnouncements(list);
        }
      } catch (err) {
        // Fallback silently to default ticker text on error
        console.warn(
          "Failed to fetch active announcements:",
          err?.message || err,
        );
      }
    };

    fetchAnnouncements();

    return () => {
      isMounted = false;
    };
  }, []);

  const newsText = useMemo(() => {
    if (announcements.length > 0) {
      return announcements
        .map((item) => (item.message || item.text || item.title || "").trim())
        .filter(Boolean)
        .join("     |     ");
    }
    return DEFAULT_NEWS_TEXT.trim();
  }, [announcements]);

  return (
    <>
      <div
        className="
        w-full
        overflow-hidden
        bg-[#0B1220]
        border-y
        border-[#16314D]
        flex
        items-center
        h-[48px]
        relative
      "
        onClick={() => setShowNewsModal(true)}
      >
        {/* ================= LEFT ICON ================= */}

        <div
          className="
          flex
          items-center
          justify-center
          min-w-[60px]
          h-full
          text-primary
          z-10
          shadow-md
        "
        >
          <FaBullhorn size={18} />
        </div>

        {/* ================= TICKER WRAPPER ================= */}

        <div
          className="
          relative
          overflow-hidden
          flex-1
          h-full
          flex
          items-center
        "
        >
          {/* ================= MOVING TEXT ================= */}

          <div className="ticker-track">
            <span className="ticker-text">{newsText}</span>

            {/* Duplicate for infinite smooth loop */}

            <span className="ticker-text">{newsText}</span>
          </div>
        </div>

        {/* ================= STYLE ================= */}

        <style>{`
        .ticker-track {
          display: flex;
          width: max-content;
          animation: tickerMove 40s linear infinite;
        }

        .ticker-text {
          white-space: nowrap;
          color: white;
          font-size: 14px;
          font-weight: 500;
          padding-right: 80px;
          display: flex;
          align-items: center;
        }

        @media (min-width: 768px) {
          .ticker-text {
            font-size: 15px;
          }
        }

        @keyframes tickerMove {
          0% {
            transform: translateX(0%);
          }

          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>
      </div>
      <NewsTickerModal
        open={showNewsModal}
        onClose={() => setShowNewsModal(false)}
        announcements={announcements}
      />
    </>
  );
};

export default NewsTicker;
