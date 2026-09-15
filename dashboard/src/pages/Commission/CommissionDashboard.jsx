import React, { useState, useEffect } from "react";
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  DatePicker,
  Select,
  Button,
  Space,
  Tag,
  Typography,
  Spin,
  Empty,
  message,
} from "antd";
import {
  DollarOutlined,
  CalendarOutlined,
  RiseOutlined,
  TeamOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { commissionAPI, agentAPI } from "../../services/api";
import { formatCurrency, formatDate } from "../../utils/helpers";
import { useSelector } from "react-redux";
import dayjs from "dayjs";

const { RangePicker } = DatePicker;
const { Option } = Select;
const { Title, Text } = Typography;

const CommissionDashboard = () => {
  const [loading, setLoading] = useState(false);
  const [summaryData, setSummaryData] = useState(null);
  const [commissionHistory, setCommissionHistory] = useState([]);
  const [subAgents, setSubAgents] = useState([]);
  const [filters, setFilters] = useState({
    dateRange: null,
    subAgentId: null,
    page: 1,
    limit: 20,
  });
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });

  const { user } = useSelector((state) => state.auth);

  useEffect(() => {
    loadCommissionData();
    loadSubAgents();
  }, []);

  useEffect(() => {
    loadCommissionHistory();
  }, [filters.page, filters.dateRange, filters.subAgentId]);

  const loadCommissionData = async () => {
    setLoading(true);
    try {
      const response = await commissionAPI.getCommissionOverview();
      const data = response.data?.data;

      if (data) {
        setSummaryData({
          totalCommission: data.totalCommission || 0,
          todayCommission: data.todayCommission || 0,
          monthlyCommission: data.monthlyCommission || 0,
          pendingCommission: data.pendingCommission || 0,
          breakdown: data.breakdown || [],
        });
      }
    } catch (error) {
      console.error("Failed to load commission data:", error);
      message.error("Failed to load commission summary");
    } finally {
      setLoading(false);
    }
  };

  const loadCommissionHistory = async () => {
    setLoading(true);
    try {
      const params = {
        page: filters.page,
        limit: filters.limit,
      };

      if (filters.dateRange && filters.dateRange.length === 2) {
        params.startDate = filters.dateRange[0].format("YYYY-MM-DD");
        params.endDate = filters.dateRange[1].format("YYYY-MM-DD");
      }

      if (filters.subAgentId) {
        params.subAgentId = filters.subAgentId;
      }

      const response = await commissionAPI.getCommissionHistory(params);
      const data = response.data?.data;

      if (data) {
        setCommissionHistory(data.commissions || []);
        setPagination({
          current: data.currentPage || 1,
          pageSize: filters.limit,
          total: data.total || 0,
        });
      }
    } catch (error) {
      console.error("Failed to load commission history:", error);
      message.error("Failed to load commission history");
    } finally {
      setLoading(false);
    }
  };

  const loadSubAgents = async () => {
    try {
      const response = await agentAPI.getDownlineAgents({
        role: "agent,sub_agent",
        limit: 1000,
      });
      const agents = response.data?.data?.agents || response.data?.agents || [];
      setSubAgents(agents);
    } catch (error) {
      console.error("Failed to load sub-agents:", error);
    }
  };

  const handleRefresh = () => {
    loadCommissionData();
    loadCommissionHistory();
  };

  const handleTableChange = (newPagination) => {
    setFilters({
      ...filters,
      page: newPagination.current,
    });
  };

  const handleDateRangeChange = (dates) => {
    setFilters({
      ...filters,
      dateRange: dates,
      page: 1,
    });
  };

  const handleSubAgentChange = (value) => {
    setFilters({
      ...filters,
      subAgentId: value,
      page: 1,
    });
  };

  const handleClearFilters = () => {
    setFilters({
      dateRange: null,
      subAgentId: null,
      page: 1,
      limit: 20,
    });
  };

  // Commission History Table Columns
  const columns = [
    {
      title: "Date",
      dataIndex: "calculatedAt",
      key: "calculatedAt",
      render: (date) => formatDate(date),
      width: 150,
    },
    {
      title: "Sub Agent",
      dataIndex: "fromUser",
      key: "fromUser",
      render: (fromUser) => (
        <Space direction="vertical" size={0}>
          <Text strong>{fromUser?.fullName || "N/A"}</Text>
          <Text type="secondary" style={{ fontSize: "12px" }}>
            {fromUser?.email || ""}
          </Text>
        </Space>
      ),
    },
    {
      title: "Player Loss",
      dataIndex: "playerLoss",
      key: "playerLoss",
      render: (loss) => (
        <Text strong style={{ color: "#cf1322" }}>
          {formatCurrency(loss || 0)}
        </Text>
      ),
      align: "right",
    },
    {
      title: "Commission %",
      dataIndex: "commissionRate",
      key: "commissionRate",
      render: (rate) => (
        <Tag color="blue">{rate ? `${rate}%` : "N/A"}</Tag>
      ),
      align: "center",
    },
    {
      title: "Commission Amount",
      dataIndex: "amount",
      key: "amount",
      render: (amount) => (
        <Text strong style={{ color: "#3f8600", fontSize: "14px" }}>
          {formatCurrency(amount || 0)}
        </Text>
      ),
      align: "right",
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => {
        const colors = {
          pending: "orange",
          approved: "green",
          paid: "blue",
          rejected: "red",
        };
        return (
          <Tag color={colors[status] || "default"}>
            {status ? status.toUpperCase() : "N/A"}
          </Tag>
        );
      },
      align: "center",
    },
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
      render: (type) => (
        <Tag>{type ? type.replace("_", " ").toUpperCase() : "N/A"}</Tag>
      ),
      align: "center",
    },
  ];

  return (
    <div style={{ padding: "24px" }}>
      {/* Header */}
      <div
        style={{
          marginBottom: "24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <Title level={3} style={{ margin: 0 }}>
            Commission Dashboard
          </Title>
          <Text type="secondary">
            View your commission earnings from downline agents and players
          </Text>
        </div>
        <Button
          type="primary"
          icon={<ReloadOutlined />}
          onClick={handleRefresh}
          loading={loading}
        >
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: "24px" }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Commission Earned"
              value={summaryData?.totalCommission || 0}
              precision={2}
              prefix={<DollarOutlined />}
              suffix="৳"
              valueStyle={{ color: "#3f8600", fontWeight: "bold" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Today's Commission"
              value={summaryData?.todayCommission || 0}
              precision={2}
              prefix={<CalendarOutlined />}
              suffix="৳"
              valueStyle={{ color: "#1890ff" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="This Month's Commission"
              value={summaryData?.monthlyCommission || 0}
              precision={2}
              prefix={<RiseOutlined />}
              suffix="৳"
              valueStyle={{ color: "#722ed1" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Pending Commission"
              value={summaryData?.pendingCommission || 0}
              precision={2}
              prefix={<TeamOutlined />}
              suffix="৳"
              valueStyle={{ color: "#fa8c16" }}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card style={{ marginBottom: "24px" }}>
        <Space wrap size="middle">
          <RangePicker
            value={filters.dateRange}
            onChange={handleDateRangeChange}
            placeholder={["Start Date", "End Date"]}
            style={{ width: "280px" }}
          />
          <Select
            placeholder="Select Sub Agent"
            value={filters.subAgentId}
            onChange={handleSubAgentChange}
            allowClear
            showSearch
            optionFilterProp="children"
            style={{ width: "250px" }}
          >
            {subAgents.map((agent) => (
              <Option key={agent._id} value={agent._id}>
                {agent.fullName} ({agent.email})
              </Option>
            ))}
          </Select>
          <Button onClick={handleClearFilters}>Clear Filters</Button>
        </Space>
      </Card>

      {/* Commission History Table */}
      <Card title="Commission History">
        <Table
          columns={columns}
          dataSource={commissionHistory}
          rowKey="_id"
          loading={loading}
          pagination={pagination}
          onChange={handleTableChange}
          scroll={{ x: 1200 }}
          locale={{
            emptyText: (
              <Empty
                description="No commission data available"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ),
          }}
        />
      </Card>
    </div>
  );
};

export default CommissionDashboard;
