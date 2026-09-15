// components/MatchSearch.jsx
import React, { useState } from "react";

const MatchSearch = () => {
  const [betSlip, setBetSlip] = useState([
    {
      id: 1,
      match: "IND vs AUS",
      betType: "IND to win",
      odds: 1.85,
      stake: 100,
    },
    {
      id: 2,
      match: "BAN vs NZ",
      betType: "Total Over 320.5",
      odds: 1.72,
      stake: 50,
    },
  ]);

  const totalOdds = betSlip
    .reduce((total, bet) => total * bet.odds, 1)
    .toFixed(2);
  const potentialWin = betSlip
    .reduce((total, bet) => total + bet.stake * bet.odds, 0)
    .toFixed(2);

  const removeFromBetSlip = (id) => {
    setBetSlip(betSlip.filter((bet) => bet.id !== id));
  };

  return (
    <div className="bg-gray-800 rounded-xl shadow-lg p-4 lg:sticky lg:top-4">
      <h2 className="text-lg font-bold mb-4 pb-3 border-b border-gray-700 flex items-center">
        <svg
          className="w-5 h-5 mr-2 text-primary"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
        </svg>
        Bet Slip
        <span className="ml-2 text-sm bg-yellow-600 text-white px-2 py-1 rounded-full">
          {betSlip.length}
        </span>
      </h2>

      {betSlip.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-4xl mb-4">📝</div>
          <p className="text-gray-400">Your bet slip is empty</p>
          <p className="text-sm text-gray-500 mt-2">
            Add selections from matches
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-4 mb-6">
            {betSlip.map((bet) => (
              <div
                key={bet.id}
                className="bg-gray-900 rounded-lg p-3 border border-gray-700"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-medium text-sm">{bet.match}</h4>
                    <p className="text-xs text-gray-400">{bet.betType}</p>
                  </div>
                  <button
                    onClick={() => removeFromBetSlip(bet.id)}
                    className="text-gray-500 hover:text-red-400"
                  >
                    ✕
                  </button>
                </div>
                <div className="flex justify-between items-center">
                  <div className="text-sm">
                    Odds:{" "}
                    <span className="font-bold text-green-400">{bet.odds}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-xs mr-2">Stake:</span>
                    <input
                      type="number"
                      className="w-20 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm"
                      value={bet.stake}
                      onChange={(e) => {
                        const updated = betSlip.map((b) =>
                          b.id === bet.id
                            ? { ...b, stake: parseFloat(e.target.value) || 0 }
                            : b,
                        );
                        setBetSlip(updated);
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-gray-900 rounded-lg p-4 mb-6">
            <div className="flex justify-between mb-2">
              <span className="text-gray-400">Total Odds:</span>
              <span className="font-bold text-xl text-green-400">
                {totalOdds}
              </span>
            </div>
            <div className="flex justify-between mb-4">
              <span className="text-gray-400">Potential Win:</span>
              <span className="font-bold text-xl text-primary">
                ${potentialWin}
              </span>
            </div>
            <button className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 py-3 rounded-lg font-bold transition-all">
              PLACE BET
            </button>
          </div>
        </>
      )}

      {/* Quick bet section */}
      <div className="mt-8 pt-6 border-t border-gray-700">
        <h3 className="text-md font-bold mb-3">Quick Bet</h3>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-400">Amount:</span>
            <input
              type="number"
              className="w-32 bg-gray-900 border border-gray-700 rounded px-3 py-2 text-right"
              placeholder="0.00"
            />
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[10, 20, 50, 100].map((amount) => (
              <button
                key={amount}
                className="py-2 bg-gray-900 hover:bg-gray-700 rounded text-center transition-all"
              >
                ${amount}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatchSearch;
