import React, { useState, useEffect } from 'react';
import {
  Card, Form, InputNumber, Select, Button, message,
  Table, Tag, Space, Statistic, Row, Col, Divider
} from 'antd';
import {
  SwapOutlined, DollarOutlined, HistoryOutlined,
  ArrowUpOutlined, ArrowDownOutlined
} from '@ant-design/icons';
import { walletAPI } from '../../services/api';
import { formatCurrency, formatDate } from '../../utils/helpers';

const { Option } = Select;

const WalletTransfer = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState({});
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    loadWalletData();
  }, []);

  const loadWalletData = async () => {
    try {
      const [balanceRes, transactionsRes] = await Promise.all([
        walletAPI.getBalance(),
        walletAPI.getTransactions({ page: 1, limit: 10 })
      ]);
      setBalance(balanceRes.data);
      setTransactions(transactionsRes.data.transactions);
    } catch (error) {
      message.error('Failed to load wallet data');
    }
  };

  const handleTransfer = async (values) => {
    setLoading(true);
    try {
      await walletAPI.transfer(values);
      message.success('Transfer completed successfully');
      form.resetFields();
      loadWalletData();
    } catch (error) {
      message.error('Transfer failed: ' + (error.response?.data?.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const walletTypes = [
    { value: 'main', label: 'Main Wallet', color: 'blue' },
    { value: 'bonus', label: 'Bonus Wallet', color: 'green' },
    { value: 'freeBets', label: 'Free Bets Wallet', color: 'orange' },
  ];

  const transactionColumns = [
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type) => (
        <Tag color={type === 'transfer' ? 'blue' : getStatusColor(type)}>
          {type.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'From Wallet',
      dataIndex: 'fromWallet',
      key: 'fromWallet',
      render: (wallet) => wallet ? (
        <Tag color={walletTypes.find(w => w.value === wallet)?.color}>
          {wallet.toUpperCase()}
        </Tag>
      ) : 'N/A',
    },
    {
      title: 'To Wallet',
      dataIndex: 'toWallet',
      key: 'toWallet',
      render: (wallet) => wallet ? (
        <Tag color={walletTypes.find(w => w.value === wallet)?.color}>
          {wallet.toUpperCase()}
        </Tag>
      ) : 'N/A',
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount) => formatCurrency(amount),
    },
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => formatDate(date),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={status === 'completed' ? 'green' : 'orange'}>
          {status.toUpperCase()}
        </Tag>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Wallet Balances */}
      <Row gutter={[16, 16]}>
        {walletTypes.map(wallet => (
          <Col xs={24} sm={8} key={wallet.value}>
            <Card>
              <Statistic
                title={wallet.label}
                value={balance[wallet.value] || 0}
                prefix={<DollarOutlined />}
                valueStyle={{ color: '#3f8600' }}
                formatter={value => formatCurrency(value)}
              />
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="Transfer Between Wallets">
            <Form
              form={form}
              layout="vertical"
              onFinish={handleTransfer}
            >
              <Form.Item
                name="fromWallet"
                label="From Wallet"
                rules={[{ required: true, message: 'Please select source wallet' }]}
              >
                <Select placeholder="Select source wallet">
                  {walletTypes.map(wallet => (
                    <Option key={wallet.value} value={wallet.value}>
                      {wallet.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                name="toWallet"
                label="To Wallet"
                rules={[{ required: true, message: 'Please select destination wallet' }]}
              >
                <Select placeholder="Select destination wallet">
                  {walletTypes.map(wallet => (
                    <Option key={wallet.value} value={wallet.value}>
                      {wallet.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                name="amount"
                label="Amount"
                rules={[
                  { required: true, message: 'Please enter amount' },
                  { 
                    validator: (_, value) => {
                      if (value && value > 0) return Promise.resolve();
                      return Promise.reject(new Error('Amount must be greater than 0'));
                    }
                  }
                ]}
              >
                <InputNumber
                  placeholder="Enter amount"
                  className="w-full"
                  min={0}
                  step={100}
                  formatter={value => `৳ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                />
              </Form.Item>

              <Form.Item>
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  loading={loading}
                  icon={<SwapOutlined />}
                  className="w-full"
                >
                  Transfer Funds
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="Recent Transactions">
            <Table
              columns={transactionColumns}
              dataSource={transactions}
              pagination={false}
              size="small"
              scroll={{ x: 600 }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default WalletTransfer;