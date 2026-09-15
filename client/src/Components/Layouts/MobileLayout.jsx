import React from "react";
import { Outlet } from "react-router-dom";
import NavbarSidebar from "../shared/Navbar";
import useMobileStickyStackController from "../../hooks/useMobileStickyStackController";

import MobileBottomNav from "../shared/MobileBottomNav";

/**
 * MobileLayout - Wrapper for existing mobile responsive design
 * Preserves all existing mobile UI/UX without any modifications
 */
const MobileLayout = () => {
  useMobileStickyStackController();

  return (
    <>
      {/* Existing mobile navbar/sidebar - KEPT EXACTLY AS IS */}
      <NavbarSidebar />

      {/* Mobile pages content - add bottom padding so fixed nav doesn't cover content */}
      <div className="">
        <Outlet />
      </div>

      {/* Footer */}

      {/* Mobile fixed bottom navigation (mobile/tablet only) */}
      <MobileBottomNav />
    </>
  );
};

export default MobileLayout;
