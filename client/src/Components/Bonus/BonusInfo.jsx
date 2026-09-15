import React, { useState, useEffect } from "react";
import bonusService from "../services/bonusService";
import { TbCoinTaka } from "react-icons/tb";

const BonusInfo = () => {
  const [bonusData, setBonusData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadBonusInfo();
  }, []);

  const loadBonusInfo = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await bonusService.getActiveBonus();
      const data = response?.data?.data || response?.data;
      setBonusData(data);
    } catch (err) {
      // If no active bonus (404), don't show error
      if (err.response?.status === 404) {
        setBonusData(null);
      } else {
        console.error("Failed to load bonus info:", err);
        setError("Failed to load bonus information");
      }
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return `৳${Number(amount || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const calculateProgress = () => {
    if (!bonusData || !bonusData.totalTurnover) return 0;
    const completed = bonusData.totalTurnover - bonusData.remainingTurnover;
    return Math.min((completed / bonusData.totalTurnover) * 100, 100);
  };

  // Don't show anything if loading or no bonus
  if (loading) return null;
  if (!bonusData || bonusData.bonusAmount <= 0) return null;

  const progress = calculateProgress();
  const isCompleted = bonusData.remainingTurnover <= 0;

  return (
    <div className="backdrop-blur-xl bg-primary from-primary/10 via-orange-500/10 to-pink-500/10 rounded-2xl shadow-xl border-2 border-primary/30 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-yellow-600/20 to-orange-600/20 px-6 py-4 border-b border-primary/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary from-primary to-orange-600 rounded-full flex items-center justify-center animate-pulse">
              <svg
                className="w-6 h-6 text-white"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-yellow-100">
                Active Bonus
              </h3>
              <p className="text-xs text-yellow-200/80">
                {isCompleted ? "Completed!" : "In Progress"}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-yellow-200/80">Bonus Amount</p>
            <p className="text-2xl font-bold text-primary flex items-center">
              <TbCoinTaka className="mr-1" />
              {formatCurrency(bonusData.bonusAmount)}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Status Badge */}
        <div className="mb-4">
          {isCompleted ? (
            <div className="flex items-center justify-center gap-2 bg-green-500/20 border border-green-500 rounded-lg px-4 py-3">
              <svg
                className="w-6 h-6 text-green-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-green-300 font-semibold">
                🎉 Wagering Requirement Completed!
              </span>
            </div>
          ) : bonusData.withdrawBlocked ? (
            <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-3">
              <svg
                className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <p className="text-amber-300 font-semibold text-sm">
                  Withdrawal Restricted
                </p>
                <p className="text-amber-200/80 text-xs mt-1">
                  Complete the wagering requirement to enable withdrawals and
                  unlock your bonus funds.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 rounded-lg px-4 py-3">
              <svg
                className="w-5 h-5 text-blue-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-blue-300 text-sm">
                Keep playing to complete your wagering requirement
              </span>
            </div>
          )}
        </div>

        {/* Turnover Progress */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/80 font-medium">Wagering Progress</span>
            <span className="text-white font-bold">{progress.toFixed(1)}%</span>
          </div>

          {/* Progress Bar */}
          <div className="relative h-3 bg-gray-800/50 rounded-full overflow-hidden border border-gray-700">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary via-orange-500 to-pink-500 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
            </div>
          </div>

          {/* Turnover Details */}
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="bg-gray-800/30 rounded-lg px-4 py-3 border border-gray-700">
              <p className="text-xs text-gray-400 mb-1">Remaining Turnover</p>
              <p className="text-xl font-bold text-orange-400 flex items-center">
                <TbCoinTaka className="mr-1" />
                {formatCurrency(bonusData.remainingTurnover)}
              </p>
            </div>
            <div className="bg-gray-800/30 rounded-lg px-4 py-3 border border-gray-700">
              <p className="text-xs text-gray-400 mb-1">Total Required</p>
              <p className="text-xl font-bold text-white flex items-center">
                <TbCoinTaka className="mr-1" />
                {formatCurrency(bonusData.totalTurnover)}
              </p>
            </div>
          </div>
        </div>

        {/* Status */}
        {bonusData.bonusStatus && (
          <div className="mt-4 text-center">
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                bonusData.bonusStatus === "active"
                  ? "bg-green-500/20 text-green-300 border border-green-500/30"
                  : bonusData.bonusStatus === "completed"
                    ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                    : "bg-gray-500/20 text-gray-300 border border-gray-500/30"
              }`}
            >
              Status: {bonusData.bonusStatus.toUpperCase()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default BonusInfo;
