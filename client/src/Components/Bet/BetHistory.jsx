import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import sportsService from '../services/sportsService';
import Button from '../ui/Button';

export default function BetHistory() {
  const [bets, setBets] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const fetch = async (p = 1) => {
    setLoading(true);
    try {
      const res = await sportsService.getBetHistory({ page: p, limit: 10 });
      setBets(res.data.bets || res.data.bets || []);
      setTotalPages(res.data.totalPages || 1);
      setPage(res.data.currentPage || p);
    } catch (err) {
      console.error('Failed to load bets', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(1); }, []);

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto bg-white rounded-lg p-4">
        <h2 className="text-xl font-bold mb-4">Bet History</h2>

        {loading ? (
          <p>Loading...</p>
        ) : bets.length === 0 ? (
          <p>No bets found.</p>
        ) : (
          <div className="space-y-3">
            {bets.map((b) => (
              <div key={b._id} className="p-3 border rounded flex items-center justify-between">
                <div>
                  <div className="font-semibold">Slip: {b.betSlipId}</div>
                  <div className="text-sm text-gray-600">Stake: {b.totalStake} | Status: {b.status}</div>
                </div>
                <div className="flex gap-2">
                  <Link to={`/bets/${b.betSlipId}`}>
                    <Button className="bg-indigo-600 text-white">View</Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between">
          <Button onClick={() => fetch(Math.max(1, page - 1))} disabled={page <= 1}>Prev</Button>
          <div>Page {page} / {totalPages}</div>
          <Button onClick={() => fetch(Math.min(totalPages, page + 1))} disabled={page >= totalPages}>Next</Button>
        </div>
      </div>
    </div>
  );
}
