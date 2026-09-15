import React, { useState, useEffect } from 'react';
import {
  Card, Form, Switch, InputNumber, Button, message,
  Table, Tag, Space, Statistic, Row, Col, Divider,
  Alert, Select, Tabs
} from 'antd';
import {
  CheckCircleOutlined, SettingOutlined, RocketOutlined,
  DollarOutlined, PercentageOutlined, PlayCircleOutlined
} from '@ant-design/icons';
import { autoApprovalAPI } from '../../services/api';
import { formatCurrency } from '../../utils/helpers';

const { Option } = Select;
const { TabPane } = Tabs;

const AutoApprovalSettings = () => {
  const [gateways, setGateways] = useState([]);
  const [promoRules, setPromoRules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [gatewaysRes, rulesRes] = await Promise.all([
        autoApprovalAPI.getGateways(),
        autoApprovalAPI.getAutoPromoRules()
      ]);
      setGateways(gatewaysRes.data.gateways);
      setPromoRules(rulesRes.data.rules);
    } catch (error) {
      message.error('Failed to load auto-approval settings');
    }
  };

  const handleUpdateGateway = async (gatewayId, values) => {
    try {
      await autoApprovalAPI.updateGatewaySettings(gatewayId, values);
      message.success('Gateway settings updated successfully');
      loadData();
    } catch (error) {
      message.error('Failed to update gateway settings');
    }
  };

  const handleProcessAutoApproval = async () => {
    setProcessing(true);
    try {
      await autoApprovalAPI.processAutoApproval();
      message.success('Auto-approval processed successfully');
    } catch (error) {
      message.error('Failed to process auto-approval');
    } finally {
      setProcessing(false);
    }
  };

  const handleUpdatePromoRule = async (ruleId, values) => {
    try {
      await autoApprovalAPI.updateAutoPromoRule(ruleId, values);
      message.success('Promo rule updated successfully');
      loadData();
    } catch (error) {
      message.error('Failed to update promo rule');
    }
  };

  const AutoApprovalStats = () => (
    <Row gutter={[16, 16]}>
      <Col xs={24} sm={8}>
        <Card size="small">
          <Statistic
            title="Active Auto-approval Gateways"
            value={gateways.filter(g => g.autoApprove).length}
            valueStyle={{ color: '#3f8600' }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={8}>
        <Card size="small">
          <Statistic
            title="Total Processed Today"
            value={125}
            prefix={<DollarOutlined />}
            valueStyle={{ color: '#1890ff' }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={8}>
        <Card size="small">
          <Statistic
            title="Auto-apply Promo Rules"
            value={promoRules.filter(r => r.autoApply).length}
            valueStyle={{ color: '#722ed1' }}
          />
        </Card>
      </Col>
    </Row>
  );

  return (
    <div className="space-y-6">
      <AutoApprovalStats />

      <Card>
        <Tabs defaultActiveKey="deposit">
          <TabPane tab="Deposit Auto-approval" key="deposit">
            <DepositAutoApproval
              gateways={gateways}
              onUpdateGateway={handleUpdateGateway}
              onProcess={handleProcessAutoApproval}
              processing={processing}
            />
          </TabPane>

          <TabPane tab="Promo Auto-apply" key="promo">
            <PromoAutoApply
              rules={promoRules}
              onUpdateRule={handleUpdatePromoRule}
            />
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
};

// Deposit Auto-approval Component
const DepositAutoApproval = ({ gateways, onUpdateGateway, onProcess, processing }) => {
  return (
    <div className="space-y-6">
      <Alert
        message="Auto-approval Settings"
        description="Configure automatic approval rules for deposit gateways. When enabled, deposits meeting the criteria will be approved automatically."
        type="info"
        showIcon
      />

      <div className="flex justify-end mb-4">
        <Button
          type="primary"
          icon={<RocketOutlined />}
          loading={processing}
          onClick={onProcess}
        >
          Process Auto-approval Now
        </Button>
      </div>

      <Row gutter={[16, 16]}>
        {gateways.map(gateway => (
          <Col xs={24} lg={12} key={gateway._id}>
            <GatewaySettingsCard
              gateway={gateway}
              onUpdate={onUpdateGateway}
            />
          </Col>
        ))}
      </Row>
    </div>
  );
};

// Gateway Settings Card Component
const GatewaySettingsCard = ({ gateway, onUpdate }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      await onUpdate(gateway._id, values);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card
      title={
        <div className="flex items-center justify-between">
          <span>{gateway.name}</span>
          <Tag color={gateway.isActive ? 'green' : 'red'}>
            {gateway.isActive ? 'ACTIVE' : 'INACTIVE'}
          </Tag>
        </div>
      }
      className="h-full"
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          autoApprove: gateway.autoApprove || false,
          autoApproveLimit: gateway.autoApproveLimit || 5000,
          minDeposit: gateway.minDeposit || 100,
          maxDeposit: gateway.maxDeposit || 50000,
        }}
      >
        <Form.Item
          name="autoApprove"
          label="Auto-approval"
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>

        <Form.Item
          name="autoApproveLimit"
          label="Auto-approve Limit"
          rules={[{ required: true, message: 'Please enter limit' }]}
        >
          <InputNumber
            className="w-full"
            min={0}
            formatter={value => `৳ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            placeholder="Maximum amount for auto-approval"
          />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="minDeposit"
              label="Minimum Deposit"
            >
              <InputNumber
                className="w-full"
                min={0}
                formatter={value => `৳ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="maxDeposit"
              label="Maximum Deposit"
            >
              <InputNumber
                className="w-full"
                min={0}
                formatter={value => `৳ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item>
          <Button 
            type="primary" 
            htmlType="submit" 
            loading={loading}
            icon={<CheckCircleOutlined />}
            className="w-full"
          >
            Save Settings
          </Button>
        </Form.Item>
      </Form>

      <Divider />

      <div className="text-xs text-gray-500 space-y-1">
        <div>Today's Auto-approved: {gateway.todayApproved || 0}</div>
        <div>Success Rate: {gateway.successRate || '0'}%</div>
        <div>Last Processed: {gateway.lastProcessed || 'Never'}</div>
      </div>
    </Card>
  );
};

// Promo Auto-apply Component
const PromoAutoApply = ({ rules, onUpdateRule }) => {
  return (
    <div className="space-y-6">
      <Alert
        message="Promo Auto-apply Rules"
        description="Configure automatic promo code application rules. When enabled, eligible deposits will automatically receive promotional bonuses."
        type="info"
        showIcon
      />

      <Row gutter={[16, 16]}>
        {rules.map(rule => (
          <Col xs={24} key={rule._id}>
            <PromoRuleCard
              rule={rule}
              onUpdate={onUpdateRule}
            />
          </Col>
        ))}
      </Row>
    </div>
  );
};

// Promo Rule Card Component
const PromoRuleCard = ({ rule, onUpdate }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      await onUpdate(rule._id, values);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card
      title={
        <div className="flex items-center justify-between">
          <span>{rule.promoCode?.name || 'Unknown Promo'}</span>
          <Tag color={rule.autoApply ? 'green' : 'red'}>
            {rule.autoApply ? 'ACTIVE' : 'INACTIVE'}
          </Tag>
        </div>
      }
      className="mb-4"
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          autoApply: rule.autoApply || false,
          minDeposit: rule.minDeposit || 500,
          conditions: rule.conditions || '',
        }}
      >
        <Form.Item
          name="autoApply"
          label="Auto-apply"
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>

        <Form.Item
          name="minDeposit"
          label="Minimum Deposit"
          rules={[{ required: true, message: 'Please enter minimum deposit' }]}
        >
          <InputNumber
            className="w-full"
            min={0}
            formatter={value => `৳ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            placeholder="Minimum deposit to trigger auto-apply"
          />
        </Form.Item>

        <Form.Item
          name="conditions"
          label="Conditions"
          rules={[{ required: true, message: 'Please enter conditions' }]}
        >
          <Input.TextArea
            rows={3}
            placeholder="Describe the conditions for auto-application"
          />
        </Form.Item>

        <Form.Item>
          <Button 
            type="primary" 
            htmlType="submit" 
            loading={loading}
            icon={<CheckCircleOutlined />}
          >
            Update Rule
          </Button>
        </Form.Item>
      </Form>

      <Divider />

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <strong>Promo Code:</strong> {rule.promoCode?.code}
        </div>
        <div>
          <strong>Bonus Type:</strong> {rule.promoCode?.type}
        </div>
        <div>
          <strong>Bonus Amount:</strong> {formatCurrency(rule.promoCode?.bonusAmount)}
        </div>
        <div>
          <strong>Turnover Requirement:</strong> {rule.promoCode?.turnoverRequirement}x
        </div>
      </div>
    </Card>
  );
};

export default AutoApprovalSettings;