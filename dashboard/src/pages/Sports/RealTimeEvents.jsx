import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Row, Col, Tag, Statistic, Button, Badge,
  List, Avatar, Space, Typography, Divider, Alert
} from 'antd';
import {
   FireOutlined,
  TeamOutlined, EyeOutlined
} from '@ant-design/icons';
import { realtimeAPI } from '../../services/api';
import { formatDate } from '../../utils/helpers';

const { Title, Text } = Typography;

const RealTimeEvents = () => {
  const [sports, setSports] = useState([]);
  const [liveEvents, setLiveEvents] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState({
    connected: false,
    lastUpdate: null,
    latency: 0
  });
  const [selectedSport, setSelectedSport] = useState('soccer');
  const [loading, setLoading] = useState(false);

  const loadInitialData = useCallback(async () => {
    try {
      const [sportsRes, statusRes] = await Promise.all([
        realtimeAPI.getSports(),
        realtimeAPI.getConnectionStatus()
      ]);
      setSports(sportsRes.data.sports);
      setConnectionStatus(statusRes.data);
    } catch (error) {
      console.error('Failed to load initial data:', error);
    }
  }, []);

  const loadLiveEvents = useCallback(async (sportKey) => {
    setLoading(true);
    try {
      const response = await realtimeAPI.getLiveEvents(sportKey);
      setLiveEvents(response.data.events);
    } catch (error) {
      console.error('Failed to load live events:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    if (selectedSport) {
      loadLiveEvents(selectedSport);
    }
  }, [selectedSport, loadLiveEvents]);

  const startConnectionMonitoring = () => {
    // Simulate real-time updates
    const interval = setInterval(async () => {
      try {
        const response = await realtimeAPI.getConnectionStatus();
        setConnectionStatus(response.data);
      } catch (error) {
        setConnectionStatus(prev => ({
          ...prev,
          connected: false,
          lastUpdate: new Date().toISOString()
        }));
      }
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  };

  const ConnectionStatus = () => (
    <Card size="small">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {connectionStatus.connected ? (
            <Badge status="success" />
          ) : (
            <Badge status="error" />
          )}
          <Text strong>
            {connectionStatus.connected ? 'Connected' : 'Disconnected'}
          </Text>
        </div>
        <div className="text-right">
          <Text type="secondary" className="text-xs">
            Latency: {connectionStatus.latency}ms
          </Text>
          <br />
          <Text type="secondary" className="text-xs">
            Last update: {connectionStatus.lastUpdate ? 
              formatDate(connectionStatus.lastUpdate) : 'Never'
            }
          </Text>
        </div>
      </div>
    </Card>
  );

  const SportCard = ({ sport }) => (
    <Card
      size="small"
      hoverable
      className={`text-center cursor-pointer ${
        selectedSport === sport.key ? 'border-blue-500 border-2' : ''
      }`}
      onClick={() => setSelectedSport(sport.key)}
    >
      <Avatar 
        size={48} 
        src={sport.icon} 
        className="mb-2"
      >
        {sport.name.charAt(0)}
      </Avatar>
      <div className="font-medium">{sport.name}</div>
      <div className="text-xs text-gray-500">
        {sport.eventCount} events
      </div>
    </Card>
  );

  const EventItem = ({ event }) => (
    <List.Item
      className="hover:bg-gray-50 p-3 rounded-lg cursor-pointer"
      actions={[
        <Button type="link" icon={<EyeOutlined />}>View Odds</Button>
      ]}
    >
      <List.Item.Meta
        avatar={
          <Avatar 
            src={event.league?.logo}
            size="large"
          >
            {event.league?.name?.charAt(0)}
          </Avatar>
        }
        title={
          <div className="flex items-center justify-between">
            <div>
              <Text strong>{event.homeTeam} vs {event.awayTeam}</Text>
              <div className="text-xs text-gray-500">
                {event.league?.name} • {event.round}
              </div>
            </div>
            <div className="text-right">
              <Tag color="red" icon={<FireOutlined />}>
                LIVE
              </Tag>
              <div className="text-xs text-gray-500">
                {event.time}' 
                {event.score && ` • ${event.score}`}
              </div>
            </div>
          </div>
        }
        description={
          <div className="mt-2">
            <Space size="small">
              {event.markets?.map(market => (
                <Tag key={market.type} color="blue">
                  {market.type.toUpperCase()}
                </Tag>
              ))}
            </Space>
          </div>
        }
      />
    </List.Item>
  );

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <ConnectionStatus />

      <Row gutter={[16, 16]}>
        {/* Sports Selection */}
        <Col xs={24} lg={6}>
          <Card title="Sports" size="small">
            <div className="space-y-3">
              {sports.map(sport => (
                <SportCard key={sport.key} sport={sport} />
              ))}
            </div>
          </Card>
        </Col>

        {/* Live Events */}
        <Col xs={24} lg={18}>
          <Card 
            title={
              <div className="flex items-center justify-between">
                <span>
                  Live Events 
                  {liveEvents.length > 0 && (
                    <Tag color="red" className="ml-2">
                      {liveEvents.length} LIVE
                    </Tag>
                  )}
                </span>
                <Button 
                  size="small" 
                  onClick={() => loadLiveEvents(selectedSport)}
                  loading={loading}
                >
                  Refresh
                </Button>
              </div>
            }
          >
            {liveEvents.length === 0 ? (
              <div className="text-center py-8">
                <TeamOutlined className="text-4xl text-gray-300 mb-4" />
                <Text type="secondary">No live events at the moment</Text>
              </div>
            ) : (
              <List
                dataSource={liveEvents}
                renderItem={event => <EventItem event={event} />}
                loading={loading}
              />
            )}
          </Card>
        </Col>
      </Row>

      {/* Quick Stats */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <Card size="small">
            <Statistic
              title="Total Live Events"
              value={liveEvents.length}
              prefix={<FireOutlined />}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small">
            <Statistic
              title="Active Sports"
              value={sports.filter(s => s.eventCount > 0).length}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small">
            <Statistic
              title="Connection Latency"
              value={connectionStatus.latency}
              suffix="ms"
              valueStyle={{
                color: connectionStatus.latency < 100 ? '#3f8600' : 
                       connectionStatus.latency < 500 ? '#faad14' : '#cf1322'
              }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default RealTimeEvents;