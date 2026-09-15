import React, { useState, useEffect } from 'react';
import {
  Card, Row, Col, Statistic, Progress, Tag, Button,
  Table, Alert, Timeline, Space, Tooltip, Badge
} from 'antd';
import {
  HeartOutlined, CheckCircleOutlined, CloseCircleOutlined,
  WarningOutlined, SyncOutlined, DashboardOutlined,
  RocketOutlined, ClockCircleOutlined
} from '@ant-design/icons';
import { healthAPI } from '../../services/api';
import { formatDate } from '../../utils/helpers';

const HealthMonitoring = () => {
  const [providerHealth, setProviderHealth] = useState([]);
  const [systemHealth, setSystemHealth] = useState({});
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    loadHealthData();
    // Set up periodic health checks
    const interval = setInterval(loadHealthData, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadHealthData = async () => {
    setLoading(true);
    try {
      const [providerRes, systemRes] = await Promise.all([
        healthAPI.getProviderHealth(),
        healthAPI.getSystemHealth()
      ]);
      setProviderHealth(providerRes.data.providers);
      setSystemHealth(systemRes.data);
    } catch (error) {
      console.error('Failed to load health data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleManualCheck = async () => {
    setChecking(true);
    try {
      await healthAPI.manualHealthCheck();
      message.success('Health check completed successfully');
      loadHealthData();
    } catch (error) {
      message.error('Health check failed');
    } finally {
      setChecking(false);
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
      case 'maintenance': return <ClockCircleOutlined />;
      default: return <SyncOutlined spin />;
    }
  };

  const SystemOverview = () => {
    const healthyProviders = providerHealth.filter(p => p.status === 'healthy').length;
    const totalProviders = providerHealth.length;
    const healthPercentage = totalProviders > 0 ? (healthyProviders / totalProviders) * 100 : 0;

    return (
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="System Status"
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
              title="Provider Health"
              value={healthPercentage}
              suffix="%"
              valueStyle={{
                color: healthPercentage > 80 ? '#3f8600' :
                       healthPercentage > 60 ? '#faad14' : '#cf1322'
              }}
              prefix={<HeartOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Response Time"
              value={systemHealth.avgResponseTime || 0}
              suffix="ms"
              valueStyle={{
                color: (systemHealth.avgResponseTime || 0) < 100 ? '#3f8600' :
                       (systemHealth.avgResponseTime || 0) < 500 ? '#faad14' : '#cf1322'
              }}
              prefix={<RocketOutlined />}
            />
          </Card>
        </Col>
      </Row>
    );
  };

  const ProviderHealthCard = ({ provider }) => (
    <Card
      size="small"
      className="mb-4"
      title={
        <div className="flex items-center justify-between">
          <span>{provider.name}</span>
          <Tag 
            color={getStatusColor(provider.status)} 
            icon={getStatusIcon(provider.status)}
          >
            {provider.status.toUpperCase()}
          </Tag>
        </div>
      }
      extra={
        <Tooltip title="Last checked">
          <span className="text-xs text-gray-500">
            {formatDate(provider.lastChecked)}
          </span>
        </Tooltip>
      }
    >
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm">Uptime:</span>
          <Progress 
            percent={provider.uptime} 
            size="small" 
            style={{ width: 100 }}
            status={
              provider.uptime > 95 ? 'success' :
              provider.uptime > 80 ? 'normal' : 'exception'
            }
          />
        </div>
        
        <div className="flex justify-between text-sm">
          <span>Response Time:</span>
          <span className={
            provider.responseTime < 100 ? 'text-green-600' :
            provider.responseTime < 500 ? 'text-orange-600' : 'text-red-600'
          }>
            {provider.responseTime}ms
          </span>
        </div>

        <div className="flex justify-between text-sm">
          <span>Success Rate:</span>
          <span>{provider.successRate}%</span>
        </div>

        {provider.incidents && provider.incidents.length > 0 && (
          <div className="mt-2">
            <div className="text-xs font-medium text-red-600 mb-1">
              Active Incidents: {provider.incidents.length}
            </div>
            {provider.incidents.slice(0, 2).map(incident => (
              <div key={incident.id} className="text-xs text-gray-600">
                • {incident.description}
              </div>
            ))}
          </div>
        )}

        {provider.maintenance && (
          <Alert
            message="Maintenance Mode"
            description={provider.maintenance.reason}
            type="info"
            showIcon
            size="small"
          />
        )}
      </div>
    </Card>
  );

  const IncidentTimeline = () => {
    const allIncidents = providerHealth.flatMap(provider => 
      (provider.incidents || []).map(incident => ({
        ...incident,
        provider: provider.name
      }))
    ).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return (
      <Card title="Recent Incidents" size="small">
        {allIncidents.length === 0 ? (
          <div className="text-center text-gray-500 py-4">
            <CheckCircleOutlined className="text-2xl text-green-500 mb-2" />
            <div>No active incidents</div>
          </div>
        ) : (
          <Timeline>
            {allIncidents.slice(0, 10).map(incident => (
              <Timeline.Item
                key={incident.id}
                color={
                  incident.severity === 'critical' ? 'red' :
                  incident.severity === 'high' ? 'orange' : 'yellow'
                }
              >
                <div className="text-sm">
                  <div className="font-medium">{incident.provider}</div>
                  <div>{incident.description}</div>
                  <div className="text-gray-500 text-xs">
                    {formatDate(incident.timestamp)}
                  </div>
                </div>
              </Timeline.Item>
            ))}
          </Timeline>
        )}
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">System Health Monitoring</h1>
          <p className="text-gray-600">Real-time monitoring of providers and system components</p>
        </div>
        <Button
          type="primary"
          icon={<SyncOutlined />}
          loading={checking}
          onClick={handleManualCheck}
        >
          Run Health Check
        </Button>
      </div>

      <SystemOverview />

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card 
            title="Provider Health Status"
            loading={loading}
            extra={
              <Badge 
                count={providerHealth.filter(p => p.status !== 'healthy').length}
                showZero 
                style={{ backgroundColor: '#faad14' }}
              >
                <Tag>ISSUES</Tag>
              </Badge>
            }
          >
            <Row gutter={[16, 16]}>
              {providerHealth.map(provider => (
                <Col xs={24} sm={12} lg={8} key={provider.name}>
                  <ProviderHealthCard provider={provider} />
                </Col>
              ))}
            </Row>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <div className="space-y-6">
            <IncidentTimeline />
            
            {/* System Metrics */}
            <Card title="System Metrics" size="small">
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>CPU Usage</span>
                    <span>{systemHealth.cpuUsage || 0}%</span>
                  </div>
                  <Progress 
                    percent={systemHealth.cpuUsage || 0}
                    status={
                      (systemHealth.cpuUsage || 0) > 80 ? 'exception' :
                      (systemHealth.cpuUsage || 0) > 60 ? 'normal' : 'success'
                    }
                  />
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Memory Usage</span>
                    <span>{systemHealth.memoryUsage || 0}%</span>
                  </div>
                  <Progress 
                    percent={systemHealth.memoryUsage || 0}
                    status={
                      (systemHealth.memoryUsage || 0) > 85 ? 'exception' :
                      (systemHealth.memoryUsage || 0) > 70 ? 'normal' : 'success'
                    }
                  />
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Disk Usage</span>
                    <span>{systemHealth.diskUsage || 0}%</span>
                  </div>
                  <Progress 
                    percent={systemHealth.diskUsage || 0}
                    status={
                      (systemHealth.diskUsage || 0) > 90 ? 'exception' :
                      (systemHealth.diskUsage || 0) > 80 ? 'normal' : 'success'
                    }
                  />
                </div>
              </div>
            </Card>
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default HealthMonitoring;