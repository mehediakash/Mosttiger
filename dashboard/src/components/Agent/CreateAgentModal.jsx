import React, { useState } from "react";
import {
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  Checkbox,
  Row,
  Col,
  Card,
  Divider,
  message,
  Space,
  Alert,
  Typography,
  Tag,
} from "antd";
import {
  UserAddOutlined,
  LockOutlined,
  MailOutlined,
  PhoneOutlined,
} from "@ant-design/icons";
import usePermissions from "../../hooks/usePermissions";
import { PERMISSIONS } from "../../utils/rolePermissions";

const { Option } = Select;
const { Title, Text } = Typography;

/**
 * Create Agent Modal Component
 * Fully dynamic - permissions and role options based on current user's role
 * Follows server-side permission hierarchy
 */
const CreateAgentModal = ({
  visible,
  onCancel,
  onSuccess,
  currentUserRole,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const { user, isMasterAgent, isSubAgent, isAgent, isAdmin, hasPermission } =
    usePermissions();

  // Determine available roles based on current user's role
  const getAvailableRoles = () => {
    if (isAdmin) {
      return [
        { value: "master_agent", label: "Master Agent" },
        { value: "sub_agent", label: "Sub Agent" },
        { value: "agent", label: "Agent" },
      ];
    }
    if (isMasterAgent) {
      return [
        { value: "sub_agent", label: "Sub Agent" },
        { value: "agent", label: "Agent" },
      ];
    }
    if (isSubAgent) {
      return [{ value: "agent", label: "Agent" }];
    }
    // Regular agents can only create users, not agents
    return [];
  };

  const availableRoles = getAvailableRoles();

  // All available permissions (matching server-side AgentSettings model)
  // Reorganized according to workflow: User Management, Commission Management, Reports & Analytics
  const allPermissionsDefinition = [
    {
      group: "User Management",
      permissions: [
        {
          key: "addUser",
          label: "Create Users",
          value: PERMISSIONS.CREATE_USERS,
          validForRoles: ["agent"], // ONLY for agent role
        },
        { 
          key: "editUser", 
          label: "Edit Users", 
          value: PERMISSIONS.EDIT_USERS,
          validForRoles: ["agent"], // ONLY for agent role
        },
        {
          key: "viewUsers",
          label: "View Users",
          value: PERMISSIONS.VIEW_USERS,
          validForRoles: ["agent"], // ONLY for agent role
        },
        {
          key: "resetUserPassword",
          label: "Reset User Passwords",
          value: PERMISSIONS.RESET_USER_PASSWORD,
          validForRoles: ["agent"], // ONLY for agent role
        },
      ],
    },
    {
      group: "Commission Management",
      permissions: [
        {
          key: "viewCommission",
          label: "View Commission",
          value: PERMISSIONS.VIEW_COMMISSION,
          validForRoles: ["master_agent", "sub_agent", "agent"], // Available for all agent types
        },
        {
          key: "withdrawCommission",
          label: "Withdraw Commission",
          value: PERMISSIONS.WITHDRAW_COMMISSION,
          validForRoles: ["master_agent", "sub_agent", "agent"], // Available for all agent types
        },
      ],
    },
    {
      group: "Reports & Analytics",
      permissions: [
        {
          key: "viewTransactions",
          label: "View Transactions",
          value: PERMISSIONS.VIEW_TRANSACTIONS,
          validForRoles: ["master_agent", "sub_agent", "agent"], // Available for all agent types
        },
        {
          key: "viewUserBets",
          label: "View User Bets",
          value: PERMISSIONS.VIEW_USER_BETS,
          validForRoles: ["master_agent", "sub_agent", "agent"], // Available for all agent types
        },
        {
          key: "viewReports",
          label: "View Reports",
          value: PERMISSIONS.VIEW_REPORTS,
          validForRoles: ["master_agent", "sub_agent", "agent"], // Available for all agent types
        },
      ],
    },
    {
      group: "Agent Management",
      permissions: [
        {
          key: "createSubAgents",
          label: "Create Agent",
          value: PERMISSIONS.CREATE_SUB_AGENTS,
          validForRoles: ["master_agent", "sub_agent"], // For master_agent and sub_agent
        },
        {
          key: "viewSubAgents",
          label: "View Agents",
          value: PERMISSIONS.VIEW_SUB_AGENTS,
          validForRoles: ["master_agent", "sub_agent"], // For master_agent and sub_agent
        },
        {
          key: "setSubAgentCommission",
          label: "Update Commission",
          value: PERMISSIONS.SET_SUB_AGENT_COMMISSION,
          validForRoles: ["master_agent", "sub_agent", "agent"], // Available for all agent types
        },
      ],
    },
    {
      group: "Financial Management",
      permissions: [
        {
          key: "addBalance",
          label: "Add Balance",
          value: PERMISSIONS.ADD_BALANCE,
          validForRoles: ["master_agent"], // ONLY for master_agent
        },
        {
          key: "deductBalance",
          label: "Deduct Balance",
          value: PERMISSIONS.DEDUCT_BALANCE,
          validForRoles: ["master_agent"], // ONLY for master_agent
        },
        {
          key: "adjustBalance",
          label: "Adjust Balance",
          value: PERMISSIONS.ADJUST_BALANCE,
          validForRoles: ["master_agent"], // ONLY for master_agent
        },
        {
          key: "approveDeposit",
          label: "Approve Deposits",
          value: PERMISSIONS.APPROVE_DEPOSITS,
          validForRoles: ["master_agent"], // ONLY for master_agent
        },
        {
          key: "approveWithdrawal",
          label: "Approve Withdrawals",
          value: PERMISSIONS.APPROVE_WITHDRAWALS,
          validForRoles: ["master_agent"], // ONLY for master_agent
        },
      ],
    },
  ];

  /**
   * Get filtered permissions based on:
   * 1. Current user's permissions (can only assign what they have)
   * 2. Selected role (e.g., Agent cannot have Sub-Agent permissions)
   */
  const getFilteredPermissions = () => {
    return allPermissionsDefinition
      .map((group) => {
        const filteredPermissions = group.permissions.filter((perm) => {
          // Rule 1: Current user must have this permission (unless admin)
          const currentUserHasPermission = isAdmin || hasPermission(perm.value);
          
          // Rule 2: Permission must be valid for the selected role
          const validForSelectedRole = !selectedRole || perm.validForRoles.includes(selectedRole);
          
          return currentUserHasPermission && validForSelectedRole;
        });

        // Only return group if it has at least one permission
        return filteredPermissions.length > 0
          ? { ...group, permissions: filteredPermissions }
          : null;
      })
      .filter(Boolean); // Remove null groups
  };

  const availablePermissions = getFilteredPermissions();

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      // Build permissions object from selected checkboxes
      const permissions = {};
      allPermissionsDefinition.forEach((group) => {
        group.permissions.forEach((perm) => {
          permissions[perm.key] = values.permissions?.[perm.key] || false;
        });
      });

      // Build commission rates
      const commissionRates = {
        loss_commission: values.loss_commission || 0,
        turnover_commission: values.turnover_commission || 0,
        profit_share: values.profit_share || 0,
      };

      // Build limits
      const limits = {
        maxUsers: values.maxUsers || 100,
        maxDeposit: values.maxDeposit || 100000,
        maxWithdrawal: values.maxWithdrawal || 50000,
        creditLimit: values.creditLimit || 0,
      };

      const payload = {
        fullName: values.fullName,
        email: values.email,
        phone: values.phone,
        password: values.password,
        role: values.role,
        permissions,
        commissionRates,
        limits,
      };

      // Call the API
      await onSuccess(payload);

      form.resetFields();
      message.success("Agent created successfully");
    } catch (error) {
      console.error("Create agent error:", error);
      if (error.errorFields) {
        message.error("Please fill all required fields");
      } else {
        message.error(
          error.response?.data?.message || "Failed to create agent",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={
        <Space>
          <UserAddOutlined />
          <span>Create New Agent</span>
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      onOk={handleSubmit}
      confirmLoading={loading}
      width={900}
      okText="Create Agent"
      cancelText="Cancel"
    >
      <Alert
        message="Permission Scope Rule"
        description="Permissions assigned to this agent will only apply to users and agents created under their hierarchy. They cannot view or manage users created by other agents."
        type="info"
        showIcon
        style={{ marginBottom: 20 }}
      />

      <Form
        form={form}
        layout="vertical"
        initialValues={{
          loss_commission: 0,
          turnover_commission: 0,
          profit_share: 0,
          maxUsers: 100,
          maxDeposit: 100000,
          maxWithdrawal: 50000,
          creditLimit: 0,
        }}
      >
        {/* Basic Information */}
        <Card
          title="Basic Information"
          size="small"
          style={{ marginBottom: 16 }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Full Name"
                name="fullName"
                rules={[{ required: true, message: "Please enter full name" }]}
              >
                <Input
                  prefix={<UserAddOutlined />}
                  placeholder="Enter full name"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Email"
                name="email"
                rules={[
                  { required: true, message: "Please enter email" },
                  { type: "email", message: "Please enter valid email" },
                ]}
              >
                <Input
                  prefix={<MailOutlined />}
                  placeholder="agent@example.com"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Phone Number"
                name="phone"
                rules={[
                  { required: true, message: "Please enter phone number" },
                ]}
              >
                <Input
                  prefix={<PhoneOutlined />}
                  placeholder="+880 1234567890"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Password"
                name="password"
                rules={[
                  { required: true, message: "Please enter password" },
                  { min: 6, message: "Password must be at least 6 characters" },
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="Enter password"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="Agent Role"
            name="role"
            rules={[{ required: true, message: "Please select agent role" }]}
          >
            <Select 
              placeholder="Select agent role" 
              size="large"
              onChange={(value) => {
                setSelectedRole(value);
                // Set default permissions based on role
                const defaultPermissions = {};
                
                // Master Agent gets essential permissions by default
                if (value === "master_agent") {
                  defaultPermissions.createSubAgents = true;
                  defaultPermissions.viewSubAgents = true;
                  defaultPermissions.setSubAgentCommission = true;
                  defaultPermissions.viewCommission = true;
                  defaultPermissions.viewTransactions = true;
                  defaultPermissions.viewReports = true;
                }
                
                // Sub Agent gets essential permissions by default
                if (value === "sub_agent") {
                  defaultPermissions.createSubAgents = true;
                  defaultPermissions.viewSubAgents = true;
                  defaultPermissions.setSubAgentCommission = true;
                  defaultPermissions.viewCommission = true;
                  defaultPermissions.viewTransactions = true;
                  defaultPermissions.viewReports = true;
                }
                
                // Agent gets user management, commission, and reports permissions by default
                if (value === "agent") {
                  // User Management
                  defaultPermissions.addUser = true;
                  defaultPermissions.editUser = true;
                  defaultPermissions.viewUsers = true;
                  defaultPermissions.resetUserPassword = true;
                  
                  // Commission Management
                  defaultPermissions.viewCommission = true;
                  defaultPermissions.withdrawCommission = true;
                  
                  // Reports & Analytics
                  defaultPermissions.viewTransactions = true;
                  defaultPermissions.viewUserBets = true;
                  defaultPermissions.viewReports = true;
                }
                
                form.setFieldsValue({ permissions: defaultPermissions });
              }}
            >
              {availableRoles.map((role) => (
                <Option key={role.value} value={role.value}>
                  {role.label}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Card>

        {/* Commission Rates */}
        <Card
          title="Commission Rates (%)"
          size="small"
          style={{ marginBottom: 16 }}
        >
          {!isAdmin && (
            <Alert
              message="Commission Limit Rule"
              description={
                <div>
                  <p style={{ marginBottom: 8 }}>
                    <strong>You can only assign commission rates up to your own limits:</strong>
                  </p>
                  <ul style={{ marginBottom: 0, paddingLeft: 20 }}>
                    <li>Loss Commission: <strong>{user?.settings?.commissionRates?.loss_commission || 0}%</strong></li>
                    <li>Turnover Commission: <strong>{user?.settings?.commissionRates?.turnover_commission || 0}%</strong></li>
                    <li>Profit Share: <strong>{user?.settings?.commissionRates?.profit_share || 0}%</strong></li>
                  </ul>
                </div>
              }
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item 
                label={`Loss Commission ${!isAdmin ? `(Max: ${user?.settings?.commissionRates?.loss_commission || 0}%)` : ''}`}
                name="loss_commission"
                rules={[
                  { required: true, message: "Please enter loss commission" },
                  !isAdmin && {
                    validator: (_, value) => {
                      const maxValue = user?.settings?.commissionRates?.loss_commission || 0;
                      if (value > maxValue) {
                        return Promise.reject(new Error(`Cannot exceed your limit of ${maxValue}%`));
                      }
                      return Promise.resolve();
                    },
                  },
                ].filter(Boolean)}
              >
                <InputNumber
                  min={0}
                  max={isAdmin ? 100 : (user?.settings?.commissionRates?.loss_commission || 100)}
                  precision={2}
                  style={{ width: "100%" }}
                  addonAfter="%"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item 
                label={`Turnover Commission ${!isAdmin ? `(Max: ${user?.settings?.commissionRates?.turnover_commission || 0}%)` : ''}`}
                name="turnover_commission"
                rules={[
                  { required: true, message: "Please enter turnover commission" },
                  !isAdmin && {
                    validator: (_, value) => {
                      const maxValue = user?.settings?.commissionRates?.turnover_commission || 0;
                      if (value > maxValue) {
                        return Promise.reject(new Error(`Cannot exceed your limit of ${maxValue}%`));
                      }
                      return Promise.resolve();
                    },
                  },
                ].filter(Boolean)}
              >
                <InputNumber
                  min={0}
                  max={isAdmin ? 100 : (user?.settings?.commissionRates?.turnover_commission || 100)}
                  precision={2}
                  style={{ width: "100%" }}
                  addonAfter="%"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item 
                label={`Profit Share ${!isAdmin ? `(Max: ${user?.settings?.commissionRates?.profit_share || 0}%)` : ''}`}
                name="profit_share"
                rules={[
                  { required: true, message: "Please enter profit share" },
                  !isAdmin && {
                    validator: (_, value) => {
                      const maxValue = user?.settings?.commissionRates?.profit_share || 0;
                      if (value > maxValue) {
                        return Promise.reject(new Error(`Cannot exceed your limit of ${maxValue}%`));
                      }
                      return Promise.resolve();
                    },
                  },
                ].filter(Boolean)}
              >
                <InputNumber
                  min={0}
                  max={isAdmin ? 100 : (user?.settings?.commissionRates?.profit_share || 100)}
                  precision={2}
                  style={{ width: "100%" }}
                  addonAfter="%"
                />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* Limits */}
        <Card title="Limits" size="small" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Max Users" name="maxUsers">
                <InputNumber min={1} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Credit Limit" name="creditLimit">
                <InputNumber
                  min={0}
                  style={{ width: "100%" }}
                  addonBefore="₹"
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Max Deposit" name="maxDeposit">
                <InputNumber
                  min={0}
                  style={{ width: "100%" }}
                  addonBefore="₹"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Max Withdrawal" name="maxWithdrawal">
                <InputNumber
                  min={0}
                  style={{ width: "100%" }}
                  addonBefore="₹"
                />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* Permissions */}
        <Card title="Permissions (Select All That Apply)" size="small">
          {!selectedRole ? (
            <Alert
              message="Select a role first"
              description="Please select an agent role above to see available permissions."
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
          ) : (
            <>
              <Alert
                message="Permission Inheritance Rule"
                description={
                  isAdmin 
                    ? "As admin, you can assign any permission valid for the selected role."
                    : "You can only assign permissions that you currently have. Permissions are filtered based on your own access level and the selected role."
                }
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
              />
              
              {availablePermissions.length === 0 ? (
                <Alert
                  message="No Permissions Available"
                  description="You don't have any permissions that can be assigned to this role, or this role doesn't support any assignable permissions."
                  type="warning"
                  showIcon
                />
              ) : (
                <>
                  {selectedRole === "agent" && (
                    <Alert
                      message="Mandatory Agent Permissions"
                      description="The following permissions are mandatory for agents and cannot be disabled: Create Users, Edit Users, View Users, Reset User Passwords, View Commission, Withdraw Commission, View Transactions, View User Bets, View Reports."
                      type="success"
                      showIcon
                      style={{ marginBottom: 16 }}
                    />
                  )}
                  {availablePermissions.map((group, index) => {
                    // Define mandatory permissions for agents
                    const mandatoryAgentPermissions = [
                      'addUser', 
                      'editUser', 
                      'viewUsers', 
                      'resetUserPassword',
                      'viewCommission', 
                      'withdrawCommission',
                      'viewTransactions', 
                      'viewUserBets', 
                      'viewReports'
                    ];

                    return (
                      <div key={group.group}>
                        <Title level={5}>{group.group}</Title>
                        <Row gutter={[16, 8]}>
                          {group.permissions.map((perm) => {
                            const isMandatoryForAgent = selectedRole === "agent" && mandatoryAgentPermissions.includes(perm.key);
                            
                            return (
                              <Col span={12} key={perm.key}>
                                <Form.Item
                                  name={["permissions", perm.key]}
                                  valuePropName="checked"
                                  style={{ marginBottom: 8 }}
                                >
                                  <Checkbox disabled={isMandatoryForAgent}>
                                    {perm.label}
                                    {isMandatoryForAgent && (
                                      <Tag color="green" style={{ marginLeft: 8 }}>
                                        Mandatory
                                      </Tag>
                                    )}
                                  </Checkbox>
                                </Form.Item>
                              </Col>
                            );
                          })}
                        </Row>
                        {index < availablePermissions.length - 1 && <Divider />}
                      </div>
                    );
                  })}
                </>
              )}
            </>
          )}
        </Card>
      </Form>
    </Modal>
  );
};

export default CreateAgentModal;
