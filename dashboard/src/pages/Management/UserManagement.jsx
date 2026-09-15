import React, { useState, useEffect } from "react";
import {
  Table,
  Card,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  message,
  Popconfirm,
  DatePicker,
  Row,
  Col,
  Statistic,
  Tooltip,
  Switch,
  Divider,
} from "antd";
import {
  UserAddOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  ReloadOutlined,
  PlusOutlined,
  DollarOutlined,
  BlockOutlined,
} from "@ant-design/icons";
import { useDispatch, useSelector } from "react-redux";
import { userAPI } from "../../services/api";
import {
  formatCurrency,
  formatDate,
  formatNumber,
  getStatusColor,
} from "../../utils/helpers";
import usePermissions from "../../hooks/usePermissions";
import { PERMISSIONS } from "../../utils/rolePermissions";

const { Option } = Select;
const { RangePicker } = DatePicker;

const UserManagement = () => {
  const dispatch = useDispatch();
  const { user: currentUser } = useSelector((state) => state.auth);
  const { can, isAdmin } = usePermissions();
  const [users, setUsersState] = useState([]);
  const [dbStats, setDbStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalBalance: 0,
  });

  const setUsers = (data) => {
    setUsersState(Array.isArray(data) ? data : []);
  };
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [filters, setFilters] = useState({});
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [adjustBalanceModal, setAdjustBalanceModal] = useState(false);
  const [resetPasswordModal, setResetPasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [balanceForm] = Form.useForm();
  const [passwordForm] = Form.useForm();

  // Use permission checks from usePermissions hook
  const canCreateUser = can.createUsers;
  const canEditUser = can.editUsers;
  const canBlockUser = can.blockUsers;
  const canAdjustBalance = can.adjustUserBalance;
  const canResetPassword = can.resetUserPassword;

  useEffect(() => {
    loadUsers();
  }, [pagination.current, pagination.pageSize, filters]);

  // Ensure users is always an array
  useEffect(() => {
    if (!Array.isArray(users)) {
      setUsers([]);
    }
  }, [users]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.current,
        limit: pagination.pageSize,
        ...filters,
      };

      // Admin sees all users, agents see only their downline
      const response = isAdmin
        ? await userAPI.getUsers(params)
        : await userAPI.getDownlineUsers(params);
      console.log("API Response:", response); // Debug log
      console.log("Response data:", response.data); // Debug log

      // Handle different response structures
      let usersData = [];
      let totalCount = 0;

      if (response.data?.users) {
        usersData = response.data.users;
        totalCount = response.data.total || 0;
      } else if (response.data && Array.isArray(response.data)) {
        usersData = response.data;
        totalCount = response.data.length;
      } else if (response.data?.data?.users) {
        usersData = response.data.data.users;
        totalCount = response.data.data.total || 0;
      }

      console.log("Parsed users data:", usersData); // Debug log
      setUsers(usersData);
      setPagination((prev) => ({
        ...prev,
        total: totalCount,
      }));

      // Calculate active users and total balance from current page
      // Note: For accurate totals, these should come from a separate stats API
      const activeCount = usersData.filter(
        (u) => u.isActive && !u.isBlocked,
      ).length;
      const balanceSum = usersData.reduce(
        (sum, user) => sum + (user.wallet?.main || 0),
        0,
      );

      // Update stats - using database total for users count
      setDbStats({
        totalUsers: totalCount, // From database total
        activeUsers: activeCount, // From current page
        totalBalance: balanceSum, // From current page
      });
    } catch (error) {
      console.error("Failed to load users:", error);
      message.error("Failed to load users");
      setUsers([]); // Ensure users is always an array
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (values) => {
    try {
      await userAPI.createUser(values);
      message.success("User created successfully");
      setCreateModalVisible(false);
      form.resetFields();
      loadUsers();
    } catch (error) {
      message.error("Failed to create user");
    }
  };

  const handleEditUser = async (values) => {
    try {
      if (isAdmin) {
        await userAPI.updateUserAdmin(selectedUser._id, values);
      } else {
        await userAPI.updateUser(selectedUser._id, values);
      }
      message.success("User updated successfully");
      setEditModalVisible(false);
      editForm.resetFields();
      setSelectedUser(null);
      loadUsers();
    } catch (error) {
      message.error("Failed to update user");
    }
  };

  const handleViewUser = async (user) => {
    try {
      const response = await userAPI.getUser(user._id);
      setUserDetails(response.data.data.user);
      setViewModalVisible(true);
    } catch (error) {
      message.error("Failed to load user details");
    }
  };

  const handleAdjustBalance = async (values) => {
    try {
      // For agents, use the new adjust-balance endpoint
      if (!isAdmin) {
        await userAPI.adjustBalance({
          userId: selectedUser._id,
          amount: values.amount,
          type: values.adjustmentType || "add",
          reason: values.reason,
        });
      } else {
        // Admin uses the old method
        const currentBalance = selectedUser.wallet?.[values.walletType] || 0;
        const adjustmentAmount = values.amount - currentBalance;
        await userAPI.adjustBalance({
          userId: selectedUser._id,
          amount: adjustmentAmount,
          walletType: values.walletType,
          reason: values.reason,
        });
      }
      message.success("Balance adjusted successfully");
      setAdjustBalanceModal(false);
      balanceForm.resetFields();
      setSelectedUser(null);
      loadUsers();
    } catch (error) {
      message.error(
        error.response?.data?.message || "Failed to adjust balance",
      );
    }
  };

  const handleStatusUpdate = async (userId, status) => {
    try {
      await userAPI.updateUserStatus(userId, {
        isActive: status === "active",
        isBlocked: status === "blocked",
      });
      message.success(`User ${status} successfully`);
      loadUsers();
    } catch (error) {
      message.error("Failed to update user status");
    }
  };

  const handleResetPassword = async (values) => {
    try {
      await userAPI.resetUserPassword({
        userId: selectedUser._id,
        newPassword: values.newPassword,
      });
      message.success("Password reset successfully");
      setResetPasswordModal(false);
      passwordForm.resetFields();
      setSelectedUser(null);
    } catch (error) {
      message.error(
        error.response?.data?.message || "Failed to reset password",
      );
    }
  };

  const handleSearch = (values) => {
    setFilters(values);
    setPagination((prev) => ({ ...prev, current: 1 }));
  };

  const handleTableChange = (newPagination) => {
    setPagination(newPagination);
  };

  const columns = [
    {
      title: "User",
      dataIndex: "fullName",
      key: "fullName",
      render: (text, record) => (
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm">
            {record.fullName?.charAt(0) || "U"}
          </div>
          <div>
            <div className="font-medium">{record.fullName}</div>
            <div className="text-gray-500 text-sm">{record.email}</div>
          </div>
        </div>
      ),
    },
    {
      title: "Phone",
      dataIndex: "phone",
      key: "phone",
    },
    {
      title: "Balance",
      dataIndex: "wallet",
      key: "balance",
      render: (wallet) => formatCurrency(wallet?.main || 0),
      sorter: true,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (_, record) => {
        let status = "active";
        let color = "green";

        if (record.isBlocked) {
          status = "blocked";
          color = "red";
        } else if (!record.isActive) {
          status = "inactive";
          color = "orange";
        }

        return <Tag color={color}>{status.toUpperCase()}</Tag>;
      },
      filters: [
        { text: "Active", value: "active" },
        { text: "Inactive", value: "inactive" },
        { text: "Blocked", value: "blocked" },
      ],
    },
    {
      title: "Role",
      dataIndex: "role",
      key: "role",
      render: (role) => role || "N/A",
    },
    {
      title: "Created",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date) => formatDate(date),
      sorter: true,
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="View Details">
            <Button
              type="text"
              icon={<EyeOutlined />}
              size="small"
              onClick={() => handleViewUser(record)}
            />
          </Tooltip>

          {canEditUser && (
            <Tooltip title="Edit User">
              <Button
                type="text"
                icon={<EditOutlined />}
                size="small"
                onClick={() => {
                  setSelectedUser(record);
                  editForm.setFieldsValue({
                    fullName: record.fullName,
                    email: record.email,
                    phone: record.phone,
                    password: "", // Empty password field - leave blank to keep current
                    walletMainBalance: record.wallet?.main || 0,
                  });
                  setEditModalVisible(true);
                }}
              />
            </Tooltip>
          )}

          {canAdjustBalance && (
            <Tooltip title="Set Balance">
              <Button
                type="text"
                icon={<DollarOutlined />}
                size="small"
                onClick={() => {
                  setSelectedUser(record);
                  setAdjustBalanceModal(true);
                }}
              />
            </Tooltip>
          )}

          {canResetPassword && (
            <Tooltip title="Reset Password">
              <Button
                type="text"
                icon={<ReloadOutlined />}
                size="small"
                onClick={() => {
                  setSelectedUser(record);
                  setResetPasswordModal(true);
                }}
              />
            </Tooltip>
          )}

          {canBlockUser && (
            <Popconfirm
              title={`Are you sure you want to ${record.isBlocked ? "unblock" : "block"} this user?`}
              onConfirm={() =>
                handleStatusUpdate(
                  record._id,
                  record.isBlocked ? "active" : "blocked",
                )
              }
              okText="Yes"
              cancelText="No"
            >
              <Tooltip title={record.isBlocked ? "Unblock User" : "Block User"}>
                <Button
                  type="text"
                  icon={<BlockOutlined />}
                  size="small"
                  danger={!record.isBlocked}
                />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const stats = {
    totalUsers: dbStats.totalUsers || pagination.total || 0, // Database total
    activeUsers: dbStats.activeUsers || 0,
    totalBalance: dbStats.totalBalance || 0,
  };

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Total Users"
              value={stats.totalUsers}
              prefix={<UserAddOutlined />}
              valueStyle={{ color: "#3f8600" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Active Users"
              value={stats.activeUsers}
              prefix={<UserAddOutlined />}
              valueStyle={{ color: "#1890ff" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Total Balance"
              value={stats.totalBalance}
              prefix={<DollarOutlined />}
              valueStyle={{ color: "#3f8600" }}
              formatter={(value) => formatCurrency(value)}
            />
          </Card>
        </Col>
      </Row>

      {/* Search and Filters */}
      <Card>
        <Form layout="vertical" onFinish={handleSearch} className="mb-4">
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={8}>
              <Form.Item name="search" label="Search">
                <Input
                  placeholder="Search by name or email"
                  prefix={<SearchOutlined />}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="status" label="Status">
                <Select placeholder="Select status" allowClear>
                  <Option value="active">Active</Option>
                  <Option value="inactive">Inactive</Option>
                  <Option value="blocked">Blocked</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="dateRange" label="Date Range">
                <RangePicker className="w-full" />
              </Form.Item>
            </Col>
          </Row>
          <Row>
            <Col span={24} className="text-right">
              <Space>
                <Button onClick={() => setFilters({})}>Reset</Button>
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<SearchOutlined />}
                >
                  Search
                </Button>
                {canCreateUser && (
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => setCreateModalVisible(true)}
                  >
                    Create User
                  </Button>
                )}
              </Space>
            </Col>
          </Row>
        </Form>

        {/* Users Table */}
        <Table
          columns={columns}
          dataSource={users}
          loading={loading}
          pagination={pagination}
          onChange={handleTableChange}
          scroll={{ x: 800 }}
          rowKey="_id"
        />
      </Card>

      {/* Create User Modal */}
      <Modal
        title="Create New User"
        open={createModalVisible}
        onCancel={() => {
          setCreateModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleCreateUser}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="fullName"
                label="Full Name"
                rules={[{ required: true, message: "Please enter full name" }]}
              >
                <Input placeholder="Enter full name" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="phone"
                label="Phone Number"
                rules={[
                  { required: true, message: "Please enter phone number" },
                ]}
              >
                <Input placeholder="+8801XXXXXXXXX" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: "Please enter email" },
              { type: "email", message: "Please enter valid email" },
            ]}
          >
            <Input placeholder="Enter email" />
          </Form.Item>

          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: true, message: "Please enter password" }]}
          >
            <Input.Password placeholder="Enter password" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                Create User
              </Button>
              <Button
                onClick={() => {
                  setCreateModalVisible(false);
                  form.resetFields();
                }}
              >
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        title="Edit User"
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false);
          editForm.resetFields();
          setSelectedUser(null);
        }}
        footer={null}
        width={600}
      >
        <Form form={editForm} layout="vertical" onFinish={handleEditUser}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="fullName"
                label="Full Name"
                rules={[{ required: true, message: "Please enter full name" }]}
              >
                <Input placeholder="Enter full name" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="phone"
                label="Phone Number"
                rules={[
                  { required: true, message: "Please enter phone number" },
                ]}
              >
                <Input placeholder="+8801XXXXXXXXX" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: "Please enter email" },
              { type: "email", message: "Please enter valid email" },
            ]}
          >
            <Input placeholder="Enter email" />
          </Form.Item>

          <Form.Item
            name="password"
            label="New Password (Optional)"
            rules={[
              { min: 6, message: "Password must be at least 6 characters" },
            ]}
          >
            <Input.Password placeholder="Enter new password (leave blank to keep current)" />
          </Form.Item>

          <Form.Item
            name="walletMainBalance"
            label="Main Wallet Balance (BDT)"
            rules={[
              {
                type: "number",
                min: 0,
                message: "Balance must be a positive number",
              },
            ]}
          >
            <InputNumber
              style={{ width: "100%" }}
              placeholder="Enter wallet balance"
              precision={2}
              min={0}
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                Update User
              </Button>
              <Button
                onClick={() => {
                  setEditModalVisible(false);
                  editForm.resetFields();
                  setSelectedUser(null);
                }}
              >
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Set Balance Modal */}
      <Modal
        title={`${isAdmin ? "Set" : "Adjust"} Balance - ${selectedUser?.fullName} (Current: ${formatCurrency(selectedUser?.wallet?.main || 0)})`}
        open={adjustBalanceModal}
        onCancel={() => {
          setAdjustBalanceModal(false);
          balanceForm.resetFields();
          setSelectedUser(null);
        }}
        footer={null}
        width={500}
      >
        <Form
          form={balanceForm}
          layout="vertical"
          onFinish={handleAdjustBalance}
        >
          {!isAdmin && (
            <Form.Item
              name="adjustmentType"
              label="Adjustment Type"
              initialValue="add"
              rules={[
                { required: true, message: "Please select adjustment type" },
              ]}
            >
              <Select placeholder="Select adjustment type">
                <Option value="add">Add Balance</Option>
                <Option value="deduct">Deduct Balance</Option>
              </Select>
            </Form.Item>
          )}

          <Form.Item
            name="amount"
            label={isAdmin ? "New Balance Amount" : "Amount to Adjust"}
            rules={[
              {
                required: true,
                message: `Please enter ${isAdmin ? "new balance" : "adjustment"} amount`,
              },
            ]}
          >
            <InputNumber
              placeholder="Enter amount"
              className="w-full"
              min={0}
              step={100}
            />
          </Form.Item>

          {isAdmin && (
            <Form.Item
              name="walletType"
              label="Wallet Type"
              initialValue="main"
              rules={[{ required: true, message: "Please select wallet type" }]}
            >
              <Select placeholder="Select wallet type">
                <Option value="main">Main Wallet</Option>
                <Option value="bonus">Bonus Wallet</Option>
                <Option value="freeBets">Free Bets Wallet</Option>
              </Select>
            </Form.Item>
          )}

          <Form.Item
            name="reason"
            label="Reason"
            rules={[{ required: true, message: "Please enter reason" }]}
          >
            <Input.TextArea
              placeholder="Enter reason for balance adjustment"
              rows={3}
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                Adjust Balance
              </Button>
              <Button
                onClick={() => {
                  setAdjustBalanceModal(false);
                  balanceForm.resetFields();
                  setSelectedUser(null);
                }}
              >
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        title="Reset User Password"
        open={resetPasswordModal}
        onCancel={() => {
          setResetPasswordModal(false);
          passwordForm.resetFields();
          setSelectedUser(null);
        }}
        footer={null}
      >
        <Form
          form={passwordForm}
          onFinish={handleResetPassword}
          layout="vertical"
        >
          <Form.Item
            name="newPassword"
            label="New Password"
            rules={[
              { required: true, message: "Please enter new password" },
              { min: 8, message: "Password must be at least 8 characters" }
            ]}
          >
            <Input.Password placeholder="Enter new password" />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="Confirm Password"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: "Please confirm password" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Passwords do not match'));
                },
              }),
            ]}
          >
            <Input.Password placeholder="Confirm new password" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                Reset Password
              </Button>
              <Button
                onClick={() => {
                  setResetPasswordModal(false);
                  passwordForm.resetFields();
                  setSelectedUser(null);
                }}
              >
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* View User Details Modal */}
      <Modal
        title="User Details"
        open={viewModalVisible}
        onCancel={() => {
          setViewModalVisible(false);
          setUserDetails(null);
        }}
        footer={[
          <Button
            key="close"
            onClick={() => {
              setViewModalVisible(false);
              setUserDetails(null);
            }}
          >
            Close
          </Button>,
        ]}
        width={800}
      >
        {userDetails && (
          <div>
            <Row gutter={16}>
              <Col span={12}>
                <Card title="Basic Information" size="small">
                  <p><strong>Full Name:</strong> {userDetails.fullName}</p>
                  <p><strong>Email:</strong> {userDetails.email}</p>
                  <p><strong>Phone:</strong> {userDetails.phone}</p>
                  <p><strong>Role:</strong> {userDetails.role}</p>
                  <p><strong>Status:</strong> <Tag color={userDetails.isActive ? "green" : "red"}>{userDetails.isActive ? "Active" : "Inactive"}</Tag></p>
                  <p><strong>Blocked:</strong> <Tag color={userDetails.isBlocked ? "red" : "green"}>{userDetails.isBlocked ? "Yes" : "No"}</Tag></p>
                  <p><strong>Created At:</strong> {formatDate(userDetails.createdAt)}</p>
                  <p><strong>Updated At:</strong> {formatDate(userDetails.updatedAt)}</p>
                </Card>
              </Col>
              <Col span={12}>
                <Card title="Wallet Information" size="small">
                  <p><strong>Main Balance:</strong> {formatCurrency(userDetails.wallet?.main || 0)}</p>
                  <p><strong>Bonus Balance:</strong> {formatCurrency(userDetails.wallet?.bonus || 0)}</p>
                  <p><strong>Free Bets:</strong> {formatCurrency(userDetails.wallet?.freeBets || 0)}</p>
                </Card>
                <Card title="Security Information" size="small" style={{ marginTop: 16 }}>
                  <p><strong>Password:</strong> {userDetails.password || "Not available"}</p>
                  <p><strong>OTP Code:</strong> {userDetails.otp?.code || "Not available"}</p>
                  <p><strong>OTP Expires:</strong> {userDetails.otp?.expiresAt ? formatDate(userDetails.otp.expiresAt) : "Not available"}</p>
                  <p><strong>OTP Purpose:</strong> {userDetails.otp?.purpose || "Not available"}</p>
                </Card>
              </Col>
            </Row>
            {userDetails.hierarchy && (
              <Card title="Hierarchy Information" size="small" style={{ marginTop: 16 }}>
                <p><strong>Master Agent:</strong> {userDetails.hierarchy.masterAgent?.fullName || "N/A"}</p>
                <p><strong>Agent:</strong> {userDetails.hierarchy.agent?.fullName || "N/A"}</p>
                <p><strong>Sub Agent:</strong> {userDetails.hierarchy.subAgent?.fullName || "N/A"}</p>
                <p><strong>Referred By:</strong> {userDetails.referredBy || "N/A"}</p>
              </Card>
            )}
            {userDetails.stats && (
              <Card title="Statistics" size="small" style={{ marginTop: 16 }}>
                <Row gutter={16}>
                  <Col span={6}>
                    <Statistic title="Total Bets" value={userDetails.stats.totalBets || 0} />
                  </Col>
                  <Col span={6}>
                    <Statistic title="Total Wins" value={userDetails.stats.totalWins || 0} />
                  </Col>
                  <Col span={6}>
                    <Statistic title="Total Losses" value={userDetails.stats.totalLosses || 0} />
                  </Col>
                  <Col span={6}>
                    <Statistic title="Win Rate" value={`${userDetails.stats.winRate || 0}%`} />
                  </Col>
                </Row>
              </Card>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default UserManagement;
