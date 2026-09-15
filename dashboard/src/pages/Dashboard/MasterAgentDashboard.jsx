import React, { useEffect, useState } from "react";
import { Row, Col, Card, Statistic, Table, Tag, Spin, Alert } from "antd";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  TeamOutlined,
  DollarOutlined,
  UserOutlined,
  ArrowUpOutlined,
  TransactionOutlined,
} from "@ant-design/icons";

import { dashboardAPI } from "../../services/api";
import { formatCurrency, formatNumber } from "../../utils/helpers";

const MasterAgentDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({});
  const [recentActivities, setRecentActivities] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);

  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await dashboardAPI.getMasterAgentDashboard();
        console.log("Dashboard API Response:", response.data);

        if (response.data?.success && response.data?.data) {
          const data = response.data.data;
          setDashboardData(data);
          setStats(data.userStats || {});
          setRecentActivities(data.recentActivity || []);
        }
      } catch (err) {
        console.error("Dashboard load error:", err);
        setError(
          err.response?.data?.message ||
            err.message ||
            "Failed to load dashboard",
        );
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  // Sample data for master agent
  const agentPerformanceData = [
    { name: "Agent 1", turnover: 40000, commission: 4000 },
    { name: "Agent 2", turnover: 30000, commission: 3000 },
    { name: "Agent 3", turnover: 20000, commission: 2000 },
    { name: "Agent 4", turnover: 27800, commission: 1890 },
    { name: "Agent 5", turnover: 18900, commission: 2390 },
  ];

  const commissionData = [
    { name: "Jan", commission: 4000 },
    { name: "Feb", commission: 3000 },
    { name: "Mar", commission: 2000 },
    { name: "Apr", commission: 2780 },
    { name: "May", commission: 1890 },
    { name: "Jun", commission: 2390 },
  ];

  const activityColumns = [
    {
      title: "Agent",
      dataIndex: "agent",
      key: "agent",
    },
    {
      title: "Activity",
      dataIndex: "activity",
      key: "activity",
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      render: (amount) => formatCurrency(amount),
    },
    {
      title: "Time",
      dataIndex: "time",
      key: "time",
    },
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return <Alert title="Error" description={error} type="error" showIcon />;
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Users"
              value={stats.totalUsers || 0}
              prefix={<UserOutlined />}
              styles={{ content: { color: "#3f8600" } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Sub-Agents"
              value={stats.totalSubAgents || 0}
              prefix={<TeamOutlined />}
              styles={{ content: { color: "#1890ff" } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Active Users"
              value={stats.activeUsers || 0}
              prefix={<UserOutlined />}
              styles={{ content: { color: "#52c41a" } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Commission"
              value={dashboardData?.commissionStats?.totalCommission || 0}
              prefix={<DollarOutlined />}
              precision={2}
              styles={{ content: { color: "#cf1322" } }}
            />
          </Card>
        </Col>
      </Row>

      {/* Financial Stats */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Today's Revenue"
              value={dashboardData?.financialStats?.todayRevenue || 0}
              prefix={<DollarOutlined />}
              precision={2}
              styles={{ content: { color: "#3f8600" } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Revenue"
              value={dashboardData?.financialStats?.totalRevenue || 0}
              prefix={<DollarOutlined />}
              precision={2}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Deposits"
              value={dashboardData?.financialStats?.totalDeposits || 0}
              prefix={<ArrowUpOutlined />}
              precision={2}
              styles={{ content: { color: "#52c41a" } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Withdrawals"
              value={dashboardData?.financialStats?.totalWithdrawals || 0}
              prefix={<TransactionOutlined />}
              precision={2}
              styles={{ content: { color: "#cf1322" } }}
            />
          </Card>
        </Col>
      </Row>

      {/* Charts */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="Agent Performance" style={{ height: "400px" }}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={agentPerformanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey="turnover" fill="#8884d8" name="Turnover" />
                <Bar dataKey="commission" fill="#82ca9d" name="Commission" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Commission Trend" style={{ height: "400px" }}>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={commissionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend />
                <Line type="monotone" dataKey="commission" stroke="#8884d8" />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* Recent Activities */}
      <Card title="Recent Agent Activities">
        <Table
          columns={activityColumns}
          dataSource={Array.isArray(recentActivities) ? recentActivities : []}
          pagination={{ pageSize: 5 }}
          size="small"
        />
      </Card>
    </div>
  );
};

export default MasterAgentDashboard;
