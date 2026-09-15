import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import walletService from "../Components/services/walletService";
import SEO from "../Components/SEO/SEO";

const DepositSuccessPage = () => {
  const { depositId } = useParams();
  const navigate = useNavigate();
  const token = useSelector((state) => state.auth?.token);
  const [depositData, setDepositData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!depositId || !token) {
      setError("Invalid deposit ID or not authenticated");
      setLoading(false);
      return;
    }

    const fetchDepositDetails = async () => {
      try {
        setLoading(true);
        const response = await walletService.getDepositSuccess(depositId);
        setDepositData(response?.data?.data);
        setError(null);
      } catch (err) {
        const errorMsg =
          err?.response?.data?.message || "Failed to fetch deposit details";
        setError(errorMsg);
        setDepositData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchDepositDetails();
  }, [depositId, token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white p-4 md:p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
          <p className="text-gray-300">Loading deposit details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white p-4 md:p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-900/20 border-2 border-red-700 rounded-2xl p-8 text-center">
            <div className="text-6xl mb-4">❌</div>
            <h1 className="text-3xl font-bold text-red-400 mb-2">Error</h1>
            <p className="text-gray-300 mb-6">{error}</p>
            <button
              onClick={() => navigate("/deposit")}
              className="px-6 py-3 bg-yellow-600 hover:bg-yellow-700 rounded-lg font-bold transition-all"
            >
              Back to Deposit
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isSuccess = depositData?.status === "approved";

  return (
    <>
      <SEO
        title="Deposit Successful - mosttigere"
        description="Your deposit has been processed successfully"
        canonical="https://mosttigere.com/deposit-success"
      />
      <div className="min-h-screen bg-black text-white p-4 md:p-8">
        <div className="max-w-2xl mx-auto">
          {/* Success Card */}
          <div
            className={`rounded-2xl p-8 text-center border-2 ${
              isSuccess
                ? "bg-green-900/20 border-green-700"
                : "bg-yellow-900/20 border-yellow-700"
            }`}
          >
            {/* Icon */}
            <div className="text-6xl mb-6">{isSuccess ? "✅" : "⏳"}</div>

            {/* Title */}
            <h1
              className={`text-4xl font-bold mb-2 ${
                isSuccess ? "text-green-400" : "text-primary"
              }`}
            >
              {isSuccess ? "Deposit Successful!" : "Payment Processing"}
            </h1>

            {/* Status Message */}
            <p className="text-gray-300 text-lg mb-8">
              {isSuccess
                ? "Your deposit has been confirmed and your balance has been updated."
                : "Your payment is being processed. Please wait for confirmation."}
            </p>

            {/* Deposit Details */}
            {depositData && (
              <div className="bg-gray-900/50 rounded-xl p-6 mb-8 text-left space-y-4">
                <div className="flex justify-between items-center pb-4 border-b border-gray-700">
                  <span className="text-gray-400">Deposit Amount</span>
                  <span className="text-2xl font-bold text-primary">
                    ৳{depositData.amount?.toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between items-center pb-4 border-b border-gray-700">
                  <span className="text-gray-400">Payment Method</span>
                  <span className="font-semibold">
                    {depositData.paymentMethod}
                  </span>
                </div>

                <div className="flex justify-between items-center pb-4 border-b border-gray-700">
                  <span className="text-gray-400">Reference ID</span>
                  <span className="font-mono text-sm">
                    {depositData.referenceId}
                  </span>
                </div>

                <div className="flex justify-between items-center pb-4 border-b border-gray-700">
                  <span className="text-gray-400">Status</span>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-bold ${
                      isSuccess
                        ? "bg-green-900/50 text-green-300"
                        : "bg-yellow-900/50 text-yellow-300"
                    }`}
                  >
                    {depositData.status?.toUpperCase()}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Time</span>
                  <span className="text-sm">
                    {new Date(depositData.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            {/* Next Steps */}
            <div className="bg-blue-900/20 border-l-4 border-blue-500 p-4 mb-8 text-left rounded">
              <h3 className="font-bold text-blue-300 mb-2">What's Next?</h3>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>✓ Your deposit is now in your wallet</li>
                <li>✓ You can start betting immediately</li>
                <li>✓ Check your deposit history anytime</li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => navigate("/dashboard")}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-lg font-bold transition-all"
              >
                Go to Dashboard
              </button>
              <button
                onClick={() => navigate("/betting")}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 rounded-lg font-bold transition-all"
              >
                Start Betting
              </button>
            </div>

            {/* Help Text */}
            <div className="mt-8 pt-8 border-t border-gray-700">
              <p className="text-gray-400 text-sm">
                Having issues?{" "}
                <a
                  href="/support"
                  className="text-primary hover:text-yellow-300"
                >
                  Contact Support
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default DepositSuccessPage;
