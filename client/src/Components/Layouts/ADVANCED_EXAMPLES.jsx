/**
 * ADVANCED DESKTOP LAYOUT CUSTOMIZATION EXAMPLES
 *
 * This file demonstrates advanced customization options for the DesktopLayout
 * Copy and adapt code snippets to DesktopLayout.jsx as needed
 */

import React, { useState } from "react";
import { Layout, Menu, Sider, Button, Dropdown, Badge, Avatar } from "antd";
import {
  BellOutlined,
  SettingOutlined,
  LogoutOutlined,
  UserOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

/**
 * EXAMPLE 1: Add Header with User Profile
 *
 * Add this to your Header section in DesktopLayout.jsx
 */
export const HeaderWithUserProfile = ({ user }) => {
  const navigate = useNavigate();

  const userMenuItems = [
    {
      key: "profile",
      icon: <UserOutlined />,
      label: "Profile",
      onClick: () => navigate("/profile"),
    },
    {
      key: "settings",
      icon: <SettingOutlined />,
      label: "Settings",
    },
    {
      type: "divider",
    },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "Logout",
      danger: true,
      onClick: () => {
        // Handle logout
        localStorage.removeItem("auth_token");
        navigate("/login");
      },
    },
  ];

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      {/* Left Side */}
      <div style={{ flex: 1 }}></div>

      {/* Right Side */}
      <div style={{ display: "flex", gap: "24px", alignItems: "center" }}>
        {/* Notifications */}
        <Badge count={5} style={{ backgroundColor: "var(--color-primary)" }}>
          <Button
            type="text"
            icon={
              <BellOutlined
                style={{ color: "var(--color-primary)", fontSize: "18px" }}
              />
            }
            style={{ color: "var(--color-primary)" }}
          />
        </Badge>

        {/* User Profile Dropdown */}
        <Dropdown menu={{ items: userMenuItems }} trigger={["click"]}>
          <Avatar
            size={40}
            icon={<UserOutlined />}
            style={{
              backgroundColor: "var(--color-primary)",
              color: "#000",
              cursor: "pointer",
            }}
          />
        </Dropdown>
      </div>
    </div>
  );
};

/**
 * EXAMPLE 2: Sidebar with Background Image
 *
 * Add this CSS to customize sidebar appearance
 */
export const SIDEBAR_BACKGROUND_STYLES = `
  .ant-layout-sider {
    background: linear-gradient(
      135deg,
      rgba(26, 26, 26, 0.95) 0%,
      rgba(15, 15, 15, 0.95) 100%
    );
    backdrop-filter: blur(10px);
  }

  .ant-layout-sider::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(
      circle at top right,
      rgba(255, 184, 12, 0.05) 0%,
      transparent 50%
    );
    pointer-events: none;
  }
`;

/**
 * EXAMPLE 3: Advanced Menu with Icons and Badges
 *
 * Menu item with notification badge
 */
export const getAdvancedMenuItems = () => [
  {
    key: "/",
    icon: <HomeOutlined />,
    label: "Home",
  },
  {
    key: "/notifications",
    icon: (
      <Badge count={3} style={{ backgroundColor: "var(--color-primary)" }}>
        <BellOutlined />
      </Badge>
    ),
    label: "Notifications",
  },
  {
    key: "/promotions",
    icon: (
      <Badge count="NEW" style={{ backgroundColor: "var(--color-primary)" }}>
        <GiftOutlined />
      </Badge>
    ),
    label: "Promotions",
  },
];

/**
 * EXAMPLE 4: Animated Sidebar Collapse Button
 *
 * Enhanced collapse button with custom animation
 */
export const AnimatedCollapseButton = ({ collapsed, onCollapse }) => (
  <Button
    type="text"
    icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
    onClick={onCollapse}
    style={{
      color: "var(--color-primary)",
      width: "100%",
      height: "40px",
      fontSize: "16px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      borderRadius: "4px",
    }}
    className="animated-collapse-btn"
  />
);

// CSS for animated button
export const ANIMATED_BUTTON_STYLES = `
  .animated-collapse-btn {
    transform: scale(1);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .animated-collapse-btn:hover {
    transform: scale(1.1);
    background-color: rgba(255, 184, 12, 0.1) !important;
  }

  .animated-collapse-btn:active {
    transform: scale(0.95);
  }
`;

/**
 * EXAMPLE 5: Searchable Menu
 *
 * Add search functionality to sidebar menu
 */
import { Input } from "antd";
import { SearchOutlined } from "@ant-design/icons";

export const SearchableMenu = ({ menuItems, onSearch }) => {
  const [searchValue, setSearchValue] = useState("");

  const filteredItems = menuItems.filter(
    (item) =>
      item.label &&
      typeof item.label === "string" &&
      item.label.toLowerCase().includes(searchValue.toLowerCase()),
  );

  return (
    <>
      <div style={{ padding: "12px 8px" }}>
        <Input
          placeholder="Search menu..."
          prefix={<SearchOutlined style={{ color: "var(--color-primary)" }} />}
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          style={{
            backgroundColor: "#2a2a2a",
            borderColor: "#333",
            color: "#d0d0d0",
          }}
          className="searchable-menu-input"
        />
      </div>
      <Menu
        theme="dark"
        mode="inline"
        items={filteredItems}
        style={{ background: "#1a1a1a", border: "none" }}
      />
    </>
  );
};

// CSS for search input
export const SEARCHABLE_MENU_STYLES = `
  .searchable-menu-input input {
    background-color: #2a2a2a !important;
    border-color: #333 !important;
    color: #d0d0d0 !important;
  }

  .searchable-menu-input input::placeholder {
    color: #666;
  }

  .searchable-menu-input input:focus {
    background-color: #252525 !important;
    border-color: var(--color-primary) !important;
    box-shadow: 0 0 0 2px rgba(255, 184, 12, 0.1);
  }
`;

/**
 * EXAMPLE 6: Custom Submenu with Icons
 *
 * Advanced submenu configuration with custom styling
 */
export const getCustomSubmenuItems = () => [
  {
    key: "sports",
    icon: <TeamOutlined />,
    label: "Sports",
    children: [
      {
        key: "sports-live",
        icon: <FireOutlined />,
        label: (
          <span>
            Live{" "}
            <Badge
              count="5"
              style={{ backgroundColor: "var(--color-primary)" }}
            />
          </span>
        ),
      },
      {
        key: "sports-upcoming",
        icon: <ClockCircleOutlined />,
        label: "Upcoming",
      },
      {
        key: "sports-results",
        icon: <CheckCircleOutlined />,
        label: "Results",
      },
    ],
  },
];

/**
 * EXAMPLE 7: Sidebar with Mini Logo in Collapsed State
 *
 * Show mini logo when collapsed
 */
export const LogoArea = ({ collapsed, logo, miniLogo }) => (
  <div
    style={{
      padding: "16px",
      textAlign: "center",
      borderBottom: "1px solid #333",
      marginBottom: "8px",
      minHeight: collapsed ? "56px" : "80px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <img
      src={collapsed ? miniLogo : logo}
      alt="Logo"
      style={{
        height: collapsed ? "32px" : "40px",
        width: "auto",
        transition: "all 0.3s ease",
      }}
    />
  </div>
);

/**
 * EXAMPLE 8: Sidebar with User Status
 *
 * Show user balance or status in sidebar
 */
export const SidebarFooter = ({ collapsed, user }) => (
  <div
    style={{
      padding: "12px",
      borderTop: "1px solid #333",
      backgroundColor: "rgba(255, 184, 12, 0.05)",
      marginTop: "auto",
    }}
  >
    {!collapsed && (
      <div style={{ color: "var(--color-primary)", fontSize: "12px" }}>
        <div>Balance</div>
        <div style={{ fontSize: "18px", fontWeight: "bold" }}>
          ${user?.balance || 0}
        </div>
      </div>
    )}
    {collapsed && (
      <div
        style={{
          color: "var(--color-primary)",
          textAlign: "center",
          fontSize: "12px",
          fontWeight: "bold",
        }}
      >
        ${user?.balance || 0}
      </div>
    )}
  </div>
);

/**
 * EXAMPLE 9: Responsive Sidebar Menu Items
 *
 * Show different menu items based on user role
 */
export const getRoleBasedMenuItems = (userRole) => {
  const baseItems = [
    {
      key: "/",
      icon: <HomeOutlined />,
      label: "Home",
    },
  ];

  if (userRole === "admin") {
    return [
      ...baseItems,
      {
        type: "divider",
      },
      {
        key: "/admin",
        icon: <SettingOutlined />,
        label: "Admin Panel",
        children: [
          {
            key: "/admin/users",
            label: "Manage Users",
          },
          {
            key: "/admin/games",
            label: "Manage Games",
          },
          {
            key: "/admin/reports",
            label: "Reports",
          },
        ],
      },
    ];
  }

  return baseItems;
};

/**
 * EXAMPLE 10: Sidebar Theme Toggle
 *
 * Allow users to switch between light and dark themes
 */
export const SidebarThemeToggle = ({ isDarkTheme, onToggle }) => (
  <Button
    type="text"
    icon={isDarkTheme ? "☀️" : "🌙"}
    onClick={onToggle}
    style={{
      color: "var(--color-primary)",
      width: "100%",
      height: "40px",
      marginBottom: "8px",
    }}
  >
    {isDarkTheme ? " Light" : " Dark"}
  </Button>
);

/**
 * EXAMPLE 11: Advanced CSS for Smooth Transitions
 *
 * Apply this to DesktopLayout.jsx style tag
 */
export const ADVANCED_TRANSITION_STYLES = `
  /* Smooth sidebar transition */
  .ant-layout-sider {
    transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  /* Smooth menu animations */
  .ant-menu-item {
    transition: background-color 0.2s ease, color 0.2s ease;
  }

  .ant-menu-submenu-title {
    transition: background-color 0.2s ease, color 0.2s ease;
  }

  /* Smooth content transition */
  .ant-layout-content {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  /* Icon rotation in submenu */
  .ant-menu-submenu-arrow {
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  /* Professional hover effect */
  .ant-menu-item:hover::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    background-color: var(--color-primary);
    border-radius: 0 2px 2px 0;
    transition: all 0.3s ease;
  }
`;

/**
 * EXAMPLE 12: Integration with Redux for Persistent Collapse State
 *
 * Save sidebar collapse state to Redux
 */
export const useSidebarState = () => {
  // If you have a Redux sidebar slice:
  // const dispatch = useDispatch();
  // const collapsed = useSelector(state => state.sidebar.collapsed);
  //
  // const toggleCollapse = () => {
  //   dispatch(toggleSidebarCollapse());
  // };
  //
  // return { collapsed, toggleCollapse };

  // Otherwise use local state (current implementation)
  const [collapsed, setCollapsed] = React.useState(
    localStorage.getItem("sidebarCollapsed") === "true",
  );

  const toggleCollapse = () => {
    const newState = !collapsed;
    setCollapsed(newState);
    localStorage.setItem("sidebarCollapsed", newState);
  };

  return { collapsed, toggleCollapse };
};

/**
 * USAGE INSTRUCTIONS:
 *
 * 1. Copy relevant examples to DesktopLayout.jsx
 * 2. Import required Ant Design components
 * 3. Apply CSS styles to the <style> tag
 * 4. Test on desktop and mobile breakpoints
 * 5. Customize colors and dimensions as needed
 *
 * All examples follow the professional casino theme:
 * - Dark backgrounds (#1a1a1a, #0f0f0f)
 * - Yellow accents (var(--color-primary))
 * - Smooth transitions (0.3s ease)
 * - Professional spacing and typography
 */
