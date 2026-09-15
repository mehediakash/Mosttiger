import React, { useEffect, useCallback, useMemo } from "react";
import { Row, Col, Card, Statistic, Table, Tag, Spin, Alert } from "antd";
import { useDispatch, useSelector } from "react-redux";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
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
  UserOutlined,
  DollarOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  TransactionOutlined,
  TeamOutlined,
} from "@ant-design/icons";

import {
  fetchDashboardStart,
  fetchDashboardSuccess,
  fetchDashboardFailure,
} from "../../store/slices/dashboardSlice";
import { dashboardAPI } from "../../services/api";
import { formatCurrency, formatNumber } from "../../utils/helpers";

const AdminDashboard = () => {
  const dispatch = useDispatch();
  const {
    stats = {},
    recentActivities = [],
    financialData = {},
    gamingData = {},
    agentStats = {},
    userGrowth = [],
    loading,
    error,
  } = useSelector((state) => state.dashboard);

  const loadDashboardData = useCallback(async () => {
    dispatch(fetchDashboardStart());
    try {
      const response = await dashboardAPI.getAdminDashboard();

      // Check if response has the expected structure
      if (!response.data || !response.data.data) {
        throw new Error("Invalid API response structure");
      }

      // Transform API response to match expected structure
      const apiData = response.data.data; // Access the nested data property
      console.log("API Response:", response.data);
      console.log("Extracted Data:", apiData);
      console.log("Financial Stats Full:", apiData?.financialStats);
      console.log("All Financial Values:", {
        netCashFlow: apiData?.financialStats?.netCashFlow,
        totalRevenue: apiData?.financialStats?.totalRevenue,
        totalDeposits: apiData?.financialStats?.totalDeposits,
        totalWithdrawals: apiData?.financialStats?.totalWithdrawals,
        pendingDeposits: apiData?.financialStats?.pendingDeposits,
        pendingWithdrawals: apiData?.financialStats?.pendingWithdrawals,
      });
      const transformedData = {
        stats: {
          totalUsers: apiData?.userStats?.totalUsers || 0,
          activeUsers: apiData?.userStats?.activeUsers || 0,
          // Use netCashFlow (deposits - withdrawals) as the real revenue metric
          totalRevenue:
            apiData?.financialStats?.netCashFlow ||
            apiData?.financialStats?.totalDeposits ||
            apiData?.financialStats?.totalRevenue ||
            0,
          pendingTransactions:
            (apiData?.financialStats?.pendingDeposits || 0) +
            (apiData?.financialStats?.pendingWithdrawals || 0),
          totalDeposits: apiData?.financialStats?.totalDeposits || 0,
          totalWithdrawals: apiData?.financialStats?.totalWithdrawals || 0,
          activeAgents: apiData?.agentStats?.activeAgents || 0,
          totalAgents: apiData?.agentStats?.totalAgents || 0,
          totalBets: apiData?.gamingStats?.totalBets || 0,
          activePlayers: apiData?.gamingStats?.activePlayers || 0,
          popularGames: apiData?.gamingStats?.popularGames || [],
        },
        recentActivities: [
          // Transform recent deposits
          ...(apiData.recentActivities?.recentDeposits || []).map(
            (deposit) => ({
              key: deposit._id,
              user: deposit.user?.fullName || "Unknown User",
              activity: "Deposit",
              amount: deposit.amount,
              time: new Date(deposit.createdAt).toLocaleString(),
              status: deposit.status,
              type: "deposit",
            }),
          ),
          // Transform recent withdrawals
          ...(apiData.recentActivities?.recentWithdrawals || []).map(
            (withdrawal) => ({
              key: withdrawal._id,
              user: withdrawal.user?.fullName || "Unknown User",
              activity: "Withdrawal",
              amount: withdrawal.amount,
              time: new Date(withdrawal.createdAt).toLocaleString(),
              status: withdrawal.status,
              type: "withdrawal",
            }),
          ),
          // Transform recent registrations
          ...(apiData.recentActivities?.recentRegistrations || []).map(
            (registration) => ({
              key: registration._id,
              user: registration.fullName,
              activity: "Registration",
              amount: "-",
              time: new Date(registration.createdAt).toLocaleString(),
              status: "completed",
              type: "registration",
            }),
          ),
        ].slice(0, 10), // Limit to 10 most recent activities
        financialData: apiData.financialStats || {},
        gamingData: apiData.gamingStats || {},
        agentStats: apiData.agentStats || {},
        userGrowth: apiData.userStats?.userGrowth || [],
      };
      console.log("Transformed Data:", transformedData);
      dispatch(fetchDashboardSuccess(transformedData));
    } catch (err) {
      console.error("Failed to load admin dashboard data:", err);
      dispatch(
        fetchDashboardFailure(
          "Failed to load dashboard data. Please try again later.",
        ),
      );
    }
  }, [dispatch]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Transform user growth data for revenue chart
  const revenueData = useMemo(() => {
    if (!userGrowth || userGrowth.length === 0) {
      return [
        { name: "Jan", revenue: 0, users: 0 },
        { name: "Feb", revenue: 0, users: 0 },
        { name: "Mar", revenue: 0, users: 0 },
        { name: "Apr", revenue: 0, users: 0 },
        { name: "May", revenue: 0, users: 0 },
        { name: "Jun", revenue: 0, users: 0 },
      ];
    }

    return userGrowth.map((item) => ({
      name: new Date(item._id).toLocaleDateString("en-US", { month: "short" }),
      revenue: financialData.totalRevenue || 0,
      users: item.count || 0,
    }));
  }, [userGrowth, financialData.totalRevenue]);

  // Transform gaming stats for game distribution chart
  const gameDistributionData = useMemo(() => {
    // Use the gameDistribution data from API if available
    if (gamingData.gameDistribution && gamingData.gameDistribution.length > 0) {
      return gamingData.gameDistribution.map((game) => ({
        name: game.name,
        value: game.value,
      }));
    }

    // Fallback to popularGames if gameDistribution is not available
    if (gamingData.popularGames && gamingData.popularGames.length > 0) {
      return gamingData.popularGames.map((game) => ({
        name: game.name,
        value: game.count || 0,
      }));
    }

    // Default distribution
    return [
      { name: "Sports Betting", value: 150 },
      { name: "Casino Games", value: 120 },
      { name: "Slot Machines", value: 90 },
      { name: "Live Games", value: 60 },
    ];
  }, [gamingData.gameDistribution, gamingData.popularGames]);

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

  const activityColumns = [
    {
      title: "User",
      dataIndex: "user",
      key: "user",
    },
    {
      title: "Activity",
      dataIndex: "activity",
      key: "activity",
      render: (activity, record) => (
        <span>
          {activity}
          {record.type === "deposit" && (
            <span style={{ color: "#52c41a", marginLeft: "8px" }}>↓</span>
          )}
          {record.type === "withdrawal" && (
            <span style={{ color: "#ff4d4f", marginLeft: "8px" }}>↑</span>
          )}
          {record.type === "registration" && (
            <span style={{ color: "#1890ff", marginLeft: "8px" }}>★</span>
          )}
        </span>
      ),
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      render: (amount, record) => {
        if (record.type === "registration" || amount === "-") {
          return "-";
        }
        return formatCurrency(amount);
      },
    },
    {
      title: "Time",
      dataIndex: "time",
      key: "time",
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status, record) => {
        let color = "orange";
        if (status === "completed" || status === "approved") color = "green";
        else if (status === "rejected" || status === "failed") color = "red";
        else if (status === "pending") color = "orange";

        return <Tag color={color}>{status?.toUpperCase() || "UNKNOWN"}</Tag>;
      },
    },
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
      </div>
    );
  }
  console.log("Current Stats:", stats);
  console.log("Total Users:", stats.totalUsers);
  console.log(
    "Total Revenue Value:",
    stats.totalRevenue,
    "Type:",
    typeof stats.totalRevenue,
  );
  if (error) {
    return <Alert message="Error" description={error} type="error" showIcon />;
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
        {/* <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Active Users"
              value={stats.activeUsers || 0}
              prefix={<UserOutlined />}
              styles={{ content: { color: '#1890ff' } }}
            />
          </Card>
        </Col> */}
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Agents"
              value={stats.totalAgents || 0}
              prefix={<TeamOutlined />}
              styles={{ content: { color: "#722ed1" } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Revenue"
              value={Number(stats.totalRevenue) || 0}
              prefix={<DollarOutlined />}
              styles={{ content: { color: "#3f8600" } }}
              formatter={(value) => formatCurrency(Number(value))}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Pending Transactions"
              value={stats.pendingTransactions || 0}
              prefix={<TransactionOutlined />}
              styles={{ content: { color: "#cf1322" } }}
            />
          </Card>
        </Col>
      </Row>

      {/* Charts */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="User Growth Trend" style={{ height: "400px" }}>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="users"
                  stroke="#8884d8"
                  name="New Users"
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#82ca9d"
                  name="Revenue"
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Game Distribution" style={{ height: "400px" }}>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={gameDistributionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {gameDistributionData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatNumber(value)} />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* Revenue Breakdown */}
      {financialData.revenueBreakdown && (
        <Row gutter={[16, 16]}>
          <Col xs={24}>
            <Card title="Revenue Breakdown (Server-Calculated)" bordered={false}>
              <Row gutter={[16, 16]}>
                <Col xs={24} md={8}>
                  <Card type="inner" title="Direct User Revenue">
                    <Statistic
                      value={financialData.revenueBreakdown.directUserRevenue?.total || 0}
                      prefix="৳"
                      precision={2}
                      valueStyle={{ color: "#3f8600" }}
                    />
                    <div style={{ marginTop: 16, fontSize: "12px" }}>
                      <div>
                        From Games: ৳
                        {formatCurrency(
                          financialData.revenueBreakdown.directUserRevenue?.fromGames || 0
                        )}
                      </div>
                      <div>
                        From Sports: ৳
                        {formatCurrency(
                          financialData.revenueBreakdown.directUserRevenue?.fromSports || 0
                        )}
                      </div>
                      <div>
                        From Bets: ৳
                        {formatCurrency(
                          financialData.revenueBreakdown.directUserRevenue?.fromBets || 0
                        )}
                      </div>
                    </div>
                  </Card>
                </Col>
                <Col xs={24} md={8}>
                  <Card type="inner" title="Agent User Revenue">
                    <Statistic
                      value={financialData.revenueBreakdown.agentUserRevenue?.adminShare || 0}
                      prefix="৳"
                      precision={2}
                      valueStyle={{ color: "#1890ff" }}
                    />
                    <div style={{ marginTop: 16, fontSize: "12px" }}>
                      <div>
                        Total Player Losses: ৳
                        {formatCurrency(
                          financialData.revenueBreakdown.agentUserRevenue?.totalLosses || 0
                        )}
                      </div>
                      <div style={{ fontSize: "11px", marginTop: 8, paddingTop: 8, borderTop: "1px solid #f0f0f0" }}>
                        <div>From Games: ৳{formatCurrency(financialData.revenueBreakdown.agentUserRevenue?.fromGames || 0)}</div>
                        <div>From Sports: ৳{formatCurrency(financialData.revenueBreakdown.agentUserRevenue?.fromSports || 0)}</div>
                        <div>From Bets: ৳{formatCurrency(financialData.revenueBreakdown.agentUserRevenue?.fromBets || 0)}</div>
                      </div>
                      <div style={{ color: "#cf1322", marginTop: 8, paddingTop: 8, borderTop: "1px solid #f0f0f0" }}>
                        Commission Paid: ৳
                        {formatCurrency(
                          financialData.revenueBreakdown.agentUserRevenue?.commissionPaid || 0
                        )}
                      </div>
                    </div>
                  </Card>
                </Col>
                <Col xs={24} md={8}>
                  <Card type="inner" title="Commission by Level">
                    <div style={{ fontSize: "12px" }}>
                      <div style={{ marginBottom: 8 }}>
                        <strong>Master Agent:</strong> ৳
                        {formatCurrency(
                          financialData.revenueBreakdown.commissionBreakdown?.masterAgent?.total || 0
                        )}{" "}
                        ({financialData.revenueBreakdown.commissionBreakdown?.masterAgent?.count || 0} transactions)
                      </div>
                      <div style={{ marginBottom: 8 }}>
                        <strong>Agent:</strong> ৳
                        {formatCurrency(
                          financialData.revenueBreakdown.commissionBreakdown?.agent?.total || 0
                        )}{" "}
                        ({financialData.revenueBreakdown.commissionBreakdown?.agent?.count || 0} transactions)
                      </div>
                      <div>
                        <strong>Sub Agent:</strong> ৳
                        {formatCurrency(
                          financialData.revenueBreakdown.commissionBreakdown?.subAgent?.total || 0
                        )}{" "}
                        ({financialData.revenueBreakdown.commissionBreakdown?.subAgent?.count || 0} transactions)
                      </div>
                    </div>
                  </Card>
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>
      )}

      {/* Recent Activities */}
      <Card title="Recent Activities">
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

export default AdminDashboard;