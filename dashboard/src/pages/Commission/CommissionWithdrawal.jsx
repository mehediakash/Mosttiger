import React, { useState, useEffect } from 'react';
import {
  Card, Form, InputNumber, Button, message, Table, Tag,
  Statistic, Row, Col, Modal, Descriptions, Space, Select
} from 'antd';
import {
  DollarOutlined, HistoryOutlined, ArrowUpOutlined,
  DownloadOutlined, EyeOutlined, TransactionOutlined
} from '@ant-design/icons';
import { commissionAPI } from '../../services/api';
import { formatCurrency, formatDate } from '../../utils/helpers';

const { Option } = Select;

const CommissionWithdrawal = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [commissionData, setCommissionData] = useState({});
  const [withdrawalHistory, setWithdrawalHistory] = useState([]);
  const [withdrawModalVisible, setWithdrawModalVisible] = useState(false);

  useEffect(() => {
    loadCommissionData();
  }, []);

  const loadCommissionData = async () => {
    try {
      const [summaryRes, historyRes] = await Promise.all([
        commissionAPI.getCommissionOverview(),
        commissionAPI.getCommissionWithdrawalHistory({ page: 1, limit: 10 })
      ]);
      setCommissionData(summaryRes.data);
      setWithdrawalHistory(historyRes.data.withdrawals || []);
    } catch (error) {
      message.error('Failed to load commission data');
    }
  };

  const handleWithdraw = async (values) => {
    setLoading(true);
    try {
      await commissionAPI.requestWithdrawal({ amount: values.amount });
      message.success('Withdrawal request submitted successfully');
      setWithdrawModalVisible(false);
      form.resetFields();
      loadCommissionData();
    } catch (error) {
      message.error('Withdrawal failed: ' + (error.response?.data?.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const commissionTypes = [
    { type: 'loss_commission', label: 'Loss Commission', color: 'blue' },
    { type: 'turnover_commission', label: 'Turnover Commission', color: 'green' },
    { type: 'profit_share', label: 'Profit Share', color: 'purple' },
  ];

  const historyColumns = [
    {
      title: 'Request ID',
      dataIndex: 'requestId',
      key: 'requestId',
      render: (id) => <span className="font-mono">{id}</span>,
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount) => formatCurrency(amount),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type) => (
        <Tag color={commissionTypes.find(t => t.type === type)?.color || 'default'}>
          {type.replace('_', ' ').toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={
          status === 'approved' ? 'green' :
          status === 'pending' ? 'orange' : 'red'
        }>
          {status.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Request Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => formatDate(date),
    },
    {
      title: 'Processed Date',
      dataIndex: 'processedAt',
      key: 'processedAt',
      render: (date) => date ? formatDate(date) : 'N/A',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Commission Summary */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Available Commission"
              value={commissionData.availableCommission || 0}
              prefix={<DollarOutlined />}
              valueStyle={{ color: '#3f8600' }}
              formatter={value => formatCurrency(value)}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Pending Withdrawal"
              value={commissionData.pendingWithdrawal || 0}
              prefix={<DollarOutlined />}
              valueStyle={{ color: '#faad14' }}
              formatter={value => formatCurrency(value)}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Total Earned"
              value={commissionData.totalEarned || 0}
              prefix={<DollarOutlined />}
              valueStyle={{ color: '#1890ff' }}
              formatter={value => formatCurrency(value)}
            />
          </Card>
        </Col>
      </Row>

      {/* Commission Breakdown */}
      <Card title="Commission Breakdown">
        <Row gutter={[16, 16]}>
          {commissionTypes.map(commission => (
            <Col xs={24} sm={8} key={commission.type}>
              <Card size="small">
                <Statistic
                  title={commission.label}
                  value={commissionData[commission.type] || 0}
                  valueStyle={{ color: commission.color }}
                  formatter={value => formatCurrency(value)}
                />
              </Card>
            </Col>
          ))}
        </Row>
      </Card>

      {/* Withdrawal Action */}
      <Card 
        title="Commission Withdrawal"
        extra={
          <Button 
            type="primary" 
            icon={<DownloadOutlined />}
            onClick={() => setWithdrawModalVisible(true)}
            disabled={!commissionData.availableCommission || commissionData.availableCommission <= 0}
          >
            Request Withdrawal
          </Button>
        }
      >
        <Descriptions column={2} bordered>
          <Descriptions.Item label="Available for Withdrawal">
            {formatCurrency(commissionData.availableCommission || 0)}
          </Descriptions.Item>
          <Descriptions.Item label="Minimum Withdrawal">
            {formatCurrency(commissionData.minWithdrawal || 1000)}
          </Descriptions.Item>
          <Descriptions.Item label="Processing Time">
            {commissionData.processingTime || '24-48 hours'}
          </Descriptions.Item>
          <Descriptions.Item label="Last Withdrawal">
            {commissionData.lastWithdrawal ? 
              formatDate(commissionData.lastWithdrawal) : 'Never'
            }
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* Withdrawal History */}
      <Card title="Withdrawal History">
        <Table
          columns={historyColumns}
          dataSource={withdrawalHistory}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 800 }}
        />
      </Card>

      {/* Withdrawal Modal */}
      <Modal
        title="Request Commission Withdrawal"
        open={withdrawModalVisible}
        onCancel={() => {
          setWithdrawModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleWithdraw}
        >
          <Form.Item
            name="amount"
            label="Withdrawal Amount"
            rules={[
              { required: true, message: 'Please enter amount' },
              {
                validator: (_, value) => {
                  const minAmount = commissionData.minWithdrawal || 1000;
                  const maxAmount = commissionData.availableCommission || 0;
                  
                  if (value < minAmount) {
                    return Promise.reject(new Error(`Minimum withdrawal is ${formatCurrency(minAmount)}`));
                  }
                  if (value > maxAmount) {
                    return Promise.reject(new Error(`Maximum withdrawal is ${formatCurrency(maxAmount)}`));
                  }
                  return Promise.resolve();
                }
              }
            ]}
          >
            <InputNumber
              placeholder="Enter amount to withdraw"
              className="w-full"
              min={0}
              max={commissionData.availableCommission}
              formatter={value => `৳ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            />
          </Form.Item>

          <Form.Item
            name="paymentMethod"
            label="Payment Method"
            initialValue="bank_transfer"
            rules={[{ required: true, message: 'Please select payment method' }]}
          >
            <Select placeholder="Select payment method">
              <Option value="bank_transfer">Bank Transfer</Option>
              <Option value="bkash">bKash</Option>
              <Option value="nagad">Nagad</Option>
              <Option value="rocket">Rocket</Option>
            </Select>
          </Form.Item>

          <Form.Item>
            <Space>
              <Button 
                type="primary" 
                htmlType="submit"
                loading={loading}
              >
                Submit Withdrawal Request
              </Button>
              <Button 
                onClick={() => {
                  setWithdrawModalVisible(false);
                  form.resetFields();
                }}
              >
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default CommissionWithdrawal;