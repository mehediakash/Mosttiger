import React from "react";
import { Layout, Dropdown, Avatar, Button, Space } from "antd";
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MenuOutlined,
  UserOutlined,
  LogoutOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "../../store/slices/authSlice";
import logo from "../../assets/logo.png";

const { Header: AntHeader } = Layout;

const Header = ({ collapsed, onToggleMenu }) => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  const handleLogout = () => {
    dispatch(logout());
  };

  const userMenuItems = [
    {
      key: "profile",
      icon: <UserOutlined />,
      label: "Profile",
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
      onClick: handleLogout,
    },
  ];

  return (
    <AntHeader className="!bg-[#0d1e2e] border-b border-[#1e3a52] shadow-sm !text-white flex items-center justify-between px-3 sm:px-6 h-16 sticky top-0 z-20">
      <div className="flex items-center gap-2">
        {/* Mobile / Tablet Toggle Button (< 1024px) */}
        <Button
          type="text"
          icon={<MenuOutlined className="text-white text-lg" />}
          onClick={onToggleMenu}
          className="lg:hidden text-white hover:text-amber-400 p-1.5 flex items-center justify-center rounded-lg"
          aria-label="Toggle navigation menu"
        />

        {/* Desktop Collapse Toggle Button (>= 1024px) */}
        <Button
          type="text"
          icon={
            collapsed ? (
              <MenuUnfoldOutlined className="!text-white text-lg" />
            ) : (
              <MenuFoldOutlined className="!text-white text-lg" />
            )
          }
          onClick={onToggleMenu}
          className="hidden lg:flex text-white hover:text-amber-400 p-1.5 items-center justify-center rounded-lg"
          aria-label="Toggle sidebar collapse"
        />

        {/* Compact logo visible on mobile/tablet when sidebar is in a drawer */}
        <div className="lg:hidden flex items-center ml-1">
          <img src={logo} alt="ck369" className="h-8 sm:h-9 object-contain" />
        </div>
      </div>

      <div className="flex items-center space-x-2 sm:space-x-4">
        <span className="!text-white text-xs sm:text-sm font-medium hidden sm:inline-block max-w-[150px] md:max-w-[250px] truncate">
          Welcome, {user?.fullName || user?.username || user?.email || "User"}
        </span>

        <Dropdown
          menu={{ items: userMenuItems }}
          placement="bottomRight"
          trigger={["click"]}
        >
          <Space className="cursor-pointer">
            <Avatar
              icon={<UserOutlined />}
              src={user?.avatar}
              className="bg-amber-500 text-slate-950 font-bold flex items-center justify-center cursor-pointer border border-amber-400"
              size="default"
            />
          </Space>
        </Dropdown>
      </div>
    </AntHeader>
  );
};

export default Header;
