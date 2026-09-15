import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import paymentService from "../Components/services/paymentService";

const PaymentCancel = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState("idle"); // success | completed | missing | error
  const [message, setMessage] = useState("");

  useEffect(() => {
    const runCancel = async () => {
      const referenceId = searchParams.get("referenceId");

      if (!referenceId) {
        setState("missing");
        setMessage(
          "Missing reference id. Payment cancellation could not be confirmed.",
        );
        setLoading(false);
        return;
      }

      try {
        const res = await paymentService.cancelPayment({
          referenceId,
        });
        const data = res?.data?.data;

        if (data?.alreadyCompleted) {
          setState("completed");
          setMessage(
            "Payment already completed. Cancellation was not applied.",
          );
        } else {
          setState("success");
          setMessage("Your payment has been cancelled successfully.");
        }
      } catch (err) {
        setState("error");
        setMessage(
          err?.response?.data?.message ||
            "Failed to cancel payment. Please contact support if needed.",
        );
      } finally {
        setLoading(false);
      }
    };

    runCancel();
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-8">
      <div className="max-w-xl mx-auto bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-2xl">
        {loading ? (
          <div className="text-center py-10">
            <p className="text-gray-300">Processing cancellation...</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-red-900/40 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-red-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>

            <h1 className="text-2xl font-bold text-center mb-2">
              {state === "completed"
                ? "Payment Already Completed"
                : "Payment Cancelled"}
            </h1>
            <p className="text-gray-300 text-center mb-6">{message}</p>

            <div className="flex gap-3">
              <button
                onClick={() => navigate("/deposit")}
                className="flex-1 primary hover:bg-yellow-600 text-black font-bold py-3 rounded-lg transition-all"
              >
                Retry Deposit
              </button>
              <button
                onClick={() => navigate("/")}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 rounded-lg transition-all"
              >
                Go Home
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentCancel;
