import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import sportsService from '../services/sportsService';
import Button from '../ui/Button';

export default function BetDetails() {
  const { betSlipId } = useParams();
  const navigate = useNavigate();
  const [bet, setBet] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await sportsService.getBetDetails(betSlipId);
        setBet(res.data);
      } catch (err) {
        console.error('Failed to load bet', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [betSlipId]);

  if (loading) return <div className="p-6">Loading...</div>;
  if (!bet) return <div className="p-6">Bet not found</div>;

  const b = bet.data || bet; // accept either envelope or raw

  return (
    <div className="p-6">
      <div className="max-w-3xl mx-auto bg-white rounded-lg p-4">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold">Bet Details - {b.betSlipId}</h2>
          <div className="ml-auto"><Button onClick={() => navigate(-1)}>Back</Button></div>
        </div>

        <div className="mt-4">
          <div>Stake: <strong>{b.totalStake}</strong></div>
          <div>Potential Win: <strong>{b.potentialWin}</strong></div>
          <div>Status: <strong>{b.status}</strong></div>
        </div>

        <div className="mt-4 grid gap-3">
          {b.matches && b.matches.map((m, i) => (
            <div key={i} className="p-3 border rounded">
              <div className="font-semibold">{m.matchName} ({m.sport})</div>
              <div className="text-sm">Market: {m.market} — Selection: {m.selection} — Odds: {m.odds}</div>
              <div className="text-sm">Status: {m.status || 'pending'}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
