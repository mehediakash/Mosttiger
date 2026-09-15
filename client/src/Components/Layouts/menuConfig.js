/**
 * DESKTOP SIDEBAR MENU CONFIGURATION
 *
 * This file provides professional menu items configuration for the DesktopLayout
 * Features:
 * - Icon + text menu items
 * - Nested dropdown submenus
 * - Professional casino/gaming styling
 * - Yellow accent color (var(--color-primary))
 * - Smooth hover effects
 * - Integration with React Router
 */

import {
  HomeOutlined,
  FireOutlined,
  TeamOutlined,
  GiftOutlined,
  LineChartOutlined,
  PhoneOutlined,
  DownloadOutlined,
  ShareAltOutlined,
  CrownOutlined,
  ThunderboltOutlined,
  AppstoreOutlined,
  BarsOutlined,
  FundOutlined,
  CarOutlined,
  DollarOutlined,
} from "@ant-design/icons";
import { Link } from "react-router-dom";

/**
 * Professional Casino/Betting Menu Structure
 * Can be easily customized and expanded
 */
export const getDesktopMenuItems = () => [
  {
    key: "/",
    icon: <HomeOutlined />,
    label: <Link to="/">Home</Link>,
  },
  {
    key: "/hot",
    icon: <FireOutlined />,
    label: "Hot",
    children: [
      {
        key: "/hot-sports",
        icon: <TeamOutlined />,
        label: <Link to="/sports-betting">Hot Sports</Link>,
      },
      {
        key: "/hot-casino",
        icon: <CrownOutlined />,
        label: "Hot Casino",
      },
    ],
  },
  {
    key: "/sports-main",
    icon: <TeamOutlined />,
    label: "Sports",
    children: [
      {
        key: "/sports-exchange",
        label: "Exchange",
      },
      {
        key: "/sports-saba",
        label: "SABA",
      },
      {
        key: "/sports-bti",
        label: "BTI",
      },
      {
        key: "/sports-cmd",
        label: "CMD",
      },
      {
        key: "/live-betting",
        label: <Link to="/live-betting">Live Betting</Link>,
      },
    ],
  },
  {
    key: "/casino",
    icon: <CrownOutlined />,
    label: <Link to="/casino">Casino</Link>,
  },
  {
    key: "/slots",
    icon: <AppstoreOutlined />,
    label: "Slots",
  },
  {
    key: "/table",
    icon: <LineChartOutlined />,
    label: "Table Games",
  },
  {
    key: "/crash",
    icon: <ThunderboltOutlined />,
    label: "Crash Games",
  },
  {
    key: "/lottery",
    icon: <GiftOutlined />,
    label: "Lottery",
  },
  {
    key: "/fishing",
    icon: <CarOutlined />,
    label: "Fishing",
  },
  // Divider
  {
    type: "divider",
  },
  // Promotions & More
  {
    key: "/promotions",
    icon: <GiftOutlined />,
    label: <Link to="/promotions">Promotions</Link>,
  },
  {
    key: "/refer-bonus",
    icon: <ShareAltOutlined />,
    label: "Refer Bonus",
  },
  {
    key: "/app-download",
    icon: <DownloadOutlined />,
    label: "App Download",
  },
  {
    key: "/affiliate",
    icon: <LineChartOutlined />,
    label: "Affiliate",
  },
  // Divider
  {
    type: "divider",
  },
  // Support & Info
  {
    key: "/contact",
    icon: <PhoneOutlined />,
    label: <Link to="/contact">Contact Us</Link>,
  },
  {
    key: "/about",
    icon: <BarsOutlined />,
    label: <Link to="/about">About Us</Link>,
  },
  {
    key: "/responsible-gaming",
    icon: <DollarOutlined />,
    label: <Link to="/responsible-gaming">Responsible Gaming</Link>,
  },
];

/**
 * STYLING CONFIGURATION
 *
 * Dark Theme Colors:
 * - Background: #1a1a1a (sidebar)
 * - Content: #0f0f0f (main area)
 * - Accent: var(--color-primary) (yellow - active/hover)
 * - Text: #d0d0d0 (light gray)
 * - Border: #333 (dark border)
 *
 * All styles are applied via inline styles and CSS classes
 * in DesktopLayout.jsx
 */

export const THEME = {
  colors: {
    sidebarBg: "#1a1a1a",
    contentBg: "#0f0f0f",
    accentColor: "var(--color-primary)",
    textColor: "#d0d0d0",
    borderColor: "#333",
    hoverBg: "rgba(255, 184, 12, 0.1)",
  },
  spacing: {
    sidebarWidth: 240,
    collapsedWidth: 70,
    sidebarPadding: 16,
  },
  animation: {
    transitionDuration: "0.3s",
  },
};

/**
 * RESPONSIVE BREAKPOINTS (from Ant Design)
 *
 * screens.xs: 0-575px (mobile)
 * screens.sm: 576-767px (tablet)
 * screens.md: 768-991px (medium)
 * screens.lg: 992-1199px (large)
 * screens.xl: 1200-1599px (extra large)
 * screens.xxl: 1600px+ (2x extra large)
 *
 * Desktop layout activates at screens.md (768px and above)
 */

/**
 * MENU ITEM CUSTOMIZATION GUIDE
 *
 * Basic Item:
 * {
 *   key: 'unique-key',
 *   icon: <IconComponent />,
 *   label: <Link to="/path">Label</Link> | 'Text Label',
 * }
 *
 * Submenu:
 * {
 *   key: 'parent-key',
 *   icon: <IconComponent />,
 *   label: 'Parent Label',
 *   children: [
 *     {
 *       key: 'child-key',
 *       label: <Link to="/path">Child Label</Link>,
 *     },
 *   ],
 * }
 *
 * Divider:
 * {
 *   type: 'divider',
 * }
 */

export const MENU_ITEM_TEMPLATES = {
  homeItem: {
    key: "/",
    icon: <HomeOutlined />,
    label: <Link to="/">Home</Link>,
  },

  sportsItem: {
    key: "/sports-main",
    icon: <TeamOutlined />,
    label: "Sports",
    children: [
      {
        key: "/sports-exchange",
        label: "Exchange",
      },
      {
        key: "/sports-saba",
        label: "SABA",
      },
      {
        key: "/sports-bti",
        label: "BTI",
      },
      {
        key: "/sports-cmd",
        label: "CMD",
      },
    ],
  },

  casinoItem: {
    key: "/casino",
    icon: <CrownOutlined />,
    label: <Link to="/casino">Casino</Link>,
  },

  slotsItem: {
    key: "/slots",
    icon: <AppstoreOutlined />,
    label: "Slots",
  },

  promotionsItem: {
    key: "/promotions",
    icon: <GiftOutlined />,
    label: <Link to="/promotions">Promotions</Link>,
  },

  divider: {
    type: "divider",
  },
};

/**
 * HOW TO USE IN DesktopLayout.jsx:
 *
 * import { getDesktopMenuItems, THEME } from '../path/to/menuConfig';
 *
 * const DesktopLayout = () => {
 *   const menuItems = getDesktopMenuItems();
 *
 *   return (
 *     <Menu
 *       theme="dark"
 *       mode="inline"
 *       items={menuItems}
 *       style={{ background: THEME.colors.sidebarBg }}
 *     />
 *   );
 * };
 */
