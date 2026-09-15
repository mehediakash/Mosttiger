import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

export default function BetSlip({ bets = [], onRemoveBet, onClearAll }) {
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('betslip');
  const [stake, setStake] = useState('');

  const totalOdds = bets.length > 0 ? bets.reduce((acc, bet) => acc * bet.odds, 1) : 0;
  const potentialWin = stake && totalOdds > 0 ? (parseFloat(stake) * totalOdds).toFixed(2) : '0.00';

  const handlePlaceBet = () => {
    if (!user) {
      alert('Please log in as an admin to place bets.');
      navigate('/login');
      return;
    }
    if (user.role !== 'admin') {
      alert('Only admin users can place bets.');
      return;
    }
    if (!stake || parseFloat(stake) <= 0) {
      alert('Please enter a valid stake amount');
      return;
    }
    if (bets.length === 0) {
      alert('Please add at least one selection to your bet slip');
      return;
    }
    alert(`Bet placed! Stake: \\u09f3${stake}, Potential Win: \\u09f3${potentialWin}`);
    onClearAll();
    setStake('');
  };

  return (
    <aside className="hidden xl:block w-80 bg-[#0f1923] text-white h-[calc(100vh-60px)] overflow-y-auto sticky top-0">
      {/* Tabs */}
      <div className="flex border-b border-gray-700">
        <button
          onClick={() => setActiveTab('betslip')}
          className={`flex-1 py-3 text-center font-semibold transition ${
            activeTab === 'betslip'
              ? 'bg-orange-500 text-white'
              : 'bg-white/5 text-gray-400 hover:bg-white/10'
          }`}
        >
          Bet Slip
          {bets.length > 0 && (
            <span className="ml-2 bg-white/20 px-2 py-1 rounded-full text-xs">{bets.length}</span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('mybets')}
          className={`flex-1 py-3 text-center font-semibold transition ${
            activeTab === 'mybets'
              ? 'bg-orange-500 text-white'
              : 'bg-white/5 text-gray-400 hover:bg-white/10'
          }`}
        >
          My Bets
        </button>
      </div>

      {/* Content */}
      {activeTab === 'betslip' ? (
        <div className="p-4">
          {bets.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-6xl mb-4">📋</div>
              <p>Your bet slip is empty</p>
              <p className="text-sm mt-2">Click on odds to add selections</p>
            </div>
          ) : (
            <>
              {/* Bet Type */}
              <div className="mb-4">
                <div className="flex gap-2">
                  <button className="flex-1 py-2 bg-orange-500 text-white rounded-lg font-semibold">
                    Multiple ({bets.length})
                  </button>
                  <button className="flex-1 py-2 bg-white/10 text-gray-400 rounded-lg">
                    System
                  </button>
                </div>
              </div>

              {/* Clear All Button */}
              {bets.length > 0 && (
                <button
                  onClick={onClearAll}
                  className="w-full mb-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition text-sm"
                >
                  Clear All Selections
                </button>
              )}

              {/* Selections */}
              <div className="space-y-3 mb-4">
                {bets.map((bet, idx) => (
                  <div key={idx} className="bg-white/5 rounded-lg p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="text-xs text-gray-400 mb-1">{bet.league}</div>
                        <div className="text-sm font-semibold">{bet.match}</div>
                        <div className="text-sm text-orange-400 mt-1">{bet.selection}</div>
                        <div className="text-xs text-gray-400 mt-1">{bet.market}</div>
                      </div>
                      <button
                        onClick={() => onRemoveBet(idx)}
                        className="text-gray-400 hover:text-white ml-2"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">Odds</span>
                      <span className="font-bold text-orange-400">{bet.odds.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Stake Input */}
              <div className="mb-4">
                <label className="block text-sm text-gray-400 mb-2">Stake Amount</label>
                <div className="relative">
                  <input
                    type="number"
                    value={stake}
                    onChange={(e) => setStake(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-white/10 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none"
                  />
                  <span className="absolute right-4 top-3 text-gray-400">৳</span>
                </div>
                <div className="flex gap-2 mt-2">
                  {[100, 500, 1000, 5000].map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setStake(amount.toString())}
                      className="flex-1 py-1 bg-white/10 rounded text-xs hover:bg-white/20 transition"
                    >
                      {amount}
                    </button>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div className="bg-white/5 rounded-lg p-3 mb-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Total Odds</span>
                  <span className="font-bold text-orange-400">{totalOdds.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Stake</span>
                  <span className="font-semibold">৳{stake || '0.00'}</span>
                </div>
                <div className="border-t border-gray-600 pt-2 flex justify-between">
                  <span className="font-semibold">Potential Win</span>
                  <span className="font-bold text-lg text-green-400">৳{potentialWin}</span>
                </div>
              </div>

              {/* Place Bet Button */}
              <button
                onClick={handlePlaceBet}
                className="w-full bg-gradient-to-r from-orange-500 to-pink-500 text-white py-3 rounded-lg font-bold hover:opacity-90 transition"
              >
                Place Bet
              </button>

              {!user && (
                <p className="text-xs text-center text-gray-400 mt-2">
                  Please login to place bets
                </p>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="p-4">
          <div className="text-center py-12 text-gray-400">
            <div className="text-6xl mb-4">📜</div>
            <p>No active bets</p>
            <p className="text-sm mt-2">Your betting history will appear here</p>
            {user && (
              <button
                onClick={() => navigate('/bets')}
                className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg hover:opacity-90 transition"
              >
                View All Bets
              </button>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
