import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const PromoCard = ({ promo }) => {
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const formatDate = (dateString) => {
    if (!dateString) return "No expiry";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatCurrency = (amount) => {
    return `৳${Number(amount || 0).toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  };

  const handleUseNow = () => {
    // If on deposit page, store promo code and scroll to promo section
    if (location.pathname === "/deposit") {
      // Store promo code in localStorage for deposit page to pick up
      localStorage.setItem("pendingPromoCode", promo.code);
      // Reload page to apply promo
      window.location.reload();
    } else {
      // Copy to clipboard
      navigator.clipboard.writeText(promo.code).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  const isExpired = promo.validUntil && new Date(promo.validUntil) < new Date();

  return (
    <div className="group relative bg-primary from-gray-800 to-gray-900 rounded-2xl overflow-hidden border-2 border-gray-700 hover:border-primary transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-yellow-900/30">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(234,179,8,0.2),transparent_50%)]"></div>
      </div>

      {/* New User Badge */}
      {promo.newUsersOnly && (
        <div className="absolute top-4 right-4 z-10">
          <span className="bg-gradient-to-r from-blue-600 to-blue-800 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
            NEW USERS
          </span>
        </div>
      )}

      {/* Expired Overlay */}
      {isExpired && (
        <div className="absolute inset-0 bg-black/60 z-20 flex items-center justify-center">
          <span className="bg-red-600 text-white text-lg font-bold px-6 py-3 rounded-lg rotate-[-15deg]">
            EXPIRED
          </span>
        </div>
      )}

      <div className="relative p-6 z-10">
        {/* Promo Code Header */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400 uppercase tracking-wider">
              Promo Code
            </span>
            {!isExpired && (
              <div className="flex items-center text-green-400 text-xs">
                <svg
                  className="w-3 h-3 mr-1"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                Active
              </div>
            )}
          </div>
          <div className="bg-gray-900/50 border-2 border-dashed border-primary rounded-lg px-4 py-2 mb-3">
            <code className="text-2xl font-bold text-primary font-mono tracking-wider">
              {promo.code}
            </code>
          </div>
        </div>

        {/* Promo Title */}
        <h3 className="text-xl font-bold text-white mb-3 group-hover:text-primary transition-colors">
          {promo.name}
        </h3>

        {/* Bonus Display */}
        <div className="bg-gradient-to-r from-yellow-600/20 to-orange-600/20 border border-yellow-600/30 rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 mb-1">Get Bonus</p>
              <div className="flex items-baseline">
                {promo.percentage > 0 ? (
                  <>
                    <span className="text-4xl font-bold text-primary">
                      {promo.percentage}%
                    </span>
                    {promo.maxBonus > 0 && (
                      <span className="text-sm text-gray-400 ml-2">
                        up to {formatCurrency(promo.maxBonus)}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-4xl font-bold text-primary">
                    {formatCurrency(promo.bonusAmount)}
                  </span>
                )}
              </div>
            </div>
            <div className="w-16 h-16 bg-primary from-primary to-orange-600 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-white"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Description */}
        <p className="text-gray-300 text-sm mb-4 line-clamp-2">
          {promo.description}
        </p>

        {/* Requirements */}
        <div className="space-y-2 mb-4">
          {promo.minDeposit > 0 && (
            <div className="flex items-center text-xs text-gray-400">
              <svg
                className="w-4 h-4 mr-2 text-blue-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z"
                  clipRule="evenodd"
                />
              </svg>
              Min. Deposit: {formatCurrency(promo.minDeposit)}
            </div>
          )}
          {promo.turnoverRequirement > 0 && (
            <div className="flex items-center text-xs text-gray-400">
              <svg
                className="w-4 h-4 mr-2 text-purple-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                  clipRule="evenodd"
                />
              </svg>
              Wagering: {promo.turnoverRequirement}x
            </div>
          )}
          <div className="flex items-center text-xs text-gray-400">
            <svg
              className="w-4 h-4 mr-2 text-green-400"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                clipRule="evenodd"
              />
            </svg>
            Valid until: {formatDate(promo.validUntil)}
          </div>
        </div>

        {/* Use Now Button */}
        {!isExpired && (
          <button
            onClick={handleUseNow}
            className="w-full bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-yellow-900/50 flex items-center justify-center"
          >
            {copied ? (
              <>
                <svg
                  className="w-5 h-5 mr-2"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                Code Copied!
              </>
            ) : (
              <>
                <svg
                  className="w-5 h-5 mr-2"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z"
                    clipRule="evenodd"
                  />
                </svg>
                Use Now
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default PromoCard;
