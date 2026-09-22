import React from "react";
import {
  FaFacebookF,
  FaInstagram,
  FaTelegramPlane,
  FaPinterestP,
} from "react-icons/fa";
import { BsTwitterX } from "react-icons/bs";
import { useTranslation } from "react-i18next";
const ambassadors = [
  {
    name: "Quinton de Kock",
    role: "southAfricanCricketer",
    image: "https://bajiwala88.live/img/ambassadors/quinton-de-kock.png",
  },
  {
    name: "Monami Ghosh",
    role: "filmTelevisionSuperstar",
    image: "https://bajiwala88.live/img/ambassadors/monami-ghosh.png",
  },
  {
    name: "David De Gea",
    role: "spanishProfessionalFootballer",
    image: "https://bajiwala88.live/img/ambassadors/david-de-gea.png",
  },
  {
    name: "Sunny Leone",
    role: "actress",
    image: "https://bajiwala88.live/img/ambassadors/sunny-leone.png",
  },
];

const socialLinks = [
  {
    icon: <FaFacebookF />,
    bg: "bg-[#1877F2]",
  },
  {
    icon: <FaInstagram />,
    bg: "bg-gradient-to-r from-[#F58529] via-[#DD2A7B] to-[#8134AF]",
  },
  {
    icon: <BsTwitterX />,
    bg: "bg-black",
  },
  {
    icon: <FaTelegramPlane />,
    bg: "bg-[#229ED9]",
  },
  {
    icon: <FaPinterestP />,
    bg: "bg-[#E60023]",
  },
];

const paymentMethods = [
  "https://img.d4040p.com/dp/h5/assets/images/footer/color-black/pay22.png?v=1783417384360&source=mcdsrc",
  "https://img.d4040p.com/dp/h5/assets/images/footer/color-black/pay34.png?v=1783417384360&source=mcdsrc",
  "	https://img.d4040p.com/dp/h5/assets/images/footer/color-black/pay33.png?v=1783417384360&source=mcdsrc",
  "	https://img.d4040p.com/dp/h5/assets/images/footer/color-black/pay45.png?v=1783417384360&source=mcdsrc",
];

const footerLinks = [
  "aboutUsLink",
  "privacyPolicy",
  "termsConditions",
  "rulesRegulation",
  "responsibleGaming",
  "faq",
];

const Footer = () => {
  const { t } = useTranslation();
  return (
    <footer className="w-full bg-black text-white pt-3 md:pb-5 pb-24">
      <div className=" mx-auto px-2 md:px-3">
        {/* ================= Brand Ambassador ================= */}

        <div className="mb-3">
          <h3 className="text-white text-[15px] md:text-[18px] font-bold mb-2">
            {t("brandAmbassador")}
          </h3>

          <div className="bg-[#2b2b2b] rounded-md p-3">
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {ambassadors.map((item, index) => (
                <div key={index} className="flex flex-col items-start">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="
                      h-[32px]
                      object-contain
                      mb-2
                    "
                  />

                  <h4 className="text-white text-[14px] font-bold leading-tight">
                    {item.name}
                  </h4>

                  <p className="text-white italic text-[12px] md:text-[13px] leading-tight opacity-90">
                    {t(item.role)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ================= Official Partner ================= */}

        <div className="mb-3">
          <h3 className="text-white text-[15px] md:text-[18px] font-bold mb-2">
            {t("officialPartner")}
          </h3>

          <div className="bg-[#2b2b2b] rounded-md p-3 flex items-center">
            <img
              src="https://img.d4040p.com/dp/h5/assets/images/footer/color-black/official-partner-heyvip.png?v=1783417384360&source=mcdsrc"
              alt="Official Partner"
              className="h-[20px] object-contain"
            />
          </div>
        </div>

        {/* ================= Community Websites ================= */}

        <div className="mb-3">
          <h3 className="text-white text-[15px] md:text-[18px] font-bold mb-2">
            {t("communityWebsites")}
          </h3>

          <div className="bg-[#2b2b2b] rounded-md p-3">
            <div className="flex flex-wrap items-center gap-3">
              {socialLinks.map((item, index) => (
                <button
                  key={index}
                  className={`
                    ${item.bg}
                    w-10
                    h-10
                    rounded-full
                    flex
                    items-center
                    justify-center
                    text-white
                    text-[18px]
                    hover:scale-110
                    transition-all
                    duration-300
                  `}
                >
                  {item.icon}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ================= Payment Methods ================= */}

        <div className="mb-3">
          <h3 className="text-white text-[15px] md:text-[18px] font-bold mb-2">
            {t("paymentMethods")}
          </h3>

          <div className="bg-[#2b2b2b] rounded-md p-3">
            <div className="flex flex-wrap items-center gap-2">
              {paymentMethods.map((item, index) => (
                <div
                  key={index}
                  className="
                    bg-white
                    rounded-sm
                    overflow-hidden
                    h-[34px]
                    w-[56px]
                    flex
                    items-center
                    justify-center
                  "
                >
                  <img
                    src={item}
                    alt="payment"
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ================= About Us ================= */}

        <div className="mb-3">
          <h3 className="text-white text-[15px] md:text-[18px] font-bold mb-2">
            {t("aboutUs")}
          </h3>

          <div className="bg-[#2b2b2b] rounded-md px-3 py-4">
            <div
              className="
                flex
                flex-wrap
                items-center
                justify-center
                md:justify-start
                gap-y-2
              "
            >
              {footerLinks.map((item, index) => (
                <React.Fragment key={index}>
                  <button
                    className="
                      text-primary
                      text-[13px]
                      md:text-[15px]
                      font-semibold
                      hover:underline
                      transition-all
                    "
                  >
                    {t(item)}
                  </button>

                  {index !== footerLinks.length - 1 && (
                    <span className="mx-3 text-white opacity-60">:</span>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        {/* ================= Copyright ================= */}

        <div className="text-center pt-2">
          <a
            href="https://t.me/gamebetxofficial"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#229ED9] hover:underline"
          >
            <p className="text-white text-[13px] md:text-[15px] font-semibold">
              {t("copyright")}
            </p>
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
