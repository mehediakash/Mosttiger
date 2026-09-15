import React, { useState, useEffect } from 'react';
import {
  Card, Table, Tag, Button, DatePicker, Select, Input,
  Row, Col, Statistic, Space, Tooltip, Badge, Descriptions,
  Modal, Timeline, Alert
} from 'antd';
import {
  SecurityScanOutlined, WarningOutlined, CheckCircleOutlined,
  CloseCircleOutlined, EyeOutlined, SearchOutlined,
  UserOutlined, GlobalOutlined, ClockCircleOutlined
} from '@ant-design/icons';
import { logsAPI } from '../../services/api';
import { formatDate, formatCurrency } from '../../utils/helpers';

const { RangePicker } = DatePicker;
const { Option } = Select;
const { TextArea } = Input;

const LoginLogs = () => {
  const [loginLogs, setLoginLogs] = useState([]);
  const [suspiciousLogs, setSuspiciousLogs] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [selectedLog, setSelectedLog] = useState(null);
  const [detailModal, setDetailModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [filters, setFilters] = useState({});

  useEffect(() => {
    loadLogs();
  }, [activeTab, filters]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      if (activeTab === 'suspicious') {
        const response = await logsAPI.getSuspiciousLogins();
        setSuspiciousLogs(response.data.logs);
      } else if (activeTab === 'activity') {
        const response = await logsAPI.getUserActivityLogs(filters);
        setActivityLogs(response.data.logs);
      } else {
        const response = await logsAPI.getLoginLogs(filters);
        setLoginLogs(response.data.logs);
      }
    } catch (error) {
      message.error('Failed to load logs');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (log) => {
    setSelectedLog(log);
    setDetailModal(true);
  };

  const SecurityOverview = () => {
    const totalLogins = loginLogs.length;
    const failedLogins = loginLogs.filter(log => log.status === 'failed').length;
    const suspiciousCount = suspiciousLogs.length;
    const successRate = totalLogins > 0 ? ((totalLogins - failedLogins) / totalLogins * 100).toFixed(1) : 0;

    return (
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={6}>
          <Card size="small">
            <Statistic
              title="Total Logins"
              value={totalLogins}
              valueStyle={{ color: '#1890ff' }}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card size="small">
            <Statistic
              title="Failed Logins"
              value={failedLogins}
              valueStyle={{ color: '#cf1322' }}
              prefix={<CloseCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card size="small">
            <Statistic
              title="Suspicious Activity"
              value={suspiciousCount}
              valueStyle={{ color: '#faad14' }}
              prefix={<WarningOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card size="small">
            <Statistic
              title="Success Rate"
              value={successRate}
              suffix="%"
              valueStyle={{ color: successRate > 90 ? '#3f8600' : '#faad14' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>
    );
  };

  const loginColumns = [
    {
      title: 'User',
      dataIndex: 'user',
      key: 'user',
      render: (user) => (
        <div className="flex items-center space-x-2">
          <UserOutlined className="text-blue-500" />
          <div>
            <div className="font-medium">{user?.fullName || 'Unknown'}</div>
            <div className="text-xs text-gray-500">{user?.email}</div>
          </div>
        </div>
      ),
    },
    {
      title: 'IP Address',
      dataIndex: 'ipAddress',
      key: 'ipAddress',
      render: (ip) => <span className="font-mono">{ip}</span>,
    },
    {
      title: 'Location',
      dataIndex: 'location',
      key: 'location',
      render: (location) => location || 'Unknown',
    },
    {
      title: 'Device',
      dataIndex: 'userAgent',
      key: 'userAgent',
      render: (agent) => (
        <Tooltip title={agent}>
          <span className="truncate max-w-xs inline-block">
            {agent?.split(' ')[0] || 'Unknown'}
          </span>
        </Tooltip>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag 
          color={status === 'success' ? 'green' : 'red'}
          icon={status === 'success' ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
        >
          {status.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Time',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => formatDate(date),
      sorter: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => handleViewDetails(record)}
        >
          Details
        </Button>
      ),
    },
  ];

  const suspiciousColumns = [
    {
      title: 'Risk Level',
      dataIndex: 'riskLevel',
      key: 'riskLevel',
      render: (level) => {
        const colors = {
          high: 'red',
          medium: 'orange',
          low: 'yellow'
        };
        return (
          <Tag color={colors[level]}>
            {level.toUpperCase()}
          </Tag>
        );
      },
    },
    {
      title: 'User',
      dataIndex: 'user',
      key: 'user',
      render: (user) => user?.fullName || 'Unknown',
    },
    {
      title: 'IP Address',
      dataIndex: 'ipAddress',
      key: 'ipAddress',
      render: (ip) => <span className="font-mono">{ip}</span>,
    },
    {
      title: 'Reason',
      dataIndex: 'reason',
      key: 'reason',
      render: (reason) => (
        <Tooltip title={reason}>
          <span className="max-w-xs truncate inline-block">
            {reason}
          </span>
        </Tooltip>
      ),
    },
    {
      title: 'Detected',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => formatDate(date),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            size="small"
            onClick={() => handleViewDetails(record)}
          >
            Investigate
          </Button>
        </Space>
      ),
    },
  ];

  const activityColumns = [
    {
      title: 'User',
      dataIndex: 'user',
      key: 'user',
      render: (user) => user?.fullName || 'System',
    },
    {
      title: 'Activity',
      dataIndex: 'activity',
      key: 'activity',
      render: (activity) => (
        <Tag color="blue">{activity}</Tag>
      ),
    },
    {
      title: 'Details',
      dataIndex: 'details',
      key: 'details',
      render: (details) => (
        <Tooltip title={details}>
          <span className="max-w-xs truncate inline-block">
            {details}
          </span>
        </Tooltip>
      ),
    },
    {
      title: 'IP Address',
      dataIndex: 'ipAddress',
      key: 'ipAddress',
    },
    {
      title: 'Timestamp',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => formatDate(date),
    },
  ];

  const LogDetailModal = () => (
    <Modal
      title="Login Attempt Details"
      open={detailModal}
      onCancel={() => setDetailModal(false)}
      footer={[
        <Button key="close" onClick={() => setDetailModal(false)}>
          Close
        </Button>,
      ]}
      width={700}
    >
      {selectedLog && (
        <div className="space-y-4">
          <Descriptions bordered column={2}>
            <Descriptions.Item label="User" span={2}>
              {selectedLog.user?.fullName} ({selectedLog.user?.email})
            </Descriptions.Item>
            <Descriptions.Item label="IP Address">
              <span className="font-mono">{selectedLog.ipAddress}</span>
            </Descriptions.Item>
            <Descriptions.Item label="Location">
              {selectedLog.location || 'Unknown'}
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={selectedLog.status === 'success' ? 'green' : 'red'}>
                {selectedLog.status.toUpperCase()}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Timestamp">
              {formatDate(selectedLog.createdAt)}
            </Descriptions.Item>
            <Descriptions.Item label="User Agent" span={2}>
              <code className="text-xs">{selectedLog.userAgent}</code>
            </Descriptions.Item>
          </Descriptions>

          {selectedLog.reason && (
            <Alert
              message="Suspicious Activity Detected"
              description={selectedLog.reason}
              type="warning"
              showIcon
            />
          )}

          {selectedLog.additionalData && (
            <Card title="Additional Data" size="small">
              <pre className="text-xs bg-gray-100 p-2 rounded">
                {JSON.stringify(selectedLog.additionalData, null, 2)}
              </pre>
            </Card>
          )}
        </div>
      )}
    </Modal>
  );

  const tabs = [
    {
      key: 'all',
      label: 'All Login Logs',
      content: (
        <Table
          columns={loginColumns}
          dataSource={loginLogs}
          loading={loading}
          scroll={{ x: 800 }}
          pagination={{ pageSize: 20 }}
        />
      ),
    },
    {
      key: 'suspicious',
      label: (
        <span>
          Suspicious Activity
          {suspiciousLogs.length > 0 && (
            <Badge count={suspiciousLogs.length} style={{ marginLeft: 8 }} />
          )}
        </span>
      ),
      content: (
        <Table
          columns={suspiciousColumns}
          dataSource={suspiciousLogs}
          loading={loading}
          scroll={{ x: 800 }}
        />
      ),
    },
    {
      key: 'activity',
      label: 'User Activity Logs',
      content: (
        <Table
          columns={activityColumns}
          dataSource={activityLogs}
          loading={loading}
          scroll={{ x: 800 }}
          pagination={{ pageSize: 20 }}
        />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <SecurityOverview />

      <Card>
        <div className="mb-4 flex flex-wrap gap-4">
          <Input
            placeholder="Search by user or IP..."
            prefix={<SearchOutlined />}
            style={{ width: 250 }}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
          />
          <Select
            placeholder="Filter by status"
            style={{ width: 150 }}
            allowClear
            onChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
          >
            <Option value="success">Success</Option>
            <Option value="failed">Failed</Option>
          </Select>
          <RangePicker
            onChange={(dates) => setFilters(prev => ({ 
              ...prev, 
              startDate: dates?.[0]?.format('YYYY-MM-DD'),
              endDate: dates?.[1]?.format('YYYY-MM-DD')
            }))}
          />
          <Button onClick={loadLogs}>
            Refresh
          </Button>
        </div>

        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabs.map(tab => ({
            key: tab.key,
            label: tab.label,
            children: tab.content,
          }))}
        />
      </Card>

      <LogDetailModal />
    </div>
  );
};

export default LoginLogs;