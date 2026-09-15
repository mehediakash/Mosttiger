import React from "react";
import { Outlet } from "react-router-dom";
import { Layout } from "antd";

const { Content } = Layout;

const AuthLayout = () => {
  return (
    <Layout className="min-h-screen bg-primary from-blue-50 to-indigo-100">
      <Content className="flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </Content>
    </Layout>
  );
};

export default AuthLayout;
