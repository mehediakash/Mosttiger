import React, { useEffect, useState } from "react";
import { FaBullhorn } from "react-icons/fa";
import NewsTickerModal from "./NewsTickerModal";
import { cachedGet } from "../axios/axios";

const NewsTicker = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [showNewsModal, setShowNewsModal] = useState(false);

  useEffect(() => {
    let mounted = true;

    cachedGet("/api/announcements/active", {}, { ttl: 30000 })
      .then((response) => {
        const data = response.data?.data || response.data || [];
        if (mounted) setAnnouncements(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (mounted) setAnnouncements([]);
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (!announcements.length) return null;

  const newsText = announcements
    .map((item) => item.message)
    .join("     |     ");

  return (
    <>
      <div
        className="
        w-full
        overflow-hidden
        bg-[#111111]
        border-y
        border-[#2a2a2a]
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
