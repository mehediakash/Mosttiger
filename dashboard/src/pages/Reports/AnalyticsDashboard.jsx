import React, { useState, useEffect } from 'react';
import {
  Card, Row, Col, Statistic, DatePicker, Select, Button,
  Table, Progress, message, Space
} from 'antd';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import {
  DollarOutlined, UserOutlined, TrophyOutlined,
  BarChartOutlined, FilterOutlined, ReloadOutlined,
  RiseOutlined, FallOutlined
} from '@ant-design/icons';
import { reportAPI } from '../../services/api';
import { formatCurrency, formatNumber, formatDate } from '../../utils/helpers';

const { RangePicker } = DatePicker;
const { Option } = Select;

const AnalyticsDashboard = () => {
  const [gamingAnalytics, setGamingAnalytics] = useState({});
  const [sportsAnalytics, setSportsAnalytics] = useState({});
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState([]);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async (params = {}) => {
    setLoading(true);
    try {
      const [gamingResponse, sportsResponse] = await Promise.all([
        reportAPI.getGamingAnalytics(params),
        reportAPI.getSportsAnalytics(params)
      ]);

      setGamingAnalytics(gamingResponse.data.data || {});
      setSportsAnalytics(sportsResponse.data.data || {});
    } catch (error) {
      console.error('Failed to load analytics:', error);
      message.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = () => {
    const params = {};
    if (dateRange.length === 2) {
      params.startDate = dateRange[0].format('YYYY-MM-DD');
      params.endDate = dateRange[1].format('YYYY-MM-DD');
    }
    loadAnalytics(params);
  };

  // Process gaming analytics data
  const processGamingData = () => {
    const gamePerformance = gamingAnalytics.gamePerformance || [];

    return {
      gamePerformance,
      userEngagement: [], // This would need a separate endpoint
      revenueTrends: [] // This would need a separate endpoint
    };
  };

  // Process sports analytics data
  const processSportsData = () => {
    const popularSports = sportsAnalytics.popularSports || [];

    return {
      eventStats: popularSports,
      bettingTrends: [], // This would need a separate endpoint
      popularSports
    };
  };

  const gamingData = processGamingData();
  const sportsData = processSportsData();

  // Colors for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  // Gaming performance columns
  const gameColumns = [
    {
      title: 'Game Name',
      dataIndex: 'gameName',
      key: 'gameName',
    },
    {
      title: 'Provider',
      dataIndex: 'brand',
      key: 'brand',
    },
    {
      title: 'Total Sessions',
      dataIndex: 'totalSessions',
      key: 'totalSessions',
      render: (value) => formatNumber(value || 0),
    },
    {
      title: 'Total Bets',
      dataIndex: 'totalBets',
      key: 'totalBets',
      render: (value) => formatCurrency(value || 0),
    },
    {
      title: 'Total Wins',
      dataIndex: 'totalWins',
      key: 'totalWins',
      render: (value) => formatCurrency(value || 0),
    },
    {
      title: 'Net Revenue',
      dataIndex: 'netRevenue',
      key: 'netRevenue',
      render: (value) => formatCurrency(value || 0),
    },
    {
      title: 'Unique Players',
      dataIndex: 'uniquePlayers',
      key: 'uniquePlayers',
      render: (value) => formatNumber(value || 0),
    },
    {
      title: 'RTP (%)',
      dataIndex: 'rtp',
      key: 'rtp',
      render: (value) => `${(value || 0).toFixed(2)}%`,
    },
  ];

  // Sports events columns
  const sportsColumns = [
    {
      title: 'Sport',
      dataIndex: 'sport',
      key: 'sport',
    },
    {
      title: 'Total Bets',
      dataIndex: 'totalBets',
      key: 'totalBets',
      render: (value) => formatNumber(value || 0),
    },
    {
      title: 'Total Stake',
      dataIndex: 'totalStake',
      key: 'totalStake',
      render: (value) => formatCurrency(value || 0),
    },
    {
      title: 'Total Wins',
      dataIndex: 'totalWins',
      key: 'totalWins',
      render: (value) => formatCurrency(value || 0),
    },
    {
      title: 'Net Revenue',
      dataIndex: 'netRevenue',
      key: 'netRevenue',
      render: (value) => formatCurrency(value || 0),
    },
    {
      title: 'Unique Players',
      dataIndex: 'uniquePlayers',
      key: 'uniquePlayers',
      render: (value) => formatNumber(value || 0),
    },
    {
      title: 'Average Stake',
      dataIndex: 'averageStake',
      key: 'averageStake',
      render: (value) => formatCurrency(value || 0),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Analytics Dashboard</h1>
          <p className="text-gray-600">Comprehensive gaming and sports analytics</p>
        </div>

        {/* Filters */}
        <Space>
          <RangePicker
            value={dateRange}
            onChange={setDateRange}
            placeholder={['Start Date', 'End Date']}
          />
          <Button
            type="primary"
            icon={<FilterOutlined />}
            onClick={handleFilter}
            loading={loading}
          >
            Apply Filters
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              setDateRange([]);
              loadAnalytics();
            }}
          >
            Reset
          </Button>
        </Space>
      </div>

      {/* Gaming Analytics Section */}
      <Card title="Gaming Analytics" className="mb-6">
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={6}>
            <Card size="small">
              <Statistic
                title="Total Games"
                value={gamingData.gamePerformance?.length || 0}
                prefix={<TrophyOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card size="small">
              <Statistic
                title="Total Sessions"
                value={gamingData.gamePerformance?.reduce((sum, item) => sum + (item.totalSessions || 0), 0) || 0}
                prefix={<UserOutlined />}
                valueStyle={{ color: '#52c41a' }}
                formatter={value => formatNumber(value)}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card size="small">
              <Statistic
                title="Total Bets"
                value={gamingData.gamePerformance?.reduce((sum, item) => sum + (item.totalBets || 0), 0) || 0}
                prefix={<DollarOutlined />}
                valueStyle={{ color: '#faad14' }}
                formatter={value => formatCurrency(value)}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card size="small">
              <Statistic
                title="Net Revenue"
                value={gamingData.gamePerformance?.reduce((sum, item) => sum + (item.netRevenue || 0), 0) || 0}
                prefix={<DollarOutlined />}
                valueStyle={{ color: '#722ed1' }}
                formatter={value => formatCurrency(value)}
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]} className="mt-6">
          <Col xs={24} lg={12}>
            <Card title="Game Performance" className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={gamingData.gamePerformance?.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="gameName" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend />
                  <Bar dataKey="netRevenue" fill="#1890ff" name="Net Revenue" />
                  <Bar dataKey="totalBets" fill="#52c41a" name="Total Bets" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card title="Game RTP Distribution" className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={gamingData.gamePerformance?.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="gameName" angle={-45} textAnchor="end" height={80} />
                  <YAxis domain={[0, 100]} />
                  <Tooltip formatter={(value) => `${value?.toFixed(2)}%`} />
                  <Legend />
                  <Bar dataKey="rtp" fill="#faad14" name="RTP %" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </Col>
        </Row>

        <Card title="Top Performing Games" className="mt-6">
          <Table
            columns={gameColumns}
            dataSource={gamingData.gamePerformance}
            loading={loading}
            pagination={{ pageSize: 10 }}
            scroll={{ x: 800 }}
          />
        </Card>
      </Card>

      {/* Sports Analytics Section */}
      <Card title="Sports Analytics">
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={6}>
            <Card size="small">
              <Statistic
                title="Total Sports"
                value={sportsData.popularSports?.length || 0}
                prefix={<TrophyOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card size="small">
              <Statistic
                title="Total Bets"
                value={sportsData.eventStats?.reduce((sum, item) => sum + (item.totalBets || 0), 0) || 0}
                prefix={<BarChartOutlined />}
                valueStyle={{ color: '#52c41a' }}
                formatter={value => formatNumber(value)}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card size="small">
              <Statistic
                title="Total Stake"
                value={sportsData.eventStats?.reduce((sum, item) => sum + (item.totalStake || 0), 0) || 0}
                prefix={<DollarOutlined />}
                valueStyle={{ color: '#faad14' }}
                formatter={value => formatCurrency(value)}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card size="small">
              <Statistic
                title="Net Revenue"
                value={sportsData.eventStats?.reduce((sum, item) => sum + (item.netRevenue || 0), 0) || 0}
                prefix={<DollarOutlined />}
                valueStyle={{ color: '#722ed1' }}
                formatter={value => formatCurrency(value)}
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]} className="mt-6">
          <Col xs={24} lg={12}>
            <Card title="Sports Performance" className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sportsData.popularSports}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="sport" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend />
                  <Bar dataKey="netRevenue" fill="#1890ff" name="Net Revenue" />
                  <Bar dataKey="totalStake" fill="#52c41a" name="Total Stake" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card title="Sports Distribution by Bets" className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sportsData.popularSports}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ sport, percent }) => `${sport} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="totalBets"
                  >
                    {sportsData.popularSports?.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatNumber(value)} />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </Col>
        </Row>

        <Card title="Sports Events Summary" className="mt-6">
          <Table
            columns={sportsColumns}
            dataSource={sportsData.eventStats}
            loading={loading}
            pagination={{ pageSize: 10 }}
            scroll={{ x: 800 }}
          />
        </Card>
      </Card>
    </div>
  );
};

export default AnalyticsDashboard;