import React, {
  lazy,
  Suspense,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import { Swiper, SwiperSlide } from "swiper/react";

import { Autoplay, Navigation } from "swiper/modules";
import { useTranslation } from "react-i18next";
import { getFavoriteSliderBanners } from "../services/cmsBannerService";
import { useCasinoGameLaunch } from "../../hooks/useCasinoGameLaunch";
import "swiper/css";
import "swiper/css/navigation";

const LazyLoginModal = lazy(() => import("../Modal/LoginModal"));
const FAVOURITE_GAME_CODE = "4451";

const FavouriteSlider = () => {
  const { t } = useTranslation();
  const { launchGame, gameLoading, showLoginModal, closeLoginModal } =
    useCasinoGameLaunch();
  const [cmsBanners, setCmsBanners] = useState([]);
  const favouriteGame = useMemo(
    () => ({
      id: FAVOURITE_GAME_CODE,
      name: `Game ${FAVOURITE_GAME_CODE}`,
    }),
    [],
  );

  useEffect(() => {
    let mounted = true;

    const loadBanners = async () => {
      try {
        const response = await getFavoriteSliderBanners();
        const items = response.data?.data?.banners || response.data?.data || [];

        if (!mounted) return;

        setCmsBanners(
          Array.isArray(items)
            ? items
                .filter((banner) => banner?.image)
                .map((banner) => ({
                  id: banner._id || banner.id,
                  image: banner.image,
                }))
            : [],
        );
      } catch (err) {
        if (!mounted) return;
        console.error("Failed to load favorite slider banners:", err);
        setCmsBanners([]);
      }
    };

    loadBanners();

    return () => {
      mounted = false;
    };
  }, []);

  const favouriteBanners = useMemo(() => cmsBanners, [cmsBanners]);

  const handleBannerClick = useCallback(() => {
    launchGame(favouriteGame);
  }, [favouriteGame, launchGame]);

  return (
    <>
      <div className="w-full bg-[#050912] py-3">
        {/* TITLE */}
        <div className="flex items-center gap-2 mb-3 px-1">
          <div className="w-[5px] h-5 bg-primary rounded-full" />

          <h2
            className="
            text-[#F5FAFF]
            text-sm
            sm:text-base
            font-semibold
          "
          >
            {t("favourites")}
          </h2>
        </div>

        {/* SLIDER */}
        <Swiper
          modules={[Autoplay, Navigation]}
          spaceBetween={10}
          slidesPerView={1.2}
          loop={true}
          speed={700}
          autoplay={{
            delay: 3000,
            disableOnInteraction: false,
          }}
          breakpoints={{
            480: {
              slidesPerView: 1.5,
            },

            640: {
              slidesPerView: 2,
            },

            1024: {
              slidesPerView: 3,
            },
          }}
          className="favourite-swiper"
        >
          {favouriteBanners.map((banner) => (
            <SwiperSlide key={banner.id}>
              <button
                type="button"
                onClick={handleBannerClick}
                disabled={gameLoading}
                className="
    relative
    overflow-hidden
    rounded-lg

    bg-[#0B1220]
    border
    border-[#16314D]
    hover:border-primary/50

    w-full
    p-0
    appearance-none

    cursor-pointer
    group

    flex
    items-center
    justify-center
    disabled:opacity-50
    disabled:cursor-not-allowed
  "
                aria-label={`Play game ${FAVOURITE_GAME_CODE}`}
              >
                <img
                  src={banner.image}
                  alt="Favourite Banner"
                  loading="lazy"
                  decoding="async"
                  className="
    w-full

    h-[140px]
    sm:h-[170px]
    lg:h-[190px]
    xl:h-[210px]

    object-contain

    bg-[#111111]

    transition-all
    duration-500

    group-hover:scale-[1.02]
  "
                />
              </button>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

      <Suspense fallback={null}>
        {showLoginModal ? (
          <LazyLoginModal isOpen={showLoginModal} onClose={closeLoginModal} />
        ) : null}
      </Suspense>
    </>
  );
};

export default React.memo(FavouriteSlider);
