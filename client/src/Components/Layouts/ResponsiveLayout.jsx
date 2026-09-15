import React from "react";
import { Grid } from "antd";
import DesktopLayout from "./DesktopLayout";
import MobileLayout from "./MobileLayout";

/**
 * ResponsiveLayout - Automatically switches between Desktop and Mobile layouts
 * Uses Ant Design Grid.useBreakpoint() for responsive detection
 *
 * Breakpoints:
 * - md and above: Uses DesktopLayout with professional sidebar
 * - Below md: Uses MobileLayout with existing mobile design
 */
const ResponsiveLayout = () => {
  const screens = Grid.useBreakpoint();

  // md breakpoint is 768px in Ant Design
  // screens.md = true for screens >= 768px
  const isDesktop = screens.md;

  return isDesktop ? <DesktopLayout /> : <MobileLayout />;
};

export default ResponsiveLayout;
