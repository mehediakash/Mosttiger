import React from 'react';
import HeaderTop from './HeaderTop';
import SportsSidebar from './SportsSidebar';
import PromoBanner from './PromoBanner';
import MatchHeader from './MatchHeader';
import ChampSection from './ChampSection';
import BetSlip from './BetSlip';
import MobileBottomNav from './MobileBottomNav';

export default function SportsPage() {
  return (
    <div className="min-h-screen bg-[#0f1923]">
      <HeaderTop />
      <div className="flex">
        <SportsSidebar />
        <main className="flex-1 overflow-y-auto">
          <PromoBanner />
          <MatchHeader />
          <ChampSection />
        </main>
        <BetSlip />
      </div>
      <MobileBottomNav />
    </div>
  );
}
