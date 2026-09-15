import React, { useEffect } from "react";
import { Row, Col, Card, Statistic, Table, Tag, Spin, Alert } from "antd";
import { useDispatch, useSelector } from "react-redux";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  UserOutlined,
  DollarOutlined,
  TeamOutlined,
  ArrowUpOutlined,
  TransactionOutlined,
} from "@ant-design/icons";

import {
  fetchDashboardStart,
  fetchDashboardSuccess,
  fetchDashboardFailure,
} from "../../store/slices/dashboardSlice";
import { dashboardAPI } from "../../services/api";
import { formatCurrency, formatNumber } from "../../utils/helpers";

const AgentDashboard = () => {
  const dispatch = useDispatch();
  const {
    stats = {},
    recentActivities = [],
    loading,
    error,
  } = useSelector((state) => state.dashboard);

  useEffect(() => {
    const loadDashboardData = async () => {
      dispatch(fetchDashboardStart());
      try {
        const response = await dashboardAPI.getAgentDashboard();
        dispatch(fetchDashboardSuccess(response.data));
      } catch (err) {
        dispatch(fetchDashboardFailure(err.message));
      }
    };

    loadDashboardData();
  }, [dispatch]);

  // Sample data for agent
  const userActivityData = [
    { name: "User 1", bets: 40, wins: 25 },
    { name: "User 2", bets: 30, wins: 18 },
    { name: "User 3", bets: 20, wins: 12 },
    { name: "User 4", bets: 27, wins: 15 },
    { name: "User 5", bets: 18, wins: 10 },
  ];

  const profitData = [
    { name: "Jan", profit: 4000 },
    { name: "Feb", profit: 3000 },
    { name: "Mar", profit: 2000 },
    { name: "Apr", profit: 2780 },
    { name: "May", profit: 1890 },
    { name: "Jun", profit: 2390 },
  ];

  const activityColumns = [
    {
      title: "User",
      dataIndex: "user",
      key: "user",
    },
    {
      title: "Game",
      dataIndex: "game",
      key: "game",
    },
    {
      title: "Bet Amount",
      dataIndex: "betAmount",
      key: "betAmount",
      render: (amount) => formatCurrency(amount),
    },
    {
      title: "Result",
      dataIndex: "result",
      key: "result",
      render: (result) => (
        <Tag color={result === "Won" ? "green" : "red"}>{result}</Tag>
      ),
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
    return <Alert message="Error" description={error} type="error" showIcon />;
  }

  return (
    <div className="space-y-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Agent Dashboard</h1>
        <p className="text-gray-600">Manage your users and monitor their activities</p>
      </div>

      {/* Statistics Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Users"
              value={stats.totalUsers || stats.activeUsers || 0}
              prefix={<UserOutlined />}
              valueStyle={{ color: "#3f8600" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Active Users"
              value={stats.activeUsers || 0}
              prefix={<UserOutlined />}
              valueStyle={{ color: "#1890ff" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Commission"
              value={stats.totalCommission || stats.commission?.total || 0}
              prefix={<DollarOutlined />}
              valueStyle={{ color: "#3f8600" }}
              formatter={(value) => formatCurrency(value)}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Pending Commission"
              value={stats.pendingCommission || stats.commission?.pending || 0}
              prefix={<DollarOutlined />}
              valueStyle={{ color: "#faad14" }}
              formatter={(value) => formatCurrency(value)}
            />
          </Card>
        </Col>
      </Row>

      {/* User Statistics */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Deposits"
              value={stats.totalDeposits || stats.transactions?.deposits || 0}
              prefix={<ArrowUpOutlined />}
              valueStyle={{ color: "#52c41a" }}
              formatter={(value) => formatCurrency(value)}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Withdrawals"
              value={stats.totalWithdrawals || stats.transactions?.withdrawals || 0}
              prefix={<TransactionOutlined />}
              valueStyle={{ color: "#ff4d4f" }}
              formatter={(value) => formatCurrency(value)}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Bets"
              value={stats.totalBets || stats.bets?.total || 0}
              prefix={<TeamOutlined />}
              valueStyle={{ color: "#1890ff" }}
              formatter={(value) => formatNumber(value)}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Turnover"
              value={stats.totalTurnover || stats.bets?.turnover || 0}
              prefix={<DollarOutlined />}
              valueStyle={{ color: "#722ed1" }}
              formatter={(value) => formatCurrency(value)}
            />
          </Card>
        </Col>
      </Row>

      {/* Charts */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="User Activity" style={{ height: "400px" }}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={userActivityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="bets" fill="#8884d8" name="Total Bets" />
                <Bar dataKey="wins" fill="#82ca9d" name="Wins" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Profit Trend" style={{ height: "400px" }}>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={profitData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend />
                <Line type="monotone" dataKey="profit" stroke="#8884d8" />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* Recent User Activities */}
      <Card title="Recent User Activities">
        <Table
          columns={activityColumns}
          dataSource={recentActivities}
          pagination={{ pageSize: 5 }}
          size="small"
        />
      </Card>
    </div>
  );
};

export default AgentDashboard;
