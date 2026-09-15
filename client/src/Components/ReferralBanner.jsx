import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import api from "../Components/axios/axios";

const ReferralBanner = () => {
  const { user, token } = useSelector((state) => state.auth);
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Check if user is logged in
  const isAuthenticated = useMemo(() => !!user && !!token, [user, token]);

  useEffect(() => {
    // Don't fetch promotions if user is logged in
    if (isAuthenticated) {
      setLoading(false);
      return;
    }

    const fetchPromotions = async () => {
      try {
        // Check cache first
        const cachedData = sessionStorage.getItem("referral_promotions");
        const cacheTime = sessionStorage.getItem("referral_promotions_time");

        if (cachedData && cacheTime) {
          const age = Date.now() - parseInt(cacheTime);
          if (age < 5 * 60 * 1000) {
            // Use cache if less than 5 minutes old
            setPromotions(JSON.parse(cachedData));
            setLoading(false);
            return;
          }
        }

        const response = await api.get("/api/cms/content/promotion", {
          params: { activeOnly: "true" },
        });

        const promotionImages = response.data?.data || [];
        setPromotions(promotionImages.length > 0 ? promotionImages : []);

        // Cache the promotions
        sessionStorage.setItem(
          "referral_promotions",
          JSON.stringify(promotionImages),
        );
        sessionStorage.setItem(
          "referral_promotions_time",
          Date.now().toString(),
        );
      } catch (error) {
        console.error("Failed to fetch promotion banners:", error);
        setPromotions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPromotions();
  }, [isAuthenticated]);

  // Don't render if user is logged in
  if (isAuthenticated) {
    return null;
  }

  if (loading) {
    return (
      <section className="w-full bg-[white] px-4 py-6 sm:py-10">
        <div className="mx-auto max-w-7xl">
          <div className="flex h-48 items-center justify-center rounded-2xl bg-black">
            <div className="text-gray-600 animate-pulse">
              Loading promotions...
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (promotions.length === 0) {
    return null;
  }

  return (
    <section className="w-full  px-4 py-6 sm:py-10">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-4 text-center sm:mb-6">
          <h2 className="text-lg font-semibold tracking-wide text-black sm:text-2xl">
            Referral Program
          </h2>
        </div>

        {/* Banner Cards */}
        <div className="space-y-4">
          {promotions.map((promo) => (
            <Link
              key={promo._id}
              to="/register"
              className="group block overflow-hidden rounded-2xl bg-white shadow-xl transition-transform duration-300 hover:scale-[1.02] hover:shadow-2xl"
            >
              <img
                src={promo.image}
                alt={promo.title || "Referral Promotion"}
                className="h-auto w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ReferralBanner;
