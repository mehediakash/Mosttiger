import React, { useState, useEffect } from 'react';
import {
  Card, Row, Col, Statistic, Progress, Alert, Timeline,
  Table, Tag, Space, Button, Badge, Descriptions, Divider
} from 'antd';
import {
  DashboardOutlined, ServerOutlined, DatabaseOutlined,
  CloudServerOutlined, CheckCircleOutlined, WarningOutlined,
  CloseCircleOutlined, SyncOutlined, RocketOutlined,
  DollarOutlined, UserOutlined, TransactionOutlined
} from '@ant-design/icons';
import { systemAPI } from '../../services/api';
import { formatCurrency, formatNumber, formatDate } from '../../utils/helpers';

const SystemHealth = () => {
  const [systemHealth, setSystemHealth] = useState({});
  const [platformSummary, setPlatformSummary] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSystemData();
    // Refresh every 30 seconds
    const interval = setInterval(loadSystemData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadSystemData = async () => {
    setLoading(true);
    try {
      const [healthRes, summaryRes] = await Promise.all([
        systemAPI.getSystemHealth(),
        systemAPI.getPlatformSummary()
      ]);
      setSystemHealth(healthRes.data);
      setPlatformSummary(summaryRes.data);
    } catch (error) {
      console.error('Failed to load system data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy': return 'green';
      case 'degraded': return 'orange';
      case 'unhealthy': return 'red';
      case 'maintenance': return 'blue';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy': return <CheckCircleOutlined />;
      case 'degraded': return <WarningOutlined />;
      case 'unhealthy': return <CloseCircleOutlined />;
      default: return <SyncOutlined spin />;
    }
  };

  const SystemOverview = () => {
    const { servers = [], services = [], database = {} } = systemHealth;
    
    const healthyServers = servers.filter(s => s.status === 'healthy').length;
    const healthyServices = services.filter(s => s.status === 'healthy').length;
    const totalServers = servers.length;
    const totalServices = services.length;

    return (
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Overall System Status"
              value={systemHealth.overallStatus || 'Unknown'}
              valueStyle={{ 
                color: systemHealth.overallStatus === 'healthy' ? '#3f8600' : 
                       systemHealth.overallStatus === 'degraded' ? '#faad14' : '#cf1322'
              }}
              prefix={<DashboardOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Server Health"
              value={healthyServers}
              suffix={`/ ${totalServers}`}
              valueStyle={{ 
                color: healthyServers === totalServers ? '#3f8600' :
                       healthyServers > totalServers / 2 ? '#faad14' : '#cf1322'
              }}
              prefix={<ServerOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Service Health"
              value={healthyServices}
              suffix={`/ ${totalServices}`}
              valueStyle={{ 
                color: healthyServices === totalServices ? '#3f8600' :
                       healthyServices > totalServices / 2 ? '#faad14' : '#cf1322'
              }}
              prefix={<CloudServerOutlined />}
            />
          </Card>
        </Col>
      </Row>
    );
  };

  const ServerHealth = () => (
    <Card title="Server Status" loading={loading}>
      <Row gutter={[16, 16]}>
        {systemHealth.servers?.map(server => (
          <Col xs={24} sm={12} lg={8} key={server.name}>
            <Card size="small">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <ServerOutlined />
                  <span className="font-medium">{server.name}</span>
                </div>
                <Tag 
                  color={getStatusColor(server.status)} 
                  icon={getStatusIcon(server.status)}
                >
                  {server.status.toUpperCase()}
                </Tag>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>CPU:</span>
                  <Progress 
                    percent={server.cpuUsage} 
                    size="small" 
                    style={{ width: 80 }}
                    status={server.cpuUsage > 80 ? 'exception' : 'normal'}
                  />
                </div>
                <div className="flex justify-between">
                  <span>Memory:</span>
                  <Progress 
                    percent={server.memoryUsage} 
                    size="small" 
                    style={{ width: 80 }}
                    status={server.memoryUsage > 85 ? 'exception' : 'normal'}
                  />
                </div>
                <div className="flex justify-between">
                  <span>Disk:</span>
                  <Progress 
                    percent={server.diskUsage} 
                    size="small" 
                    style={{ width: 80 }}
                    status={server.diskUsage > 90 ? 'exception' : 'normal'}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Uptime:</span>
                  <span>{server.uptime}</span>
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    </Card>
  );

  const ServiceStatus = () => (
    <Card title="Service Status" loading={loading}>
      <Table
        dataSource={systemHealth.services}
        pagination={false}
        size="small"
        columns={[
          {
            title: 'Service',
            dataIndex: 'name',
            key: 'name',
            render: (name, record) => (
              <div className="flex items-center space-x-2">
                <CloudServerOutlined />
                <span>{name}</span>
                {record.version && (
                  <Tag color="blue" size="small">v{record.version}</Tag>
                )}
              </div>
            ),
          },
          {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status) => (
              <Tag color={getStatusColor(status)}>
                {status.toUpperCase()}
              </Tag>
            ),
          },
          {
            title: 'Response Time',
            dataIndex: 'responseTime',
            key: 'responseTime',
            render: (time) => (
              <span className={
                time < 100 ? 'text-green-600' :
                time < 500 ? 'text-orange-600' : 'text-red-600'
              }>
                {time}ms
              </span>
            ),
          },
          {
            title: 'Uptime',
            dataIndex: 'uptime',
            key: 'uptime',
            render: (uptime) => `${uptime}%`,
          },
          {
            title: 'Last Check',
            dataIndex: 'lastChecked',
            key: 'lastChecked',
            render: (date) => formatDate(date),
          },
        ]}
      />
    </Card>
  );

  const DatabaseStatus = () => (
    <Card title="Database Status" loading={loading}>
      <Descriptions bordered column={2} size="small">
        <Descriptions.Item label="Status">
          <Tag color={getStatusColor(systemHealth.database?.status)}>
            {systemHealth.database?.status?.toUpperCase() || 'UNKNOWN'}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Version">
          {systemHealth.database?.version || 'N/A'}
        </Descriptions.Item>
        <Descriptions.Item label="Connections">
          {systemHealth.database?.activeConnections || 0} / {systemHealth.database?.maxConnections || 0}
        </Descriptions.Item>
        <Descriptions.Item label="Query Time">
          {systemHealth.database?.avgQueryTime || 0}ms
        </Descriptions.Item>
        <Descriptions.Item label="Size" span={2}>
          {systemHealth.database?.size || 'N/A'}
        </Descriptions.Item>
      </Descriptions>
    </Card>
  );

  const PlatformMetrics = () => (
    <Card title="Platform Metrics" loading={loading}>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <Card size="small">
            <Statistic
              title="Active Users"
              value={platformSummary.activeUsers || 0}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small">
            <Statistic
              title="Today's Revenue"
              value={platformSummary.todayRevenue || 0}
              prefix={<DollarOutlined />}
              valueStyle={{ color: '#3f8600' }}
              formatter={value => formatCurrency(value)}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small">
            <Statistic
              title="Pending Transactions"
              value={platformSummary.pendingTransactions || 0}
              prefix={<TransactionOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      <Divider />

      <Row gutter={[16, 16]}>
        <Col span={12}>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {platformSummary.successRate || 0}%
            </div>
            <div className="text-gray-600">API Success Rate</div>
          </div>
        </Col>
        <Col span={12}>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {platformSummary.avgResponseTime || 0}ms
            </div>
            <div className="text-gray-600">Avg Response Time</div>
          </div>
        </Col>
      </Row>
    </Card>
  );

  const SystemAlerts = () => {
    const alerts = systemHealth.alerts || [];
    
    if (alerts.length === 0) {
      return (
        <Alert
          message="No Active Alerts"
          description="All systems are operating normally."
          type="success"
          showIcon
        />
      );
    }

    return (
      <Card title="Active Alerts" loading={loading}>
        <Timeline>
          {alerts.map(alert => (
            <Timeline.Item
              key={alert.id}
              color={
                alert.severity === 'critical' ? 'red' :
                alert.severity === 'high' ? 'orange' : 'yellow'
              }
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium">{alert.title}</div>
                  <div className="text-gray-600">{alert.description}</div>
                  <div className="text-xs text-gray-500">
                    {formatDate(alert.timestamp)}
                  </div>
                </div>
                <Tag color={
                  alert.severity === 'critical' ? 'red' :
                  alert.severity === 'high' ? 'orange' : 'yellow'
                }>
                  {alert.severity.toUpperCase()}
                </Tag>
              </div>
            </Timeline.Item>
          ))}
        </Timeline>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">System Health Dashboard</h1>
          <p className="text-gray-600">Real-time monitoring of platform infrastructure and services</p>
        </div>
        <Button
          icon={<SyncOutlined />}
          onClick={loadSystemData}
          loading={loading}
        >
          Refresh
        </Button>
      </div>

      <SystemOverview />

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <div className="space-y-6">
            <ServerHealth />
            <ServiceStatus />
          </div>
        </Col>
        <Col xs={24} lg={8}>
          <div className="space-y-6">
            <DatabaseStatus />
            <PlatformMetrics />
            <SystemAlerts />
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default SystemHealth;