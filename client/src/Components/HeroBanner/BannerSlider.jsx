import { memo, useEffect, useRef, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Autoplay } from "swiper/modules";
import { IoChevronBack, IoChevronForward } from "react-icons/io5";
import { cachedGet } from "../axios/axios";
import { preloadImages, readCache, writeCache } from "../../utils/homeCache";

import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

const BANNER_CACHE_KEY = "home:banners";
const BANNER_CACHE_TTL = 5 * 60 * 1000;
const FALLBACK_SLIDE = "https://via.placeholder.com/1200x400";

const BannerSlider = () => {
  const cachedBanners = readCache(BANNER_CACHE_KEY, BANNER_CACHE_TTL);
  const [slides, setSlides] = useState(() => {
    if (cachedBanners.hasValue && Array.isArray(cachedBanners.data)) {
      return cachedBanners.data;
    }
    return [];
  });
  const [loading, setLoading] = useState(!cachedBanners.hasValue);

  const prevRef = useRef(null);
  const nextRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    const fetchBanners = async () => {
      try {
        const response = await cachedGet(
          "/api/cms/content/banner",
          {
            params: {
              activeOnly: "true",
            },
          },
          {
            ttl: 30 * 1000,
            key: "cms:banner:activeOnly=true",
          },
        );

        const banners = response.data?.data || [];
        const bannerImages = banners
          .filter((banner) => banner.image)
          .map((banner) => banner.image);

        const nextSlides =
          bannerImages.length > 0 ? bannerImages : [FALLBACK_SLIDE];

        if (!mounted) return;

        setSlides(nextSlides);
        writeCache(BANNER_CACHE_KEY, nextSlides);
        preloadImages(nextSlides);
      } catch (error) {
        if (!mounted) return;
        if (!slides.length) {
          setSlides([FALLBACK_SLIDE]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchBanners();

    return () => {
      mounted = false;
    };
  }, []);

  if (loading && slides.length === 0) {
    return (
      <div className="w-full h-[180px] sm:h-[240px] md:h-[320px] lg:h-[420px] bg-[#050912] flex items-center justify-center">
        <span className="h-6 w-40 animate-pulse rounded-md bg-white/10" />
      </div>
    );
  }

  return (
    <div className="relative w-full overflow-hidden bg-[#050912]">
      <Swiper
        modules={[Navigation, Pagination, Autoplay]}
        loop={slides.length > 1}
        centeredSlides={false}
        slidesPerView={1}
        spaceBetween={12}
        speed={700}
        autoplay={{
          delay: 4000,
          disableOnInteraction: false,
          pauseOnMouseEnter: false,
        }}
        initialSlide={slides.length > 1 ? 1 : 0}
        pagination={{ clickable: true }}
        navigation={{
          prevEl: prevRef.current,
          nextEl: nextRef.current,
        }}
        onBeforeInit={(swiper) => {
          swiper.params.navigation.prevEl = prevRef.current;
          swiper.params.navigation.nextEl = nextRef.current;
        }}
        breakpoints={{
          0: { slidesPerView: 1, centeredSlides: false, spaceBetween: 8 },
          640: { slidesPerView: 1, centeredSlides: false, spaceBetween: 10 },
          768: { slidesPerView: 1, centeredSlides: false, spaceBetween: 12 },
          1024: { slidesPerView: 1, centeredSlides: false, spaceBetween: 14 },
          1440: { slidesPerView: 1.12, centeredSlides: true, spaceBetween: 18 },
          1600: { slidesPerView: 1.35, centeredSlides: true, spaceBetween: 20 },
          1920: { slidesPerView: 1.55, centeredSlides: true, spaceBetween: 24 },
        }}
        className="casino-banner-swiper"
      >
        {slides.map((img, i) => (
          <SwiperSlide key={i}>
            <div className="w-full bg-[#050912] overflow-hidden rounded-xl h-[180px] sm:h-[240px] md:h-[320px] lg:h-[420px]">
              <img
                src={img}
                alt={`banner-${i}`}
                loading={i === 0 ? "eager" : "lazy"}
                decoding="async"
                draggable={false}
                className="w-full h-full object-contain object-center select-none"
              />
            </div>
          </SwiperSlide>
        ))}
      </Swiper>

      <button
        ref={prevRef}
        className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 z-30 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 sm:p-3 transition-all duration-300 backdrop-blur-sm"
      >
        <IoChevronBack size={20} className="sm:w-6 sm:h-6" />
      </button>

      <button
        ref={nextRef}
        className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 z-30 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 sm:p-3 transition-all duration-300 backdrop-blur-sm"
      >
        <IoChevronForward size={20} className="sm:w-6 sm:h-6" />
      </button>

      <style>{`
        .casino-banner-swiper {
          width: 100%;
          padding-top: 10px;
          padding-bottom: 10px;
        }

        .casino-banner-swiper .swiper-slide {
          opacity: 0.55;
          transform: scale(0.94);
          transition: all 0.7s cubic-bezier(0.22, 0.88, 0.36, 1);
          will-change: transform, opacity;
        }

        .casino-banner-swiper .swiper-slide-active {
          opacity: 1;
          transform: scale(1);
        }

        .casino-banner-swiper .swiper-pagination {
          bottom: 0px !important;
        }

        .casino-banner-swiper .swiper-pagination-bullet {
          width: 8px;
          height: 8px;
          background: rgba(255, 255, 255, 0.4);
          opacity: 1;
          transition: all 0.3s ease;
        }

        .casino-banner-swiper .swiper-pagination-bullet-active {
          width: 22px;
          border-radius: 999px;
          background: var(--color-primary);
          box-shadow: 0 0 10px rgba(0, 229, 255, 0.6);
        }

        @media (max-width: 640px) {
          .casino-banner-swiper .swiper-pagination-bullet {
            width: 6px;
            height: 6px;
          }

          .casino-banner-swiper .swiper-pagination-bullet-active {
            width: 18px;
          }
        }
      `}</style>
    </div>
  );
};

export default memo(BannerSlider);
