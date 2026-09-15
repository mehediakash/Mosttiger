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
import { referralAPI } from "../../services/api";
import { buildQueryFromFilters, getApiData, money } from "./referralUtils";

const { RangePicker } = DatePicker;

const emptyStats = {
  totalReferrals: 0,
  pendingDeposit: 0,
  waitingTurnover: 0,
  qualified: 0,
  pendingClaim: 0,
  claimed: 0,
  completed: 0,
  cancelled: 0,
  totalBonusGenerated: 0,
  totalBonusClaimed: 0,
  totalBonusCompleted: 0,
};

const ReferralAnalytics = () => {
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({});
  const [analytics, setAnalytics] = useState({ statistics: emptyStats, charts: {} });

  const loadAnalytics = async (nextFilters = filters) => {
    setLoading(true);
    try {
      const response = await referralAPI.getAnalytics(buildQueryFromFilters(nextFilters));
      const data = getApiData(response);
      setAnalytics({
        statistics: { ...emptyStats, ...(data.statistics || data.stats || {}) },
        charts: data.charts || {},
      });
    } catch (error) {
      message.error(error.response?.data?.message || "Failed to load referral analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics({});
  }, []);

  const monthlyReferral = useMemo(
    () => analytics.charts.monthlyReferral || analytics.charts.monthlyReferrals || [],
    [analytics.charts],
  );
  const dailyReferral = useMemo(
    () => analytics.charts.dailyReferral || analytics.charts.dailyReferrals || [],
    [analytics.charts],
  );
  const bonusTrend = useMemo(
    () => analytics.charts.referralBonusTrend || analytics.charts.bonusTrend || [],
    [analytics.charts],
  );
  const qualifiedTrend = useMemo(
    () => analytics.charts.qualifiedPlayersTrend || analytics.charts.qualifiedTrend || [],
    [analytics.charts],
  );

  const applyFilters = (values) => {
    setFilters(values);
    loadAnalytics(values);
  };

  const stats = analytics.statistics;

  return (
    <Space direction="vertical" size="large" className="w-full">
      <Card>
        <Form layout="inline" onFinish={applyFilters}>
          <Form.Item name="dateRange">
            <RangePicker />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                Apply
              </Button>
              <Button icon={<ReloadOutlined />} onClick={() => loadAnalytics()} loading={loading}>
                Refresh
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={6}><Card><Statistic title="Total Referrals" value={stats.totalReferrals} /></Card></Col>
        <Col xs={24} md={6}><Card><Statistic title="Pending Deposit" value={stats.pendingDeposit} /></Card></Col>
        <Col xs={24} md={6}><Card><Statistic title="Waiting Turnover" value={stats.waitingTurnover} /></Card></Col>
        <Col xs={24} md={6}><Card><Statistic title="Qualified" value={stats.qualified} /></Card></Col>
        <Col xs={24} md={6}><Card><Statistic title="Pending Claim" value={stats.pendingClaim} /></Card></Col>
        <Col xs={24} md={6}><Card><Statistic title="Claimed" value={stats.claimed} /></Card></Col>
        <Col xs={24} md={6}><Card><Statistic title="Completed" value={stats.completed} /></Card></Col>
        <Col xs={24} md={6}><Card><Statistic title="Cancelled" value={stats.cancelled} /></Card></Col>
        <Col xs={24} md={8}><Card><Statistic title="Total Bonus Generated" value={stats.totalBonusGenerated} formatter={money} /></Card></Col>
        <Col xs={24} md={8}><Card><Statistic title="Total Bonus Claimed" value={stats.totalBonusClaimed} formatter={money} /></Card></Col>
        <Col xs={24} md={8}><Card><Statistic title="Total Bonus Completed" value={stats.totalBonusCompleted} formatter={money} /></Card></Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="Monthly Referral" style={{ height: 360 }}>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={monthlyReferral}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line dataKey="total" stroke="#2563eb" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Daily Referral" style={{ height: 360 }}>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={dailyReferral}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="total" fill="#16a34a" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Referral Bonus Trend" style={{ height: 360 }}>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={bonusTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip formatter={money} />
                <Legend />
                <Area dataKey="generated" stroke="#f97316" fill="#f97316" />
                <Area dataKey="claimed" stroke="#7c3aed" fill="#7c3aed" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Qualified Players Trend" style={{ height: 360 }}>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={qualifiedTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line dataKey="qualified" stroke="#0891b2" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>
    </Space>
  );
};

export default ReferralAnalytics;
