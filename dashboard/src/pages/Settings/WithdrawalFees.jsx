import React, { useState, useEffect } from 'react';
import {
  Card, Form, InputNumber, Select, Button, message,
  Table, Tag, Space, Statistic, Row, Col, Divider,
  Switch, Input, Modal, Descriptions
} from 'antd';
import {
  DollarOutlined, PercentageOutlined, SettingOutlined,
  UserOutlined, TeamOutlined, EditOutlined
} from '@ant-design/icons';
import { feesAPI, userAPI } from '../../services/api';
import { formatCurrency } from '../../utils/helpers';

const { Option } = Select;

const WithdrawalFees = () => {
  const [globalFees, setGlobalFees] = useState({});
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [customFeeModal, setCustomFeeModal] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [feesRes, usersRes] = await Promise.all([
        feesAPI.getGlobalFees(),
        feesAPI.getFeeSettingsOverview()
      ]);
      setGlobalFees(feesRes.data);
      setUsers(usersRes.data.usersWithCustomFees || []);
    } catch (error) {
      message.error('Failed to load fee settings');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateGlobalFees = async (values) => {
    try {
      await feesAPI.updateGlobalFees(values);
      message.success('Global fees updated successfully');
      loadData();
    } catch (error) {
      message.error('Failed to update global fees');
    }
  };

  const handleSetCustomFees = async (values) => {
    try {
      await feesAPI.setCustomUserFees(selectedUser._id, values);
      message.success('Custom fees set successfully');
      setCustomFeeModal(false);
      setSelectedUser(null);
      loadData();
    } catch (error) {
      message.error('Failed to set custom fees');
    }
  };

  const feeTypes = [
    { value: 'fixed', label: 'Fixed Amount', icon: <DollarOutlined /> },
    { value: 'percentage', label: 'Percentage', icon: <PercentageOutlined /> },
  ];

  const paymentMethods = [
    { value: 'bkash', label: 'bKash', color: 'red' },
    { value: 'nagad', label: 'Nagad', color: 'green' },
    { value: 'rocket', label: 'Rocket', color: 'blue' },
    { value: 'bank', label: 'Bank Transfer', color: 'purple' },
  ];

  const GlobalFeesStats = () => (
    <Row gutter={[16, 16]}>
      <Col xs={24} sm={8}>
        <Card size="small">
          <Statistic
            title="Processing Fee"
            value={globalFees.processingFee || 0}
            suffix={globalFees.processingFeeType === 'percentage' ? '%' : '৳'}
            valueStyle={{ color: '#1890ff' }}
            prefix={<DollarOutlined />}
          />
        </Card>
      </Col>
      <Col xs={24} sm={8}>
        <Card size="small">
          <Statistic
            title="Min Withdrawal"
            value={globalFees.minWithdrawal || 0}
            prefix="৳"
            valueStyle={{ color: '#3f8600' }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={8}>
        <Card size="small">
          <Statistic
            title="Max Withdrawal"
            value={globalFees.maxWithdrawal || 0}
            prefix="৳"
            valueStyle={{ color: '#cf1322' }}
          />
        </Card>
      </Col>
    </Row>
  );

  const userColumns = [
    {
      title: 'User',
      dataIndex: 'fullName',
      key: 'fullName',
      render: (text, record) => (
        <div className="flex items-center space-x-3">
          <UserOutlined className="text-blue-500" />
          <div>
            <div className="font-medium">{record.fullName}</div>
            <div className="text-xs text-gray-500">{record.email}</div>
          </div>
        </div>
      ),
    },
    {
      title: 'Custom Fee',
      dataIndex: 'customFee',
      key: 'customFee',
      render: (fee, record) => 
        fee ? `${fee.amount} ${fee.type === 'percentage' ? '%' : '৳'}` : 'Default',
    },
    {
      title: 'Min Withdrawal',
      dataIndex: 'minWithdrawal',
      key: 'minWithdrawal',
      render: (amount) => formatCurrency(amount),
    },
    {
      title: 'Max Withdrawal',
      dataIndex: 'maxWithdrawal',
      key: 'maxWithdrawal',
      render: (amount) => formatCurrency(amount),
    },
    {
      title: 'Status',
      dataIndex: 'feeStatus',
      key: 'feeStatus',
      render: (status) => (
        <Tag color={status === 'active' ? 'green' : 'orange'}>
          {status?.toUpperCase() || 'DEFAULT'}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              setSelectedUser(record);
              setCustomFeeModal(true);
            }}
          >
            Edit Fees
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <GlobalFeesStats />

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card 
            title="Global Withdrawal Fee Settings"
            loading={loading}
          >
            <GlobalFeesForm
              fees={globalFees}
              onUpdate={handleUpdateGlobalFees}
              feeTypes={feeTypes}
              paymentMethods={paymentMethods}
            />
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card 
            title="Custom User Fees"
            extra={
              <Button 
                type="primary" 
                size="small"
                onClick={() => setCustomFeeModal(true)}
              >
                Set Custom Fees
              </Button>
            }
          >
            <Table
              columns={userColumns}
              dataSource={users}
              pagination={{ pageSize: 5 }}
              size="small"
              scroll={{ x: 600 }}
            />
          </Card>
        </Col>
      </Row>

      {/* Custom Fee Modal */}
      <Modal
        title={`Set Custom Fees for ${selectedUser?.fullName || 'User'}`}
        open={customFeeModal}
        onCancel={() => {
          setCustomFeeModal(false);
          setSelectedUser(null);
        }}
        footer={null}
        width={600}
      >
        <CustomFeesForm
          user={selectedUser}
          globalFees={globalFees}
          onSave={handleSetCustomFees}
          feeTypes={feeTypes}
        />
      </Modal>
    </div>
  );
};

// Global Fees Form Component
const GlobalFeesForm = ({ fees, onUpdate, feeTypes, paymentMethods }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (fees) {
      form.setFieldsValue(fees);
    }
  }, [fees, form]);

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      await onUpdate(values);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSubmit}
    >
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="processingFee"
            label="Processing Fee"
            rules={[{ required: true, message: 'Please enter processing fee' }]}
          >
            <InputNumber
              className="w-full"
              min={0}
              placeholder="Enter fee amount"
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="processingFeeType"
            label="Fee Type"
            rules={[{ required: true, message: 'Please select fee type' }]}
          >
            <Select placeholder="Select fee type">
              {feeTypes.map(type => (
                <Option key={type.value} value={type.value}>
                  <div className="flex items-center">
                    {type.icon}
                    <span className="ml-2">{type.label}</span>
                  </div>
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="minWithdrawal"
            label="Minimum Withdrawal"
            rules={[{ required: true, message: 'Please enter minimum withdrawal' }]}
          >
            <InputNumber
              className="w-full"
              min={0}
              formatter={value => `৳ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              placeholder="Minimum withdrawal amount"
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="maxWithdrawal"
            label="Maximum Withdrawal"
            rules={[{ required: true, message: 'Please enter maximum withdrawal' }]}
          >
            <InputNumber
              className="w-full"
              min={0}
              formatter={value => `৳ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              placeholder="Maximum withdrawal amount"
            />
          </Form.Item>
        </Col>
      </Row>

      <Divider orientation="left">Payment Method Specific Fees</Divider>

      {paymentMethods.map(method => (
        <Row gutter={16} key={method.value} className="mb-4">
          <Col span={8}>
            <Form.Item
              name={['methodFees', method.value, 'fee']}
              label={`${method.label} Fee`}
            >
              <InputNumber
                className="w-full"
                min={0}
                placeholder="Fee amount"
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name={['methodFees', method.value, 'type']}
              label="Type"
            >
              <Select defaultValue="fixed">
                <Option value="fixed">Fixed</Option>
                <Option value="percentage">Percentage</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name={['methodFees', method.value, 'minAmount']}
              label="Min Amount"
            >
              <InputNumber
                className="w-full"
                min={0}
                placeholder="Min amount"
              />
            </Form.Item>
          </Col>
        </Row>
      ))}

      <Form.Item>
        <Button 
          type="primary" 
          htmlType="submit" 
          loading={loading}
          icon={<SettingOutlined />}
          className="w-full"
        >
          Update Global Fees
        </Button>
      </Form.Item>
    </Form>
  );
};

// Custom Fees Form Component
const CustomFeesForm = ({ user, globalFees, onSave, feeTypes }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(user);

  useEffect(() => {
    if (user) {
      setSelectedUser(user);
      form.setFieldsValue({
        userId: user._id,
        processingFee: user.customFee?.amount || globalFees.processingFee,
        processingFeeType: user.customFee?.type || globalFees.processingFeeType,
        minWithdrawal: user.minWithdrawal || globalFees.minWithdrawal,
        maxWithdrawal: user.maxWithdrawal || globalFees.maxWithdrawal,
      });
    }
  }, [user, globalFees, form]);

  const handleSearchUsers = async (value) => {
    if (value.length < 3) return;
    
    try {
      const response = await userAPI.getUsers({ search: value });
      setSearchResults(response.data.users);
    } catch (error) {
      message.error('Failed to search users');
    }
  };

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      await onSave(values);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSubmit}
    >
      {!user && (
        <Form.Item
          name="userId"
          label="Select User"
          rules={[{ required: true, message: 'Please select a user' }]}
        >
          <Select
            showSearch
            placeholder="Search user by name or email"
            onSearch={handleSearchUsers}
            filterOption={false}
            onSelect={(value) => {
              const user = searchResults.find(u => u._id === value);
              setSelectedUser(user);
            }}
          >
            {searchResults.map(user => (
              <Option key={user._id} value={user._id}>
                <div className="flex justify-between">
                  <span>{user.fullName}</span>
                  <Tag color="blue">{user.email}</Tag>
                </div>
              </Option>
            ))}
          </Select>
        </Form.Item>
      )}

      {selectedUser && (
        <Descriptions size="small" column={1} bordered className="mb-4">
          <Descriptions.Item label="User">
            {selectedUser.fullName} ({selectedUser.email})
          </Descriptions.Item>
          <Descriptions.Item label="Current Balance">
            {formatCurrency(selectedUser.balance?.main || 0)}
          </Descriptions.Item>
        </Descriptions>
      )}

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="processingFee"
            label="Custom Processing Fee"
          >
            <InputNumber
              className="w-full"
              min={0}
              placeholder="Leave empty for global fee"
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="processingFeeType"
            label="Fee Type"
          >
            <Select placeholder="Select fee type">
              {feeTypes.map(type => (
                <Option key={type.value} value={type.value}>
                  {type.label}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="minWithdrawal"
            label="Minimum Withdrawal"
          >
            <InputNumber
              className="w-full"
              min={0}
              formatter={value => `৳ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              placeholder="Custom minimum withdrawal"
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="maxWithdrawal"
            label="Maximum Withdrawal"
          >
            <InputNumber
              className="w-full"
              min={0}
              formatter={value => `৳ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              placeholder="Custom maximum withdrawal"
            />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item
        name="notes"
        label="Notes (Optional)"
      >
        <Input.TextArea
          rows={3}
          placeholder="Reason for custom fees..."
        />
      </Form.Item>

      <Form.Item>
        <Space>
          <Button type="primary" htmlType="submit" loading={loading}>
            Save Custom Fees
          </Button>
          <Button 
            onClick={() => {
              form.resetFields();
              setSelectedUser(null);
            }}
          >
            Reset
          </Button>
        </Space>
      </Form.Item>
    </Form>
  );
};

export default WithdrawalFees;