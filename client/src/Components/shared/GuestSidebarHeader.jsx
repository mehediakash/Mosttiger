import React from "react";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { FaSignInAlt, FaUserPlus } from "react-icons/fa";

const GuestSidebarHeader = ({ onLogin, onSignUp }) => {
  const { user } = useSelector((state) => state.auth || {});
  const { t } = useTranslation();
  // Only show for guests
  if (user) return null;

  return (
    <div
      className="
        overflow-hidden

        rounded-[22px]

        border
        border-[#16314D]

        bg-[#0B1220]/95

        shadow-[0_10px_40px_rgba(0,0,0,0.45)]

        backdrop-blur-md
      "
    >
      {/* TOP HEADER */}
      <div
        className="
          relative

          flex
          items-center

          gap-4

          px-4
          py-4
        "
      >
        {/* VIDEO COIN */}
        <div
          className="
            relative
        text-4xl
        font-bold
        items-center
        text-center
        leading-[75px]
            w-[74px]
            h-[74px]

            rounded-full

            overflow-hidden

            border-[3px]
            border-primary
            !text-[#F5FAFF]

            shadow-[0_0_25px_rgba(0,229,255,0.3)]

            flex-shrink-0
          "
        >
          10X
        </div>

        {/* TEXT */}
        <div className="flex flex-col">
          <span
            className="
              !text-[#F5FAFF]

              text-[22px]
              font-extrabold

              tracking-wide
            "
          >
            {t("hiWelcome")}
          </span>

          <p
            className="
              mt-1

              !text-[#8FA6BC]
              text-sm
              font-medium
            "
          >
            {t("pleaseLoginOrCreateAccount")}
          </p>
        </div>

        {/* LIGHT EFFECT */}
        <div
          className="
            absolute
            inset-0

           
            from-white/[0.03]
            to-transparent

            pointer-events-none
          "
        />
      </div>

      {/* BUTTON AREA */}
      <div
        className="
          grid
          grid-cols-2

          border-t
          border-[#16314D]
        "
      >
        {/* LOGIN */}
        <button
          onClick={onLogin}
          className="
            h-[58px]

            flex
            items-center
            justify-center

            gap-1

            bg-primary

            !text-black
            text-[15px]
            font-bold

            transition-all
            duration-300

            hover:bg-[#48DDFF]
          "
        >
          <FaSignInAlt className="text-[18px]" />
          {t("login")}
        </button>

        {/* SIGNUP */}
        <button
          onClick={onSignUp}
          className="
            h-[58px]

            flex
            items-center
            justify-center

            gap-1

            bg-primary

            !text-black
            text-[15px]
            font-bold

            border-l
            border-[#16314D]

            transition-all
            duration-300

            hover:bg-[#48DDFF]
          "
        >
          <FaUserPlus className="text-[18px]" />
          {t("signup")}
        </button>
      </div>
    </div>
  );
};

export default GuestSidebarHeader;
