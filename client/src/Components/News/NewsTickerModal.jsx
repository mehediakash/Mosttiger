import React, { useEffect } from "react";
import {
  FaTelegramPlane,
  FaWhatsapp,
  FaFacebookF,
  FaTimes,
} from "react-icons/fa";

import { MdEmail, MdOutlineSupportAgent } from "react-icons/md";

const NewsTickerModal = ({ open, onClose, announcements = [] }) => {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="
        fixed
        inset-0
        z-[99999]

        bg-black/60
        backdrop-blur-sm

        flex
        items-start
        justify-center

        px-3
        py-6
      "
    >
      {/* MODAL */}
      <div
        className="
          w-full
          max-w-[520px]

          rounded-[28px]

          overflow-hidden

          bg-[#161616]

          border
          border-white/10

          shadow-[0_20px_60px_rgba(0,0,0,0.65)]

          animate-[slideDown_.35s_ease-out]
        "
      >
        {/* HEADER */}
        <div
          className="
            relative

            flex
            items-center
            justify-center

            px-5
            py-5

            border-b
            border-white/5
          "
        >
          <h2
            className="
              text-white
              text-[22px]
              font-bold
              tracking-wide
            "
          >
            Announcements
          </h2>

          {/* CLOSE BUTTON */}
          <button
            onClick={onClose}
            className="
              absolute
              right-4

              w-10
              h-10

              rounded-full

              bg-white/5
              hover:bg-white/10

              flex
              items-center
              justify-center

              text-white

              transition-all
              duration-300
            "
          >
            <FaTimes className="text-lg" />
          </button>
        </div>

        {/* BODY */}
        <div
          className="
            max-h-[75vh]

            overflow-y-auto

            px-4
            py-4

            scrollbar-hide
          "
        >
          {/* SOCIAL ICONS */}
          <div
            className="
              flex
              items-center
              justify-center

              flex-wrap

              gap-3

              mb-5
            "
          >
            <a
              href="#"
              className="
                w-12
                h-12

                rounded-full

                bg-[#229ED9]

                flex
                items-center
                justify-center

                text-white
                text-xl

                hover:scale-105

                transition-all
                duration-300
              "
            >
              <FaTelegramPlane />
            </a>

            <a
              href="mailto:mosttiger000@gmail.com"
              className="
                w-12
                h-12

                rounded-full

                bg-[#EA4335]

                flex
                items-center
                justify-center

                text-white
                text-xl

                hover:scale-105

                transition-all
                duration-300
              "
            >
              <MdEmail />
            </a>

            <a
              // href="https://wa.me/447464699055"
              target="_blank"
              rel="noreferrer"
              className="
                w-12
                h-12

                rounded-full

                bg-[#25D366]

                flex
                items-center
                justify-center

                text-white
                text-xl

                hover:scale-105

                transition-all
                duration-300
              "
            >
              <FaWhatsapp />
            </a>

            <a
              href="https://facebook.com"
              target="_blank"
              rel="noreferrer"
              className="
                w-12
                h-12

                rounded-full

                bg-[#1877F2]

                flex
                items-center
                justify-center

                text-white
                text-xl

                hover:scale-105

                transition-all
                duration-300
              "
            >
              <FaFacebookF />
            </a>

            <a
              href="#"
              className="
                w-12
                h-12

                rounded-full

                bg-[#5865F2]

                flex
                items-center
                justify-center

                text-white
                text-xl

                hover:scale-105

                transition-all
                duration-300
              "
            >
              <MdOutlineSupportAgent />
            </a>
          </div>

          {/* ANNOUNCEMENTS */}
          <div className="space-y-5">
            {announcements.map((item) => (
              <div
                key={item._id}
                className="
                  bg-[#1d1d1d]

                  rounded-2xl

                  border
                  border-white/5

                  p-4
                "
              >
                {/* DATE */}
                <div
                  className="
                    inline-flex

                    items-center
                    justify-center

                    px-3
                    py-1

                    rounded-full

                    bg-primary

                    text-black
                    text-xs
                    font-bold
                  "
                >
                  {item.createdAt
                    ? new Date(item.createdAt).toLocaleDateString()
                    : "Announcement"}
                </div>

                {/* TEXT */}
                <p
                  className="
                    mt-4

                    text-[#d4d4d4]
                    text-sm
                    leading-7

                    whitespace-pre-line
                  "
                >
                  {item.message}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ANIMATION */}
      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-40px) scale(0.98);
          }

          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }

        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};

export default NewsTickerModal;
