import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import sportsService from '../services/sportsService';
import Button from '../ui/Button';

export default function PlaceBet() {
  const navigate = useNavigate();
  const [matchId, setMatchId] = useState('');
  const [matchName, setMatchName] = useState('');
  const [sport, setSport] = useState('soccer');
  const [market, setMarket] = useState('h2h');
  const [selection, setSelection] = useState('');
  const [odds, setOdds] = useState('');
  const [stake, setStake] = useState('');
  const [walletType, setWalletType] = useState('main');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!matchId || !selection || !odds || !stake) return alert('Please fill required fields');

    const payload = {
      matches: [
        {
          matchId,
          matchName: matchName || matchId,
          sport,
          market,
          selection,
          odds: parseFloat(odds)
        }
      ],
      totalStake: parseFloat(stake),
      walletType
    };

    try {
      setLoading(true);
      const res = await sportsService.placeBet(payload);
      alert('Bet placed: ' + (res.data.betSlipId || res.data.betSlipId));
      navigate('/bets');
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || err.message || 'Failed to place bet');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-2xl mx-auto bg-white rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">Place Bet (single match)</h2>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium">Match ID</label>
            <input value={matchId} onChange={e=>setMatchId(e.target.value)} className="w-full p-2 border rounded" />
          </div>
          <div>
            <label className="block text-sm font-medium">Match Name</label>
            <input value={matchName} onChange={e=>setMatchName(e.target.value)} className="w-full p-2 border rounded" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium">Sport</label>
              <input value={sport} onChange={e=>setSport(e.target.value)} className="w-full p-2 border rounded" />
            </div>
            <div>
              <label className="block text-sm font-medium">Market</label>
              <input value={market} onChange={e=>setMarket(e.target.value)} className="w-full p-2 border rounded" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium">Selection</label>
            <input value={selection} onChange={e=>setSelection(e.target.value)} className="w-full p-2 border rounded" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium">Odds</label>
              <input value={odds} onChange={e=>setOdds(e.target.value)} className="w-full p-2 border rounded" type="number" step="0.01" />
            </div>
            <div>
              <label className="block text-sm font-medium">Stake</label>
              <input value={stake} onChange={e=>setStake(e.target.value)} className="w-full p-2 border rounded" type="number" step="0.01" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium">Wallet</label>
            <select value={walletType} onChange={e=>setWalletType(e.target.value)} className="w-full p-2 border rounded">
              <option value="main">Main</option>
              <option value="bonus">Bonus</option>
              <option value="freeBets">Free Bets</option>
            </select>
          </div>

          <div className="flex gap-2">
            <Button type="submit" className="bg-indigo-600 text-white" disabled={loading}>{loading ? 'Placing...' : 'Place Bet'}</Button>
            <Button type="button" onClick={() => navigate('/bets')}>Cancel</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
