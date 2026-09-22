import React from "react";
import { NavLink } from "react-router-dom";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { FaHome, FaGift, FaWallet, FaUserCircle } from "react-icons/fa";

const MobileBottomNav = () => {
  const user = useSelector((state) => state.auth?.user);
  const { t } = useTranslation();
  // Only show nav if user is logged in
  if (!user) {
    return null;
  }

  const navItems = [
    {
      name: "home",
      icon: FaHome,
      path: "/",
    },
    {
      name: "promo",
      icon: FaGift,
      path: "/promotions",
    },
    {
      name: "deposit",
      icon: FaWallet,
      path: "/deposit",
    },
    {
      name: "account",
      icon: FaUserCircle,
      path: "/profile",
    },
  ];

  return (
    <div
      className="
        fixed
        bottom-0
        left-0
        right-0

        z-[9999]

        md:hidden

      
      
        pt-2

      "
    >
      {/* NAV CONTAINER */}
      <div
        className="
          relative

          h-[72px]

    

          bg-[#151515]/95

          border
          border-white/[0.04]

          shadow-[0_12px_40px_rgba(0,0,0,0.55)]

          flex
          items-center
          justify-around

          overflow-hidden
        "
      >
        {/* TOP LIGHT EFFECT */}

        {navItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink key={item.name} to={item.path} className="relative z-10">
              {({ isActive }) => (
                <div
                  className="
                    relative

                    flex
                    flex-col
                    items-center
                    justify-center

                    w-[74px]

                    transition-all
                    duration-300
                  "
                >
                  {/* ACTIVE BACKGROUND */}
                  <div
                    className={`
                      absolute

                      transition-all
                      duration-300
                      ease-out

                      ${
                        isActive
                          ? `
                            w-[54px]
                            h-[54px]

                            rounded-[18px]

                            bg-primary

                            shadow-[0_8px_24px_rgba(255,225,0,0.35)]

                            scale-100

                            opacity-100
                          `
                          : `
                            w-[44px]
                            h-[44px]

                            opacity-0
                            scale-75
                          `
                      }
                    `}
                  />

                  {/* ICON */}
                  <div
                    className="
                      relative
                      z-10

                      flex
                      items-center
                      justify-center
                    "
                  >
                    <Icon
                      className={`
                        transition-all
                        duration-300

                        ${
                          isActive
                            ? `
                              text-black
                              text-[22px]
                              scale-110
                            `
                            : `
                              text-[#a8a8a8]
                              text-[20px]
                            `
                        }
                      `}
                    />
                  </div>

                  {/* LABEL */}
                  <span
                    className={`
                      relative
                      z-10
                        text-white
                      mt-[6px]

                      text-[11px]
                      font-semibold

                      tracking-wide

                      transition-all
                      duration-300

                      ${
                        isActive
                          ? `
                            !text-black
                            opacity-100
                          `
                          : `
                            
                            opacity-90
                          `
                      }
                    `}
                  >
                    {t(item.name)}
                  </span>
                </div>
              )}
            </NavLink>
          );
        })}
      </div>
    </div>
  );
};

export default MobileBottomNav;
