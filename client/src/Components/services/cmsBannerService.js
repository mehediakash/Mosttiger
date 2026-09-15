import { cachedGet } from "../axios/axios";

export const CMS_BANNER_TYPES = {
  FAVORITE_SLIDER: "favorite-slider",
  HOME_SLIDER: "home-slider",
  PROMOTION_BANNER: "promotion-banner",
  POPUP_BANNER: "popup-banner",
  ANNOUNCEMENT_BANNER: "announcement-banner",
};

export const getPublicBannersByType = (bannerType) =>
  cachedGet(
    `/api/cms/banners/${bannerType}`,
    {},
    {
      ttl: 60000,
      key: `cms:banners:${bannerType}`,
    },
  );

export const getFavoriteSliderBanners = () =>
  getPublicBannersByType(CMS_BANNER_TYPES.FAVORITE_SLIDER);

export default {
  CMS_BANNER_TYPES,
  getPublicBannersByType,
  getFavoriteSliderBanners,
};
