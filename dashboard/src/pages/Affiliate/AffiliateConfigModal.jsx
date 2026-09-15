import React, { useEffect } from "react";
import {
  Button,
  Col,
  Form,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Switch,
} from "antd";
import {
  carryResetOptions,
  normalizeConfigForForm,
  revenueStartOptions,
  settlementOptions,
  withdrawApprovalOptions,
} from "./affiliateUtils";

const AffiliateConfigModal = ({
  open,
  title = "Affiliate Configuration",
  initialConfig,
  loading,
  onCancel,
  onSubmit,
}) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (open) {
      form.setFieldsValue(normalizeConfigForForm(initialConfig));
    }
  }, [form, initialConfig, open]);

  return (
    <Modal
      title={title}
      open={open}
      onCancel={onCancel}
      width={760}
      footer={null}
      destroyOnClose
    >
      <Form form={form} layout="vertical" onFinish={onSubmit}>
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="revenueSharePercentage"
              label="Revenue Share %"
              rules={[{ required: true, message: "Revenue share is required" }]}
            >
              <InputNumber min={0} max={100} precision={2} className="w-full" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="minimumDeposit"
              label="Minimum Deposit"
              rules={[{ required: true, message: "Minimum deposit is required" }]}
            >
              <InputNumber min={0} precision={2} className="w-full" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="requiredTurnover"
              label="Required Turnover"
              rules={[{ required: true, message: "Required turnover is required" }]}
            >
              <InputNumber min={0} precision={2} className="w-full" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="minimumWithdraw"
              label="Minimum Withdraw"
              rules={[{ required: true, message: "Minimum withdraw is required" }]}
            >
              <InputNumber min={0} precision={2} className="w-full" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="enableNegativeCarry"
              label="Enable Negative Carry"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="carryReset" label="Carry Reset">
              <Select
                options={carryResetOptions.map((value) => ({
                  value,
                  label: value.toUpperCase(),
                }))}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="maximumNegativeCarry" label="Maximum Negative Carry">
              <InputNumber min={0} precision={2} className="w-full" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="settlementFrequency" label="Settlement">
              <Select
                options={settlementOptions.map((value) => ({
                  value,
                  label: value.toUpperCase(),
                }))}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="withdrawApproval" label="Withdraw Approval">
              <Select
                options={withdrawApprovalOptions.map((value) => ({
                  value,
                  label: value.toUpperCase(),
                }))}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="revenueShareStartCondition"
              label="Revenue Share Start Condition"
            >
              <Select
                options={revenueStartOptions.map((value) => ({
                  value,
                  label: value.replaceAll("_", " ").toUpperCase(),
                }))}
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item className="mb-0">
          <Space>
            <Button type="primary" htmlType="submit" loading={loading}>
              Save
            </Button>
            <Button onClick={onCancel}>Cancel</Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default AffiliateConfigModal;
