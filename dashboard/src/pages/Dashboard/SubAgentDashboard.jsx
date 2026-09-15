import React, { useEffect } from 'react';
import { Row, Col, Card, Statistic, Table, Tag, Spin, Alert } from 'antd';
import { useDispatch, useSelector } from 'react-redux';
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  UserOutlined, DollarOutlined, ArrowUpOutlined,
  ArrowDownOutlined, TransactionOutlined
} from '@ant-design/icons';

import { fetchDashboardStart, fetchDashboardSuccess, fetchDashboardFailure } from '../../store/slices/dashboardSlice';
import { dashboardAPI } from '../../services/api';
import { formatCurrency, formatNumber } from '../../utils/helpers';

const SubAgentDashboard = () => {
  const dispatch = useDispatch();
  const { stats = {}, recentActivities = [], loading, error } = useSelector(state => state.dashboard);

  useEffect(() => {
    const loadDashboardData = async () => {
      dispatch(fetchDashboardStart());
      try {
        const response = await dashboardAPI.getAgentDashboard(); // Using same endpoint for sub-agent
        dispatch(fetchDashboardSuccess(response.data));
      } catch (err) {
        dispatch(fetchDashboardFailure(err.message));
      }
    };

    loadDashboardData();
  }, [dispatch]);

  // Sample data for sub-agent
  const userPerformanceData = [
    { name: 'User 1', turnover: 4000, net: 400 },
    { name: 'User 2', turnover: 3000, net: -200 },
    { name: 'User 3', turnover: 2000, net: 150 },
    { name: 'User 4', turnover: 2780, net: -100 },
    { name: 'User 5', turnover: 1890, net: 300 },
  ];

  const commissionData = [
    { name: 'Jan', commission: 1000 },
    { name: 'Feb', commission: 800 },
    { name: 'Mar', commission: 1200 },
    { name: 'Apr', commission: 900 },
    { name: 'May', commission: 1100 },
    { name: 'Jun', commission: 1300 },
  ];

  const activityColumns = [
    {
      title: 'User',
      dataIndex: 'user',
      key: 'user',
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type) => (
        <Tag color={type === 'deposit' ? 'green' : type === 'withdrawal' ? 'blue' : 'orange'}>
          {type.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount) => formatCurrency(amount),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={status === 'completed' ? 'green' : 'orange'}>
          {status.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Time',
      dataIndex: 'time',
      key: 'time',
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
      {/* Statistics Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="My Users"
              value={stats.myUsers || 25}
              prefix={<UserOutlined />}
              styles={{ content: { color: '#3f8600' } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="My Commission"
              value={stats.myCommission || 5400}
              prefix={<DollarOutlined />}
              styles={{ content: { color: '#3f8600' } }}
              formatter={value => formatCurrency(value)}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Team Turnover"
              value={stats.teamTurnover || 45400}
              prefix={<TransactionOutlined />}
              styles={{ content: { color: '#1890ff' } }}
              formatter={value => formatCurrency(value)}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Active Today"
              value={stats.activeToday || 8}
              prefix={<UserOutlined />}
              styles={{ content: { color: '#cf1322' } }}
            />
          </Card>
        </Col>
      </Row>

      {/* Charts */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="User Performance" style={{ height: '400px' }}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={userPerformanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey="turnover" fill="#8884d8" name="Turnover" />
                <Bar dataKey="net" fill="#82ca9d" name="Net Profit/Loss" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Commission Trend" style={{ height: '400px' }}>
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

      {/* Recent Transactions */}
      <Card title="Recent User Transactions">
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

export default SubAgentDashboard;