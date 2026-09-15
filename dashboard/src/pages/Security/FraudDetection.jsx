import React, { useState, useEffect } from 'react';
import {
  Card, Table, Tag, Button, Modal, Form, Input, Select,
  Statistic, Row, Col, Space, Tooltip, Progress, Alert,
  Timeline, Badge, Descriptions
} from 'antd';
import {
  SecurityScanOutlined, WarningOutlined, CheckCircleOutlined,
  ClockCircleOutlined, EyeOutlined, UserOutlined,
  GlobalOutlined, ExclamationCircleOutlined
} from '@ant-design/icons';
import { fraudAPI } from '../../services/api';
import { formatDate, formatCurrency } from '../../utils/helpers';

const { Option } = Select;
const { TextArea } = Input;

const FraudDetection = () => {
  const [alerts, setAlerts] = useState([]);
  const [suspiciousLogins, setSuspiciousLogins] = useState([]);
  const [providerHealth, setProviderHealth] = useState([]);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [resolveModalVisible, setResolveModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [alertsRes, loginsRes, healthRes] = await Promise.all([
        fraudAPI.getFraudAlerts(),
        fraudAPI.getSuspiciousLogins(),
        fraudAPI.getProviderHealth()
      ]);
      setAlerts(alertsRes.data.alerts);
      setSuspiciousLogins(loginsRes.data.logins);
      setProviderHealth(healthRes.data.providers);
    } catch (error) {
      console.error('Failed to load fraud data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResolveAlert = async (values) => {
    try {
      await fraudAPI.resolveAlert(selectedAlert._id, values);
      message.success('Alert resolved successfully');
      setResolveModalVisible(false);
      setSelectedAlert(null);
      loadData();
    } catch (error) {
      message.error('Failed to resolve alert');
    }
  };

  const handleManualHealthCheck = async () => {
    try {
      await fraudAPI.manualHealthCheck();
      message.success('Health check completed');
      loadData();
    } catch (error) {
      message.error('Health check failed');
    }
  };

  const alertColumns = [
    {
      title: 'Alert ID',
      dataIndex: 'alertId',
      key: 'alertId',
      render: (id) => <span className="font-mono">{id}</span>,
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type) => {
        const typeConfig = {
          multiple_accounts: { color: 'red', text: 'Multiple Accounts' },
          suspicious_activity: { color: 'orange', text: 'Suspicious Activity' },
          chargeback: { color: 'volcano', text: 'Chargeback' },
          bonus_abuse: { color: 'purple', text: 'Bonus Abuse' },
          money_laundering: { color: 'magenta', text: 'Money Laundering' },
        };
        const config = typeConfig[type] || { color: 'default', text: type };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: 'Severity',
      dataIndex: 'severity',
      key: 'severity',
      render: (severity) => {
        const color = {
          high: 'red',
          medium: 'orange',
          low: 'yellow'
        }[severity] || 'default';
        return <Tag color={color}>{severity.toUpperCase()}</Tag>;
      },
    },
    {
      title: 'User',
      dataIndex: 'user',
      key: 'user',
      render: (user) => user?.fullName || 'N/A',
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount) => amount ? formatCurrency(amount) : 'N/A',
    },
    {
      title: 'Detected',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => formatDate(date),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={status === 'resolved' ? 'green' : status === 'investigating' ? 'blue' : 'red'}>
          {status.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="View Details">
            <Button 
              type="text" 
              icon={<EyeOutlined />} 
              size="small"
              onClick={() => setSelectedAlert(record)}
            />
          </Tooltip>
          {record.status === 'open' && (
            <Tooltip title="Resolve Alert">
              <Button 
                type="text" 
                icon={<CheckCircleOutlined />} 
                size="small"
                onClick={() => {
                  setSelectedAlert(record);
                  setResolveModalVisible(true);
                }}
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  const SecurityOverview = () => {
    const highPriorityAlerts = alerts.filter(a => a.severity === 'high' && a.status === 'open').length;
    const totalOpenAlerts = alerts.filter(a => a.status === 'open').length;
    const healthyProviders = providerHealth.filter(p => p.status === 'healthy').length;

    return (
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <Card size="small">
            <Statistic
              title="High Priority Alerts"
              value={highPriorityAlerts}
              valueStyle={{ color: highPriorityAlerts > 0 ? '#cf1322' : '#3f8600' }}
              prefix={<ExclamationCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small">
            <Statistic
              title="Total Open Alerts"
              value={totalOpenAlerts}
              valueStyle={{ color: totalOpenAlerts > 5 ? '#faad14' : '#3f8600' }}
              prefix={<WarningOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small">
            <Statistic
              title="Healthy Providers"
              value={healthyProviders}
              suffix={`/ ${providerHealth.length}`}
              valueStyle={{ color: healthyProviders === providerHealth.length ? '#3f8600' : '#faad14' }}
              prefix={<GlobalOutlined />}
            />
          </Card>
        </Col>
      </Row>
    );
  };

  return (
    <div className="space-y-6">
      <SecurityOverview />

      <Row gutter={[16, 16]}>
        {/* Fraud Alerts */}
        <Col xs={24} lg={16}>
          <Card 
            title={
              <div className="flex items-center justify-between">
                <span>Fraud Alerts</span>
                <Badge count={alerts.filter(a => a.status === 'open').length} showZero>
                  <Tag color="red">ALERTS</Tag>
                </Badge>
              </div>
            }
            loading={loading}
          >
            <Table
              columns={alertColumns}
              dataSource={alerts}
              pagination={{ pageSize: 10 }}
              scroll={{ x: 800 }}
              rowKey="_id"
            />
          </Card>
        </Col>

        {/* Sidebar */}
        <Col xs={24} lg={8}>
          <div className="space-y-6">
            {/* Provider Health */}
            <Card title="Provider Health Status" size="small">
              <div className="space-y-3">
                {providerHealth.map(provider => (
                  <div key={provider.name} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Badge 
                        status={provider.status === 'healthy' ? 'success' : 'error'} 
                      />
                      <span>{provider.name}</span>
                    </div>
                    <Progress 
                      percent={provider.uptime} 
                      size="small" 
                      style={{ width: 80 }}
                      status={provider.status === 'healthy' ? 'normal' : 'exception'}
                    />
                  </div>
                ))}
              </div>
              <Button 
                type="dashed" 
                className="w-full mt-3"
                onClick={handleManualHealthCheck}
              >
                Run Health Check
              </Button>
            </Card>

            {/* Suspicious Logins */}
            <Card title="Recent Suspicious Logins" size="small">
              <Timeline>
                {suspiciousLogins.slice(0, 5).map(login => (
                  <Timeline.Item
                    key={login._id}
                    color={login.riskLevel === 'high' ? 'red' : 'orange'}
                    dot={<UserOutlined />}
                  >
                    <div className="text-xs">
                      <div className="font-medium">{login.user?.fullName}</div>
                      <div>{login.ipAddress} • {login.location}</div>
                      <div className="text-gray-500">{formatDate(login.createdAt)}</div>
                    </div>
                  </Timeline.Item>
                ))}
              </Timeline>
            </Card>
          </div>
        </Col>
      </Row>

      {/* Alert Detail Modal */}
      <Modal
        title="Fraud Alert Details"
        open={!!selectedAlert}
        onCancel={() => setSelectedAlert(null)}
        footer={[
          <Button key="close" onClick={() => setSelectedAlert(null)}>
            Close
          </Button>,
          selectedAlert?.status === 'open' && (
            <Button 
              key="resolve"
              type="primary"
              onClick={() => setResolveModalVisible(true)}
            >
              Resolve Alert
            </Button>
          ),
        ]}
        width={700}
      >
        {selectedAlert && (
          <Descriptions column={2} bordered>
            <Descriptions.Item label="Alert ID">{selectedAlert.alertId}</Descriptions.Item>
            <Descriptions.Item label="Type">
              <Tag color="red">{selectedAlert.type}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Severity">
              <Tag color={
                selectedAlert.severity === 'high' ? 'red' :
                selectedAlert.severity === 'medium' ? 'orange' : 'yellow'
              }>
                {selectedAlert.severity.toUpperCase()}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={selectedAlert.status === 'open' ? 'red' : 'green'}>
                {selectedAlert.status.toUpperCase()}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="User">{selectedAlert.user?.fullName}</Descriptions.Item>
            <Descriptions.Item label="Amount">
              {selectedAlert.amount ? formatCurrency(selectedAlert.amount) : 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item label="Detected" span={2}>
              {formatDate(selectedAlert.createdAt)}
            </Descriptions.Item>
            <Descriptions.Item label="Description" span={2}>
              {selectedAlert.description}
            </Descriptions.Item>
            {selectedAlert.evidence && (
              <Descriptions.Item label="Evidence" span={2}>
                <pre className="bg-gray-100 p-2 rounded text-xs">
                  {JSON.stringify(selectedAlert.evidence, null, 2)}
                </pre>
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>

      {/* Resolve Alert Modal */}
      <Modal
        title="Resolve Fraud Alert"
        open={resolveModalVisible}
        onCancel={() => {
          setResolveModalVisible(false);
          setSelectedAlert(null);
        }}
        footer={null}
        width={500}
      >
        <Form
          layout="vertical"
          onFinish={handleResolveAlert}
        >
          <Form.Item
            name="resolution"
            label="Resolution"
            rules={[{ required: true, message: 'Please select resolution' }]}
          >
            <Select placeholder="Select resolution">
              <Option value="false_positive">False Positive</Option>
              <Option value="user_verified">User Verified</Option>
              <Option value="action_taken">Action Taken</Option>
              <Option value="system_error">System Error</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="resolutionNotes"
            label="Resolution Notes"
            rules={[{ required: true, message: 'Please enter resolution notes' }]}
          >
            <TextArea
              rows={4}
              placeholder="Enter detailed notes about how this alert was resolved"
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                Resolve Alert
              </Button>
              <Button onClick={() => setResolveModalVisible(false)}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default FraudDetection;