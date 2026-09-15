import React, {
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { useNavigate } from "react-router-dom";
import promoService from "../Components/services/promoService";
import { FaTimes, FaClock, FaGift } from "react-icons/fa";
import { useTranslation } from "react-i18next";
const PromotionsModal = ({ open = true, onClose }) => {
  const navigate = useNavigate();

  const [activeCategory, setActiveCategory] = useState("ALL");
  const [promotions, setPromotions] = useState([]);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedPromotion, setSelectedPromotion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchedRef = useRef(false);

  useEffect(() => {
    const fetchPromotions = async () => {
      try {
        setLoading(true);

        const res = await promoService.getActivePromotions();

        const payload = res?.data?.data || res?.data || [];

        const promotionsList = Array.isArray(payload) ? payload : [];

        setPromotions(
          promotionsList.filter((promo) => promo.isEligible !== false),
        );

        setError(null);
      } catch (err) {
        console.error("Fetch promotions error:", err);

        const msg =
          err?.response?.data?.message ||
          err?.message ||
          "Failed to load promotions";

        setError(msg);
        setPromotions([]);
      } finally {
        setLoading(false);
      }
    };

    if (!open) return;

    if (fetchedRef.current) return;

    fetchedRef.current = true;
    console.debug("PromotionsModal: fetchPromotions called");

    fetchPromotions();
  }, [open]);

  // Reset fetched guard when modal closes so it can refetch next open
  useEffect(() => {
    if (!open) {
      fetchedRef.current = false;
    }
  }, [open]);

  const categories = useMemo(() => {
    const catSet = new Set();

    promotions.forEach((p) => {
      (p.allowedCategories || []).forEach((c) => {
        if (c && c !== "ALL") {
          catSet.add(c);
        }
      });
    });

    return ["ALL", ...Array.from(catSet)];
  }, [promotions]);

  const filteredPromotions = useMemo(() => {
    if (activeCategory === "ALL") {
      return promotions;
    }

    return promotions.filter((promo) =>
      promo.allowedCategories?.includes(activeCategory),
    );
  }, [activeCategory, promotions]);

  if (!open) return null;
  const { t, i18n } = useTranslation();
  const handleClose = () => {
    if (typeof onClose === "function") {
      onClose();
      return;
    }

    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate("/");
  };

  const handleViewDetails = useCallback((promo) => {
    setSelectedPromotion(promo);
    setDetailsOpen(true);
  }, []);

  const formatExpiryDate = (expiresAt) => {
    if (!expiresAt) return "Expires Soon";

    const today = new Date();
    const expiry = new Date(expiresAt);

    const daysLeft = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

    if (daysLeft <= 0) return "Expired";

    return `${daysLeft} Days Left`;
  };

  const getBonusDescription = (bonusConfig) => {
    if (!bonusConfig) return "Special Offer";

    if (bonusConfig.bonusPercent) {
      return `${bonusConfig.bonusPercent}% Bonus • Min ৳${
        bonusConfig.minDeposit || 0
      }`;
    }

    if (bonusConfig.fixedBonusAmount) {
      return `৳${bonusConfig.fixedBonusAmount} Bonus`;
    }

    return "Special Offer";
  };

  return (
    <div
      className="
        fixed
        inset-0
        z-99999
        bg-black/70
        backdrop-blur-md
        flex
        items-start
        justify-center
        overflow-hidden
        px-3
        py-4
      "
    >
      <div
        className="
          w-full
          max-w-140
          max-h-[92vh]
          rounded-[30px]
          overflow-hidden
          bg-[#0B1220]
          border
          border-[#16314D]
          shadow-[0_20px_60px_rgba(0,0,0,0.85)]
          animate-[slideDown_.35s_ease-out]
          flex
          flex-col
        "
      >
        {/* HEADER */}
        <div
          className="
            relative
            flex
            items-center
            justify-center
            py-5
            px-5
            border-b
            border-[#16314D]
          "
        >
          <h2
            className="
              text-[#F5FAFF]
              text-[24px]
              font-bold
            "
          >
            {t("promotions")}
          </h2>

          <button
            type="button"
            onClick={handleClose}
            className="
              absolute
              right-4
              w-10
              h-10
              rounded-full
              bg-[#050912]
              border
              border-[#16314D]
              hover:bg-[#16314D]/40
              flex
              items-center
              justify-center
              text-[#8FA6BC]
              hover:text-[#F5FAFF]
              transition-all
              duration-300
            "
          >
            <FaTimes />
          </button>
        </div>

        {/* CATEGORIES */}
        <div
          className="
            px-3
            py-5
            border-b
            border-[#16314D]
            overflow-x-auto
            scrollbar-hide
          "
        >
          <div className="flex gap-2 min-w-max">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`
                  px-4
                  py-2
                  rounded-full
                  text-sm
                  font-semibold
                  whitespace-nowrap
                  transition-all
                  duration-300

                  ${
                    activeCategory === category
                      ? `
                        bg-primary
                        text-[#050912]
                        shadow-[0_4px_14px_rgba(0,229,255,0.4)]
                        font-bold
                      `
                      : `
                        bg-[#050912]
                        text-[#8FA6BC]
                        hover:bg-[#16314D]/40
                        hover:text-[#F5FAFF]
                        border
                        border-[#16314D]
                      `
                  }
                `}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* CONTENT */}
        <div
          className="
            flex-1
            overflow-y-auto
            p-4
            space-y-5
            scrollbar-hide
          "
        >
          {/* LOADING */}
          {loading && (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>

                <p className="text-[#d1d1d1]">{t("loadingPromotions")}</p>
              </div>
            </div>
          )}

          {/* ERROR */}
          {error && (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <p className="text-red-500 mb-2">
                  {t("errorLoadingPromotions")}
                </p>

                <p className="text-[#d1d1d1] text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* PROMOTIONS */}
          {!loading && !error ? (
            filteredPromotions.length > 0 ? (
              filteredPromotions.map((promo) => {
                const isExpired = promo.expiresAt
                  ? new Date(promo.expiresAt) <= new Date()
                  : false;

                const isInactive = promo.status && promo.status !== "active";

                return (
                  <div
                    key={promo._id}
                    className="
                      overflow-hidden
                      rounded-3xl
                      bg-[#050912]
                      border
                      border-[#16314D]
                      shadow-[0_10px_35px_rgba(0,0,0,0.4)]
                    "
                  >
                    {/* IMAGE */}
                    <div className="relative">
                      <img
                        src={
                          promo.imageUrl ||
                          "https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=1400&auto=format&fit=crop"
                        }
                        alt={promo.title}
                        className="
                          w-full
                          h-47.5
                          object-cover
                        "
                        onError={(e) => {
                          e.currentTarget.src =
                            "https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=1400&auto=format&fit=crop";
                        }}
                      />

                      <div
                        className="
                          absolute
                          inset-0
                          bg-gradient-to-t
                          from-black/70
                          via-black/20
                          to-transparent
                        "
                      />

                      <div
                        className="
                          absolute
                          top-4
                          left-4
                          flex
                          items-center
                          gap-2
                          px-3
                          py-2
                          rounded-full
                          bg-primary
                          text-[#050912]
                          text-xs
                          font-bold
                          shadow-[0_0_10px_rgba(0,229,255,0.3)]
                        "
                      >
                        <FaGift />

                        {promo.allowedCategories?.[0]
                          ? t(promo.allowedCategories[0])
                          : promo.type
                            ? t(promo.type)
                            : t("promotion")}
                      </div>
                    </div>

                    {/* BODY */}
                    <div className="p-5">
                      <h3
                        className="
                          text-[#F5FAFF]
                          text-[20px]
                          font-bold
                          leading-8
                        "
                      >
                        {promo.title}
                      </h3>

                      <div
                        className="
                          mt-3
                          flex
                          items-center
                          gap-2
                          text-[#8FA6BC]
                          text-sm
                        "
                      >
                        <FaClock className="text-primary" />

                        <span>{formatExpiryDate(promo.expiresAt)}</span>
                      </div>

                      <p
                        className="
                          mt-3
                          text-primary
                          text-[13px]
                          font-semibold
                        "
                      >
                        {getBonusDescription(promo.bonusConfig)}
                      </p>

                      <p
                        className="
                          mt-4
                          text-[#8FA6BC]
                          text-[14px]
                          leading-7
                          line-clamp-3
                        "
                      >
                        {promo.shortDescription ||
                          promo.fullDescription ||
                          "Special promotion offer"}
                      </p>

                      <div
                        className="
                          mt-5
                          flex
                          items-center
                          gap-3
                        "
                      >
                        {/* APPLY */}
                        <button
                          className="
                            flex-1
                            h-12
                            rounded-2xl
                            bg-[#0B1220]
                            text-[#F5FAFF]
                            border
                            border-[#16314D]
                            text-sm
                            font-semibold
                            hover:bg-[#16314D]/40
                            transition-all
                            duration-300
                            disabled:opacity-50
                          "
                          onClick={() => {
                            if (isExpired || isInactive) return;

                            try {
                              sessionStorage.setItem(
                                "selectedPromotion",
                                JSON.stringify(promo),
                              );
                            } catch (e) {}

                            navigate("/deposit", {
                              state: {
                                selectedPromotion: promo,
                              },
                            });
                          }}
                          disabled={isExpired || isInactive}
                        >
                          {t("applyNow")}
                        </button>

                        {/* DETAILS */}
                        <button
                          onClick={() => handleViewDetails(promo)}
                          className="
                            flex-1
                            h-12
                            rounded-2xl
                            bg-primary
                            text-[#050912]
                            text-sm
                            font-bold
                            hover:bg-[#48DDFF]
                            shadow-[0_0_15px_rgba(0,229,255,0.3)]
                            transition-all
                            duration-300
                          "
                        >
                          {t("viewDetails")}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div
                className="
                  flex
                  items-center
                  justify-center
                  py-16
                  text-[#9c9c9c]
                  text-sm
                "
              >
                {t("noPromotionsAvailable")}
              </div>
            )
          ) : null}
        </div>

        {/* DETAILS MODAL - Root Level Rendering */}
        {detailsOpen && selectedPromotion && (
          <div
            className="
              fixed
              inset-0
              z-50
              flex
              items-center
              justify-center
              bg-black/70
              px-3
              py-4
              sm:px-4
              sm:py-6
            "
          >
            <div
              className="
                w-full
                max-h-[90vh]
                sm:max-h-[85vh]
                max-w-sm
                sm:max-w-md
                lg:max-w-3xl
                rounded-2xl
                overflow-hidden
                bg-[#0B1220]
                border
                border-[#16314D]
                shadow-[0_20px_60px_rgba(0,0,0,0.85)]
                flex
                flex-col
              "
            >
              {/* HEADER */}
              <div
                className="
                  flex
                  items-center
                  justify-between
                  p-4
                  sm:p-5
                  border-b
                  border-[#16314D]
                  shrink-0
                "
              >
                <h3 className="text-[#F5FAFF] text-base sm:text-lg font-bold truncate pr-4">
                  {selectedPromotion.title}
                </h3>

                <button
                  type="button"
                  onClick={() => setDetailsOpen(false)}
                  className="
                    text-[#8FA6BC]
                    hover:text-[#F5FAFF]
                    shrink-0
                    text-xl
                  "
                >
                  ✕
                </button>
              </div>

              {/* SCROLLABLE BODY */}
              <div
                className="
                  flex-1
                  overflow-y-auto
                  p-4
                  sm:p-5
                  scrollbar-hide
                "
              >
                <div
                  className="
                    grid
                    grid-cols-1
                    lg:grid-cols-3
                    gap-4
                  "
                >
                  {/* IMAGE */}
                  <div className="lg:col-span-1">
                    <img
                      src={
                        selectedPromotion.imageUrl ||
                        selectedPromotion.image ||
                        "https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=1400&auto=format&fit=crop"
                      }
                      alt={selectedPromotion.title}
                      className="
                        w-full
                        h-40
                        sm:h-48
                        object-cover
                        rounded-lg
                      "
                      onError={(e) => {
                        e.currentTarget.src =
                          "https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=1400&auto=format&fit=crop";
                      }}
                    />

                    {(selectedPromotion.newUserOnly ||
                      selectedPromotion.firstDepositOnly) && (
                      <div className="absolute top-4 right-4 rounded-full bg-primary px-3 py-2 text-[11px] font-bold text-[#050912] shadow-[0_0_15px_rgba(0,229,255,0.35)]">
                        {t("newUserOnly")}
                      </div>
                    )}

                    {(selectedPromotion.newUserOnly ||
                      selectedPromotion.firstDepositOnly) && (
                      <div className="mt-3 inline-flex rounded-full bg-primary px-3 py-1.5 text-[11px] font-bold text-[#050912] shadow-[0_0_15px_rgba(0,229,255,0.35)]">
                        {t("newUserOnly")}
                      </div>
                    )}
                  </div>

                  {/* CONTENT */}
                  <div
                    className="
                      lg:col-span-2
                      text-xs
                      sm:text-sm
                      text-[#8FA6BC]
                    "
                  >
                    <p className="text-primary font-semibold">
                      {getBonusDescription(selectedPromotion.bonusConfig)}
                    </p>

                    <p className="mt-2 sm:mt-3 text-[#F5FAFF] font-bold text-base sm:text-lg">
                      {selectedPromotion.title}
                    </p>

                    <p className="mt-2 sm:mt-3 leading-relaxed line-clamp-none text-[#8FA6BC]">
                      {selectedPromotion.fullDescription ||
                        selectedPromotion.shortDescription}
                    </p>

                    <div
                      className="
                        mt-3
                        sm:mt-4
                        grid
                        grid-cols-1
                        sm:grid-cols-2
                        gap-2
                        sm:gap-3
                        text-xs
                        text-[#8FA6BC]
                      "
                    >
                      <div>
                        <div className="font-semibold text-[#F5FAFF]">
                          {t("turnoverMultiplier")}
                        </div>

                        <div className="mt-1 text-primary">
                          {selectedPromotion.bonusConfig?.turnoverMultiplier
                            ? `${selectedPromotion.bonusConfig.turnoverMultiplier}x`
                            : "N/A"}
                        </div>
                      </div>

                      <div>
                        <div className="font-semibold text-[#F5FAFF]">
                          {t("expiry")}
                        </div>

                        <div className="mt-1">
                          {selectedPromotion.isLifetime
                            ? t("lifetime")
                            : selectedPromotion.expiresAt
                              ? new Date(
                                  selectedPromotion.expiresAt,
                                ).toLocaleDateString("en-GB", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                })
                              : t("noExpiry")}
                        </div>
                      </div>

                      <div>
                        <div className="font-semibold text-[#F5FAFF]">
                          {t("freeSpins")}
                        </div>

                        <div className="mt-1">
                          {selectedPromotion.freeSpinConfig?.freeSpinCount
                            ? `${selectedPromotion.freeSpinConfig.freeSpinCount} spins • ৳${selectedPromotion.freeSpinConfig.freeSpinValue || 0}`
                            : "None"}
                        </div>
                      </div>

                      <div>
                        <div className="font-semibold text-[#F5FAFF]">
                          {t("minMaxDeposit")}
                        </div>

                        <div className="mt-1">
                          Min: ৳{selectedPromotion.bonusConfig?.minDeposit || 0}{" "}
                          • Max:{" "}
                          {selectedPromotion.bonusConfig?.maxDeposit
                            ? `৳${selectedPromotion.bonusConfig.maxDeposit}`
                            : "∞"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ACTIONS FOOTER */}
              <div
                className="
                  flex
                  gap-2
                  sm:gap-3
                  p-4
                  sm:p-5
                  border-t
                  border-[#16314D]
                  shrink-0
                  flex-wrap
                  sm:flex-nowrap
                "
              >
                <button
                  type="button"
                  onClick={() => {
                    try {
                      sessionStorage.setItem(
                        "selectedPromotion",
                        JSON.stringify(selectedPromotion),
                      );
                    } catch (e) {}

                    navigate("/deposit", {
                      state: {
                        selectedPromotion,
                      },
                    });
                  }}
                  className="
                    flex-1
                    px-4
                    py-2
                    sm:py-3
                    bg-primary
                    text-[#050912]
                    font-bold
                    text-sm
                    sm:text-base
                    rounded-lg
                    hover:bg-[#48DDFF]
                    shadow-[0_0_15px_rgba(0,229,255,0.35)]
                    transition-all
                    duration-200
                  "
                >
                  {t("applyNow")}
                </button>

                <button
                  type="button"
                  onClick={() => setDetailsOpen(false)}
                  className="
                    flex-1
                    px-4
                    py-2
                    sm:py-3
                    border
                    border-[#16314D]
                    rounded-lg
                    text-[#8FA6BC]
                    font-semibold
                    text-sm
                    sm:text-base
                    hover:bg-[#050912]
                    hover:text-[#F5FAFF]
                    transition-all
                    duration-200
                  "
                >
                  {t("close")}
                </button>
              </div>
            </div>
          </div>
        )}

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
    </div>
  );
};

export default PromotionsModal;
