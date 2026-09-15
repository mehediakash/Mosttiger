import React, { useState, useEffect } from 'react';
import { Card, Table, Tag, DatePicker, Button, Row, Col, Statistic, message, Select } from 'antd';
import { DownloadOutlined, FilterOutlined } from '@ant-design/icons';
import { reportAPI } from '../../services/api';
import { formatCurrency, formatDate } from '../../utils/helpers';

const { RangePicker } = DatePicker;
const { Option } = Select;

const CommissionReports = () => {
  const [commissionData, setCommissionData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({});

  useEffect(() => {
    loadCommissionReports();
  }, [filters]);

  const loadCommissionReports = async () => {
    setLoading(true);
    try {
      const response = await reportAPI.getCommissionReport(filters);
      setCommissionData(response.data.data.commissions || []);
    } catch (error) {
      message.error('Failed to load commission reports');
      console.error('Commission reports error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleDateRangeChange = (dates) => {
    if (dates) {
      setFilters(prev => ({
        ...prev,
        startDate: dates[0].format('YYYY-MM-DD'),
        endDate: dates[1].format('YYYY-MM-DD')
      }));
    } else {
      setFilters(prev => {
        const { startDate, endDate, ...rest } = prev;
        return rest;
      });
    }
  };

  const columns = [
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: (date) => formatDate(date),
    },
    {
      title: 'Agent Name',
      dataIndex: ['agentInfo', 'fullName'],
      key: 'agentName',
    },
    {
      title: 'Agent Email',
      dataIndex: ['agentInfo', 'email'],
      key: 'agentEmail',
    },
    {
      title: 'Agent Role',
      dataIndex: ['agentInfo', 'role'],
      key: 'agentRole',
      render: (role) => (
        <Tag color={role === 'master_agent' ? 'gold' : role === 'agent' ? 'blue' : 'green'}>
          {role?.replace('_', ' ').toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Commission Type',
      dataIndex: 'type',
      key: 'type',
      render: (type) => type?.replace('_', ' ').toUpperCase(),
    },
    {
      title: 'Total Amount',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      render: (amount) => formatCurrency(amount || 0),
    },
    {
      title: 'Transaction Count',
      dataIndex: 'transactionCount',
      key: 'transactionCount',
      render: (count) => count || 0,
    },
    {
      title: 'Unique Users',
      dataIndex: 'uniqueUsers',
      key: 'uniqueUsers',
      render: (users) => users?.length || 0,
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Commission Reports</h1>
        <p className="text-gray-600">Track and manage all commission transactions</p>
      </div>

      {/* Statistics Cards */}
      <Row gutter={16} className="mb-6">
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Commission"
              value={commissionData.reduce((sum, item) => sum + (item.totalAmount || 0), 0)}
              prefix="৳"
              valueStyle={{ color: '#3f8600' }}
              formatter={formatCurrency}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Transactions"
              value={commissionData.reduce((sum, item) => sum + (item.transactionCount || 0), 0)}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Unique Agents"
              value={new Set(commissionData.map(item => item.agent?._id)).size}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Records"
              value={commissionData.length}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card className="mb-6">
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <RangePicker onChange={handleDateRangeChange} />
          <Select
            placeholder="Filter by Agent"
            style={{ width: 200 }}
            allowClear
            onChange={(value) => handleFilterChange('agentId', value)}
          >
            {/* You can populate this with agent options */}
          </Select>
          <Select
            placeholder="Commission Type"
            style={{ width: 200 }}
            allowClear
            onChange={(value) => handleFilterChange('type', value)}
          >
            <Option value="loss_commission">Loss Commission</Option>
            <Option value="turnover_commission">Turnover Commission</Option>
            <Option value="profit_share">Profit Share</Option>
          </Select>
          <Button type="primary" icon={<FilterOutlined />} onClick={loadCommissionReports}>
            Apply Filters
          </Button>
          <Button icon={<DownloadOutlined />}>
            Export Report
          </Button>
        </div>
      </Card>

      {/* Commission Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={commissionData}
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
          }}
          scroll={{ x: 1000 }}
        />
      </Card>
    </div>
  );
};

export default CommissionReports;