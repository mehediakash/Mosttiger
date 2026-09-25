import React from "react";
import { Layout, Menu, Drawer, Button } from "antd";
import { useNavigate, useLocation } from "react-router-dom";
import {
  DashboardOutlined,
  UserOutlined,
  TeamOutlined,
  TransactionOutlined,
  BarChartOutlined,
  DollarOutlined,
  GiftOutlined,
  FileTextOutlined,
  BankOutlined,
  PlayCircleOutlined,
  PieChartOutlined,
  LineChartOutlined,
  ApartmentOutlined,
  ShareAltOutlined,
  MessageOutlined,
  CloseOutlined,
  CreditCardOutlined,
} from "@ant-design/icons";
import { useSelector } from "react-redux";
import { hasPermission, PERMISSIONS } from "../../utils/rolePermissions";
import logo from "../../assets/logo.png";

const { Sider } = Layout;

const Sidebar = ({ collapsed, mobileOpen, onCloseMobile }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);

  const menuItems = [
    {
      key: "/dashboard",
      icon: <DashboardOutlined />,
      label: "Dashboard",
    },
    {
      key: "/users",
      icon: <UserOutlined />,
      label: "User Management",
      disabled:
        user?.role === "agent"
          ? false
          : !hasPermission(user, PERMISSIONS.VIEW_USERS) &&
            !hasPermission(user, PERMISSIONS.CREATE_USERS) &&
            !hasPermission(user, PERMISSIONS.EDIT_USERS) &&
            !hasPermission(user, PERMISSIONS.RESET_USER_PASSWORD),
    },
    {
      key: "/bets",
      icon: <FileTextOutlined />,
      label: "Bets History",
      disabled:
        !hasPermission(user, PERMISSIONS.VIEW_USER_BETS) &&
        user?.role !== "admin",
    },
    {
      key: "/commission",
      icon: <PieChartOutlined />,
      label: "Commission",
      disabled:
        !hasPermission(user, PERMISSIONS.VIEW_COMMISSION) ||
        (user?.role !== "master_agent" &&
          user?.role !== "sub_agent" &&
          user?.role !== "agent"),
    },

    {
      key: "financial",
      icon: <BankOutlined />,
      label: "Financial Management",
      disabled: !["admin", "moderator"].includes(user?.role),
      children: [
        {
          key: "/transactions",
          icon: <TransactionOutlined />,
          label: "Transactions",
          disabled: !hasPermission(user, PERMISSIONS.VIEW_TRANSACTIONS),
        },
        {
          key: "/agent-balance",
          label: "Agent Balance Control",
          disabled: !hasPermission(user, PERMISSIONS.ADJUST_USER_BALANCE),
        },
        {
          key: "/payment-gateways",
          icon: <CreditCardOutlined />,
          label: "Payment Gateways",
          disabled: user?.role !== "admin",
        },
      ],
    },
    {
      key: "/payment-gateways",
      icon: <CreditCardOutlined />,
      label: "Payment Gateway Management",
      disabled: user?.role !== "admin",
    },
    {
      key: "/ggr-topup",
      icon: <DollarOutlined />,
      label: "GGR TopUP",
      disabled: user?.role !== "admin",
    },
    {
      key: "live-chat",
      icon: <MessageOutlined />,
      label: "Live Chat",
      disabled: user?.role !== "admin",
      children: [
        {
          key: "/live-chat/inbox",
          label: "Inbox",
        },
        {
          key: "/live-chat/closed",
          label: "Closed Chats",
        },
      ],
    },
    {
      key: "gaming",
      icon: <PlayCircleOutlined />,
      label: "Games & Providers",
      disabled: !hasPermission(user, PERMISSIONS.MANAGE_GAMES),
      children: [
        {
          key: "/games",
          label: "Game Management",
        },
        {
          key: "/game-config",
          label: "Game Configuration",
        },
      ],
    },

    {
      key: "promotions",
      icon: <GiftOutlined />,
      label: "Bonus & Promotions",
      disabled: !hasPermission(user, PERMISSIONS.MANAGE_PROMOTIONS),
      children: [
        {
          key: "/promotions",
          label: "Promo Code Management",
        },
      ],
    },
    {
      key: "affiliate",
      icon: <ApartmentOutlined />,
      label: "Affiliate",
      disabled:
        user?.role !== "admin" &&
        !hasPermission(user, PERMISSIONS.VIEW_REPORTS),
      children: [
        {
          key: "/affiliate/applications",
          label: "Affiliate Applications",
        },
        {
          key: "/affiliate/management",
          label: "Affiliate Management",
        },
        {
          key: "/affiliate/withdraw",
          label: "Affiliate Withdraw",
        },
        {
          key: "/affiliate/settlement",
          label: "Affiliate Settlement",
        },
        {
          key: "/affiliate/transactions",
          label: "Affiliate Transactions",
        },
        {
          key: "/affiliate/analytics",
          label: "Affiliate Analytics",
        },
      ],
    },
    {
      key: "referral-bonus",
      icon: <ShareAltOutlined />,
      label: "Referral Bonus",
      disabled:
        user?.role !== "admin" &&
        !hasPermission(user, PERMISSIONS.VIEW_REPORTS),
      children: [
        {
          key: "/referral/configuration",
          label: "Referral Configuration",
        },
        {
          key: "/referral/analytics",
          label: "Referral Analytics",
        },
        {
          key: "/referral/history",
          label: "Referral History",
        },
        {
          key: "/referral/pending-claims",
          label: "Referral Pending Claims",
        },
      ],
    },
    {
      key: "content",
      icon: <FileTextOutlined />,
      label: "Content Management",
      disabled: !hasPermission(user, PERMISSIONS.MANAGE_CONTENT),
      children: [
        {
          key: "/cms",
          label: "CMS Content",
        },
        {
          key: "/cms/favorite-banner",
          label: "Favorite Banner",
        },
      ],
    },
    {
      key: "/announcements",
      icon: <MessageOutlined />,
      label: "Announcements",
      disabled: user?.role !== "admin",
    },
  ];

  const moderatorMenuItems = menuItems.filter(
    (item) => item.key === "live-chat",
  );
  const visibleMenuItems =
    user?.role === "moderator" ? moderatorMenuItems : menuItems;

  // Filter menu items based on user permissions
  const filterMenuItems = (items) => {
    return items
      .filter((item) => {
        if (item.disabled) return false;
        if (item.children) {
          item.children = filterMenuItems(item.children);
          return item.children.length > 0;
        }
        return true;
      })
      .map((item) => ({ ...item }));
  };

  const filteredMenuItems = filterMenuItems(visibleMenuItems);

  const handleMenuClick = ({ key }) => {
    navigate(key);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const alwaysOpenKeys = filteredMenuItems
    .filter((item) => item.children && item.children.length > 0)
    .map((item) => item.key);

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#0d1e2e]">
      <div className="p-3 bg-[#205583] text-center border-b border-[#1e3a52] flex items-center justify-between">
        <div className="flex-1 flex justify-center">
          <img
            src={logo}
            alt="mosttiger live"
            className="h-12 object-contain"
          />
        </div>
        {mobileOpen && (
          <Button
            type="text"
            icon={<CloseOutlined className="text-white text-base" />}
            onClick={onCloseMobile}
            className="lg:hidden text-white hover:text-amber-400 p-1 flex items-center justify-center"
            aria-label="Close menu"
          />
        )}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#0d1e2e]">
        <Menu
          mode="inline"
          theme="dark"
          selectedKeys={[location.pathname]}
          openKeys={collapsed ? [] : alwaysOpenKeys}
          items={filteredMenuItems}
          onClick={handleMenuClick}
          className="mt-2 border-none bg-transparent"
        />
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sider (>= 1024px) */}
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={250}
        collapsedWidth={80}
        className="hidden lg:block shadow-xl border-r border-[#1e3a52] sticky top-0 h-screen z-30 overflow-hidden"
        style={{ background: "#0d1e2e" }}
      >
        {sidebarContent}
      </Sider>

      {/* Mobile & Tablet Drawer (< 1024px) */}
      <Drawer
        placement="left"
        open={mobileOpen}
        onClose={onCloseMobile}
        closable={false}
        width={280}
        styles={{
          body: { padding: 0, background: "#0d1e2e", height: "100%" },
          wrapper: { maxWidth: "85vw" },
        }}
        className="lg:hidden"
      >
        {sidebarContent}
      </Drawer>
    </>
  );
};

export default Sidebar;
