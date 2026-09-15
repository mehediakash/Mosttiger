import React, { useEffect, useMemo, useState } from "react";
import { Button, Card, Col, DatePicker, Form, message, Row, Space, Statistic } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { affiliateAPI } from "../../services/api";
import { chartMonth, getApplicationRows, getUserId, money } from "./affiliateUtils";

const { RangePicker } = DatePicker;

const AffiliateAnalytics = () => {
  const [loading, setLoading] = useState(false);
  const [applications, setApplications] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [filters, setFilters] = useState({});

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const [appResponse, withdrawResponse] = await Promise.all([
        affiliateAPI.getApplications({ page: 1, limit: 100 }),
        affiliateAPI.getWithdrawals({ page: 1, limit: 100 }),
      ]);
      const apps = appResponse.data?.data?.applications || [];
      setApplications(apps);
      setWithdrawals(withdrawResponse.data?.data?.withdrawals || []);

      const approvedApps = apps.filter(
        (app) => app.user?.affiliate?.status === "approved" || app.status === "approved",
      );
      const transactionResponses = await Promise.allSettled(
        approvedApps.slice(0, 50).map((app) =>
          affiliateAPI.getAffiliateTransactions(getUserId(app), {
            page: 1,
            limit: 100,
          }),
        ),
      );
      setTransactions(
        transactionResponses.flatMap((result) =>
          result.status === "fulfilled"
            ? result.value.data?.data?.transactions || []
            : [],
        ),
      );
    } catch (error) {
      message.error("Failed to load affiliate analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  const filteredApplications = useMemo(() => {
    if (!filters.dateRange?.length) return applications;
    const [start, end] = filters.dateRange;
    return applications.filter((app) => {
      const created = new Date(app.createdAt).getTime();
      return created >= start.startOf("day").valueOf() && created <= end.endOf("day").valueOf();
    });
  }, [applications, filters.dateRange]);

  const approvedAffiliates = filteredApplications.filter(
    (app) => app.user?.affiliate?.status === "approved" || app.status === "approved",
  );

  const stats = {
    totalAffiliates: approvedAffiliates.length,
    pendingApplications: filteredApplications.filter((app) => app.status === "pending").length,
    approvedAffiliates: approvedAffiliates.length,
    qualifiedPlayers: approvedAffiliates.reduce(
      (sum, app) => sum + Number(app.user?.affiliate?.statistics?.qualifiedPlayers || 0),
      0,
    ),
    pendingWithdraw: withdrawals
      .filter((item) => item.status === "pending")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0),
    totalRevenueShare: transactions
      .filter((item) => item.type === "commission")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0),
    totalPaidCommission: transactions
      .filter((item) => item.type === "withdraw_approved")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0),
  };

  const monthly = useMemo(() => {
    const map = new Map();
    const ensure = (month) => {
      if (!map.has(month)) {
        map.set(month, {
          month,
          affiliates: 0,
          revenueShare: 0,
          withdraw: 0,
          qualifiedPlayers: 0,
        });
      }
      return map.get(month);
    };

    getApplicationRows(filteredApplications).forEach((app) => {
      const entry = ensure(chartMonth(app.createdAt));
      entry.affiliates += 1;
      entry.qualifiedPlayers += Number(
        app.user?.affiliate?.statistics?.qualifiedPlayers || 0,
      );
    });

    transactions.forEach((item) => {
      const entry = ensure(chartMonth(item.createdAt));
      if (item.type === "commission") entry.revenueShare += Number(item.amount || 0);
      if (item.type === "withdraw_approved") entry.withdraw += Number(item.amount || 0);
    });

    withdrawals.forEach((item) => {
      const entry = ensure(chartMonth(item.createdAt));
      if (item.status === "approved" || item.status === "completed") {
        entry.withdraw += Number(item.amount || 0);
      }
    });

    return Array.from(map.values());
  }, [filteredApplications, transactions, withdrawals]);

  const chartTooltipCurrency = (value) => money(value);

  return (
    <Space direction="vertical" size="large" className="w-full">
      <Card>
        <Form layout="inline" onFinish={setFilters}>
          <Form.Item name="dateRange">
            <RangePicker />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                Apply
              </Button>
              <Button icon={<ReloadOutlined />} onClick={loadAnalytics} loading={loading}>
                Refresh
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={6}><Card><Statistic title="Total Affiliates" value={stats.totalAffiliates} /></Card></Col>
        <Col xs={24} md={6}><Card><Statistic title="Pending Applications" value={stats.pendingApplications} /></Card></Col>
        <Col xs={24} md={6}><Card><Statistic title="Approved Affiliates" value={stats.approvedAffiliates} /></Card></Col>
        <Col xs={24} md={6}><Card><Statistic title="Qualified Players" value={stats.qualifiedPlayers} /></Card></Col>
        <Col xs={24} md={6}><Card><Statistic title="Pending Withdraw" value={stats.pendingWithdraw} formatter={money} /></Card></Col>
        <Col xs={24} md={6}><Card><Statistic title="Total Revenue Share" value={stats.totalRevenueShare} formatter={money} /></Card></Col>
        <Col xs={24} md={6}><Card><Statistic title="Total Paid Commission" value={stats.totalPaidCommission} formatter={money} /></Card></Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="Affiliate Growth" style={{ height: 360 }}>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line dataKey="affiliates" stroke="#2563eb" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Monthly Revenue Share" style={{ height: 360 }}>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={chartTooltipCurrency} />
                <Legend />
                <Area dataKey="revenueShare" stroke="#16a34a" fill="#16a34a" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Withdraw Trend" style={{ height: 360 }}>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={chartTooltipCurrency} />
                <Legend />
                <Bar dataKey="withdraw" fill="#f97316" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Qualified Players Trend" style={{ height: 360 }}>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line dataKey="qualifiedPlayers" stroke="#7c3aed" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>
    </Space>
  );
};

export default AffiliateAnalytics;
