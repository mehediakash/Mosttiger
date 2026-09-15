import React, { useState, useEffect } from "react";
import {
  Card,
  Table,
  DatePicker,
  Select,
  Button,
  Row,
  Col,
  Statistic,
  Space,
  InputNumber,
  Form,
  message,
} from "antd";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  DollarOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  DownloadOutlined,
  FilterOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { reportAPI } from "../../services/api";
import { formatCurrency, formatNumber } from "../../utils/helpers";

const { RangePicker } = DatePicker;
const { Option } = Select;

const FinancialReports = () => {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState({});
  const [, setReportType] = useState("daily");
  const [form] = Form.useForm();

  const safeNumber = (value) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
  };

  useEffect(() => {
    loadReportData();
  }, []);

  const loadReportData = async (params = {}) => {
    if (params.reportType) {
      setReportType(params.reportType);
    }

    setLoading(true);
    try {
      const response = await reportAPI.getFinancialReport(params);
      const data = response.data.data;
      console.log("Financial Report Data:", data);
      console.log("Deposit Report:", data.depositReport);
      console.log("Withdrawal Report:", data.withdrawalReport);
      console.log("Revenue Report:", data.revenueReport);
      console.log("User Activity:", data.userActivity);
      setReportData(data);
    } catch (error) {
      console.error("Failed to load financial report:", error);
      message.error("Failed to load financial report data");
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = (values) => {
    const nextReportType = values.reportType || "daily";
    setReportType(nextReportType);

    const params = {
      startDate: values.dateRange?.[0]?.format("YYYY-MM-DD"),
      endDate: values.dateRange?.[1]?.format("YYYY-MM-DD"),
      reportType: nextReportType,
    };

    loadReportData(params);
  };

  const exportReport = () => {
    // Implement export functionality
    message.info("Export feature coming soon");
  };

  const normalizeGroupId = (id) => {
    if (id === null || id === undefined) {
      return { key: "all", label: "All Time", sortValue: 0 };
    }

    if (typeof id === "string" || typeof id === "number") {
      const dateValue = new Date(id).getTime();
      return {
        key: String(id),
        label: String(id),
        sortValue: Number.isFinite(dateValue)
          ? dateValue
          : Number.MAX_SAFE_INTEGER,
      };
    }

    if (typeof id === "object") {
      const { year, month, day, week, hour } = id;
      const pad = (value) => String(value || 0).padStart(2, "0");

      if (week) {
        const startOfYear = new Date(year || 0, 0, 1).getTime();
        const sortValue =
          startOfYear + ((week || 1) - 1) * 7 * 24 * 60 * 60 * 1000;
        return {
          key: JSON.stringify(id),
          label: `${year || "0000"}-W${pad(week)}`,
          sortValue,
        };
      }

      if (hour !== undefined) {
        const sortValue = new Date(
          year || 0,
          (month || 1) - 1,
          day || 1,
          hour || 0,
        ).getTime();
        return {
          key: JSON.stringify(id),
          label: `${year || "0000"}-${pad(month || 1)}-${pad(day || 1)} ${pad(hour)}:00`,
          sortValue,
        };
      }

      if (day !== undefined) {
        const sortValue = new Date(
          year || 0,
          (month || 1) - 1,
          day || 1,
        ).getTime();
        return {
          key: JSON.stringify(id),
          label: `${year || "0000"}-${pad(month || 1)}-${pad(day || 1)}`,
          sortValue,
        };
      }

      if (month !== undefined) {
        const sortValue = new Date(year || 0, (month || 1) - 1, 1).getTime();
        return {
          key: JSON.stringify(id),
          label: `${year || "0000"}-${pad(month || 1)}`,
          sortValue,
        };
      }

      return {
        key: JSON.stringify(id),
        label: JSON.stringify(id),
        sortValue: Number.MAX_SAFE_INTEGER,
      };
    }

    return {
      key: String(id),
      label: String(id),
      sortValue: Number.MAX_SAFE_INTEGER,
    };
  };

  // Process data for charts and tables
  const processReportData = () => {
    const {
      depositReport = [],
      withdrawalReport = [],
      revenueReport = [],
      userActivity = [],
    } = reportData || {};

    const combinedData = {};

    const ensureEntry = (meta) => {
      if (!combinedData[meta.key]) {
        combinedData[meta.key] = {
          key: meta.key,
          date: meta.label,
          sortValue: meta.sortValue,
        };
      }
      return combinedData[meta.key];
    };

    depositReport.forEach((item) => {
      const meta = normalizeGroupId(item._id);
      const entry = ensureEntry(meta);
      entry.deposits = safeNumber(
        item.totalAmount || item.total || item.amount || 0,
      );
      entry.depositCount = item.count || 0;
    });

    withdrawalReport.forEach((item) => {
      const meta = normalizeGroupId(item._id);
      const entry = ensureEntry(meta);
      entry.withdrawals = safeNumber(
        item.totalAmount ||
          item.total ||
          item.amount ||
          item.totalWithdrawal ||
          item.totalWithdrawals ||
          item.totalWithdrawAmount ||
          item.totalStake ||
          0,
      );
      entry.withdrawalCount = item.count || 0;
    });

    revenueReport.forEach((item) => {
      const meta = normalizeGroupId(item._id);
      const entry = ensureEntry(meta);
      entry.turnover = safeNumber(item.totalTurnover || item.totalStake || 0);
      entry.ggr = safeNumber(item.totalGGR || item.totalRevenue || 0);
      entry.profit = safeNumber(item.totalProfit || item.netProfit || 0);
    });

    userActivity.forEach((item) => {
      const meta = normalizeGroupId(item._id);
      const entry = ensureEntry(meta);
      entry.activeUsers = safeNumber(item.activeUsers || 0);
      entry.newUsers = safeNumber(item.newUsers || 0);
    });

    Object.values(combinedData).forEach((item) => {
      item.net = (item.deposits || 0) - (item.withdrawals || 0);
    });

    console.log("Processed Table Data:", Object.values(combinedData));

    return Object.values(combinedData).sort(
      (a, b) => a.sortValue - b.sortValue,
    );
  };

  const tableData = processReportData();

  // Calculate summary stats
  const calculateStats = () => {
    const totalDeposits = tableData.reduce(
      (sum, item) => sum + (item.deposits || 0),
      0,
    );
    const totalWithdrawals = tableData.reduce(
      (sum, item) => sum + (item.withdrawals || 0),
      0,
    );
    const totalTurnover = tableData.reduce(
      (sum, item) => sum + (item.turnover || 0),
      0,
    );
    const totalGGR = tableData.reduce((sum, item) => sum + (item.ggr || 0), 0);
    const totalActiveUsers = tableData.reduce(
      (sum, item) => sum + (item.activeUsers || 0),
      0,
    );
    const totalNewUsers = tableData.reduce(
      (sum, item) => sum + (item.newUsers || 0),
      0,
    );

    console.log("Calculated Stats:", {
      totalDeposits,
      totalWithdrawals,
      totalTurnover,
      totalGGR,
      totalActiveUsers,
      totalNewUsers,
    });

    return {
      totalDeposits,
      totalWithdrawals,
      totalTurnover,
      totalGGR,
      netRevenue: totalDeposits - totalWithdrawals,
      totalActiveUsers,
      totalNewUsers,
    };
  };

  const stats = calculateStats();

  const columns = [
    {
      title: "Date",
      dataIndex: "date",
      key: "date",
      render: (value) => value || "-",
    },
    {
      title: "Deposits",
      dataIndex: "deposits",
      key: "deposits",
      render: (value) => formatCurrency(value || 0),
    },
    {
      title: "Withdrawals",
      dataIndex: "withdrawals",
      key: "withdrawals",
      render: (value) => formatCurrency(value || 0),
    },
    {
      title: "Net Cashflow",
      dataIndex: "net",
      key: "net",
      render: (value) => (
        <span style={{ color: (value || 0) >= 0 ? "#3f8600" : "#cf1322" }}>
          {formatCurrency(value || 0)}
        </span>
      ),
    },
    {
      title: "Turnover",
      dataIndex: "turnover",
      key: "turnover",
      render: (value) => formatCurrency(value || 0),
    },
    {
      title: "GGR",
      dataIndex: "ggr",
      key: "ggr",
      render: (value) => formatCurrency(value || 0),
    },
    {
      title: "Active Users",
      dataIndex: "activeUsers",
      key: "activeUsers",
      render: (value) => formatNumber(value || 0),
    },
    {
      title: "Total Users",
      dataIndex: "newUsers",
      key: "newUsers",
      render: (value) => formatNumber(value || 0),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <Form
          form={form}
          layout="inline"
          onFinish={handleFilter}
          className="mb-4"
        >
          <Form.Item name="dateRange" label="Date Range">
            <RangePicker />
          </Form.Item>

          <Form.Item name="reportType" label="Report Type" initialValue="daily">
            <Select style={{ width: 120 }}>
              <Option value="daily">Daily</Option>
              <Option value="weekly">Weekly</Option>
              <Option value="monthly">Monthly</Option>
            </Select>
          </Form.Item>

          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                icon={<FilterOutlined />}
              >
                Apply Filters
              </Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => {
                  form.resetFields();
                  loadReportData();
                }}
              >
                Reset
              </Button>
              <Button icon={<DownloadOutlined />} onClick={exportReport}>
                Export
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      {/* Statistics */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Total Deposits"
              value={stats.totalDeposits}
              prefix={<DollarOutlined />}
              styles={{ value: { color: "#3f8600" } }}
              formatter={(value) => formatCurrency(value)}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Total Withdrawals"
              value={stats.totalWithdrawals}
              prefix={<DollarOutlined />}
              styles={{ value: { color: "#cf1322" } }}
              formatter={(value) => formatCurrency(value)}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Net Revenue"
              value={stats.netRevenue}
              prefix={<DollarOutlined />}
              styles={{
                value: {
                  color: stats.netRevenue >= 0 ? "#52c41a" : "#cf1322",
                },
              }}
              formatter={(value) => formatCurrency(value)}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Total GGR"
              value={stats.totalGGR}
              prefix={<DollarOutlined />}
              styles={{ value: { color: "#1890ff" } }}
              formatter={(value) => formatCurrency(value)}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} className="mt-4">
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Total Turnover"
              value={stats.totalTurnover}
              prefix={<DollarOutlined />}
              styles={{ value: { color: "#faad14" } }}
              formatter={(value) => formatCurrency(value)}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Active Users"
              value={stats.totalActiveUsers}
              styles={{ value: { color: "#52c41a" } }}
              formatter={(value) => formatNumber(value)}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Total Users"
              value={stats.totalNewUsers}
              styles={{ value: { color: "#1890ff" } }}
              formatter={(value) => formatNumber(value)}
            />
          </Card>
        </Col>
      </Row>

      {/* Charts */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="Revenue Trend" className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={tableData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="deposits"
                  stackId="1"
                  stroke="#3f8600"
                  fill="#3f8600"
                  name="Deposits"
                />
                <Area
                  type="monotone"
                  dataKey="withdrawals"
                  stackId="2"
                  stroke="#cf1322"
                  fill="#cf1322"
                  name="Withdrawals"
                />
                <Area
                  type="monotone"
                  dataKey="ggr"
                  stackId="3"
                  stroke="#1890ff"
                  fill="#1890ff"
                  name="GGR"
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="User Activity Trend" className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={tableData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => formatNumber(value)} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="activeUsers"
                  stroke="#52c41a"
                  strokeWidth={2}
                  name="Active Users"
                />
                <Line
                  type="monotone"
                  dataKey="newUsers"
                  stroke="#1890ff"
                  strokeWidth={2}
                  name="Total Users"
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* Detailed Table */}
      <Card title="Financial Summary">
        <Table
          columns={columns}
          dataSource={tableData}
          loading={loading}
          rowKey="key"
          pagination={{ pageSize: 10 }}
          scroll={{ x: 800 }}
        />
      </Card>
    </div>
  );
};

export default FinancialReports;
