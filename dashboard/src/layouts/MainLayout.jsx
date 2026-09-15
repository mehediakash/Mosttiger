import React, { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Layout } from "antd";
import Sidebar from "../components/Layout/Sidebar";
import Header from "../components/Layout/Header";

const { Content } = Layout;

const MainLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  // Close mobile drawer on route transition
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Toggle mobile drawer on small screens, collapse on desktop
  const handleToggleMenu = () => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setMobileOpen((prev) => !prev);
    } else {
      setCollapsed((prev) => !prev);
    }
  };

  return (
    <Layout className="min-h-screen bg-[#0b1522] w-full overflow-x-hidden">
      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <Layout className="min-h-screen flex flex-col bg-[#0b1522] w-full min-w-0">
        <Header
          collapsed={collapsed}
          mobileOpen={mobileOpen}
          onToggleMenu={handleToggleMenu}
        />
        <Content
          className="flex-1 w-full min-w-0 p-3 sm:p-4 lg:p-6 bg-[#0b1522]"
          style={{ minHeight: "calc(100vh - 64px)" }}
        >
          <div className="w-full max-w-full min-w-0 overflow-x-hidden">
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
