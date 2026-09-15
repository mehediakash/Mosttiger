import React from 'react';

export default function PromoBanner() {
  return (
    <div className="bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 text-white p-6 m-4 rounded-xl shadow-lg">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-2">Welcome Bonus: 100% up to ৳10,000</h2>
          <p className="text-white/90">Place your first bet and get a matching bonus!</p>
          <button className="mt-4 bg-white text-purple-600 px-6 py-2 rounded-lg font-semibold hover:bg-gray-100 transition">
            Claim Now
          </button>
        </div>
        <div className="hidden md:block text-6xl">🎁</div>
      </div>
    </div>
  );
}
