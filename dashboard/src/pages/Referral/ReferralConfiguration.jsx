import React, { useEffect, useState } from "react";
import {
  Button,
  Card,
  Col,
  Form,
  InputNumber,
  message,
  Row,
  Select,
  Space,
  Switch,
} from "antd";
import { ReloadOutlined, SaveOutlined } from "@ant-design/icons";
import { referralAPI } from "../../services/api";
import { getApiData, referralStatusOptions } from "./referralUtils";

const normalizeConfig = (config = {}) => ({
  bonusAmount: config.bonusAmount,
  minimumFirstDeposit: config.minimumFirstDeposit,
  requiredTurnoverMultiplier: config.requiredTurnoverMultiplier,
  bonusClaimExpiryDays: config.bonusClaimExpiryDays,
  enabled: Boolean(config.enabled),
  maximumReferralBonusPerUser: config.maximumReferralBonusPerUser,
  maximumReferralCount: config.maximumReferralCount,
  status: config.status,
});

const ReferralConfiguration = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const response = await referralAPI.getConfig();
      const data = getApiData(response);
      form.setFieldsValue(normalizeConfig(data.config || data));
    } catch (error) {
      message.error(error.response?.data?.message || "Failed to load referral configuration");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const handleSave = async (values) => {
    setSaving(true);
    try {
      await referralAPI.updateConfig(values);
      message.success("Referral configuration saved");
      loadConfig();
    } catch (error) {
      message.error(error.response?.data?.message || "Failed to save referral configuration");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card
      title="Referral Configuration"
      extra={
        <Button icon={<ReloadOutlined />} onClick={loadConfig} loading={loading}>
          Refresh
        </Button>
      }
    >
      <Form form={form} layout="vertical" onFinish={handleSave} disabled={loading}>
        <Row gutter={16}>
          <Col xs={24} md={12} lg={8}>
            <Form.Item
              name="bonusAmount"
              label="Referral Bonus Amount"
              rules={[{ required: true, message: "Bonus amount is required" }]}
            >
              <InputNumber min={0} precision={2} className="w-full" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12} lg={8}>
            <Form.Item
              name="minimumFirstDeposit"
              label="Minimum First Deposit"
              rules={[{ required: true, message: "Minimum deposit is required" }]}
            >
              <InputNumber min={0} precision={2} className="w-full" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12} lg={8}>
            <Form.Item
              name="requiredTurnoverMultiplier"
              label="Required Turnover Multiplier"
              rules={[{ required: true, message: "Turnover multiplier is required" }]}
            >
              <InputNumber min={0} precision={2} className="w-full" addonAfter="x" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12} lg={8}>
            <Form.Item
              name="bonusClaimExpiryDays"
              label="Bonus Claim Expiry"
              rules={[{ required: true, message: "Claim expiry is required" }]}
            >
              <InputNumber min={0} className="w-full" addonAfter="days" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12} lg={8}>
            <Form.Item
              name="maximumReferralBonusPerUser"
              label="Maximum Referral Bonus Per User"
            >
              <InputNumber min={0} precision={2} className="w-full" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12} lg={8}>
            <Form.Item name="maximumReferralCount" label="Maximum Referral Count">
              <InputNumber min={0} className="w-full" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12} lg={8}>
            <Form.Item name="status" label="Referral Status">
              <Select
                options={referralStatusOptions.map((value) => ({
                  value,
                  label: value.toUpperCase(),
                }))}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12} lg={8}>
            <Form.Item name="enabled" label="Enable Referral Bonus" valuePropName="checked">
              <Switch checkedChildren="Enabled" unCheckedChildren="Disabled" />
            </Form.Item>
          </Col>
        </Row>
        <Space>
          <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving}>
            Save Configuration
          </Button>
        </Space>
      </Form>
    </Card>
  );
};

export default ReferralConfiguration;
