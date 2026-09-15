import React, { useState, useEffect } from "react";
import {
  Card,
  Form,
  Input,
  Select,
  Switch,
  Button,
  message,
  Row,
  Col,
  Divider,
  Tag,
  Space,
  List,
  Badge,
  InputNumber,
  Alert,
  Spin,
} from "antd";
import {
  TeamOutlined,
  SafetyCertificateOutlined,
  SaveOutlined,
  EyeOutlined,
  EditOutlined,
  CopyOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { agentAPI } from "../../services/api";

const { Option } = Select;

const AgentPermissions = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [agents, setAgents] = useState([]);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [agentRole, setAgentRole] = useState(null);

  useEffect(() => {
    // We'll create agents directly, no need to pre-load existing ones for this flow
  }, []);

  const permissionGroups = [
    {
      title: "User Management",
      permissions: [
        { key: "addUser", label: "Create Users" },
        { key: "editUser", label: "Edit Users" },
        { key: "viewUsers", label: "View Users" },
        { key: "resetUserPassword", label: "Reset User Passwords" },
      ],
    },
    {
      title: "Financial Management",
      permissions: [
        { key: "addBalance", label: "Add Balance" },
        { key: "deductBalance", label: "Deduct Balance" },
        { key: "adjustBalance", label: "Adjust Balance" },
        { key: "approveDeposit", label: "Approve Deposits" },
        { key: "approveWithdrawal", label: "Approve Withdrawals" },
      ],
    },
    {
      title: "Agent Management",
      permissions: [
        { key: "createSubAgents", label: "Create Sub-Agents" },
        { key: "viewSubAgents", label: "View Sub-Agents" },
        { key: "setSubAgentCommission", label: "Set Sub-Agent Commission" },
      ],
    },
    {
      title: "Reports & Analytics",
      permissions: [
        { key: "viewTransactions", label: "View Transactions" },
        { key: "viewUserBets", label: "View User Bets" },
        { key: "viewCommission", label: "View Commission" },
        { key: "viewReports", label: "View Reports" },
        { key: "cancelBets", label: "Cancel Bets" },
      ],
    },
    {
      title: "Commission Management",
      permissions: [
        { key: "withdrawCommission", label: "Withdraw Commission" },
      ],
    },
  ];

  const roleDefaults = {
    master_agent: {
      defaultPermissions: [
        "addUser",
        "editUser",
        "viewUsers",
        "resetUserPassword",
        "addBalance",
        "deductBalance",
        "adjustBalance",
        "approveDeposit",
        "approveWithdrawal",
        "createSubAgents",
        "viewSubAgents",
        "setSubAgentCommission",
        "viewTransactions",
        "viewUserBets",
        "viewCommission",
        "viewReports",
        "cancelBets",
        "withdrawCommission",
      ],
      defaultLimits: {
        maxDeposit: 500000,
        maxUsers: 1000,
      },
    },
    agent: {
      defaultPermissions: [
        "addUser",
        "editUser",
        "viewUsers",
        "resetUserPassword",
        "addBalance",
        "deductBalance",
        "adjustBalance",
        "createSubAgents",
        "viewSubAgents",
        "setSubAgentCommission",
        "viewTransactions",
        "viewUserBets",
        "viewCommission",
        "viewReports",
        "withdrawCommission",
      ],
      defaultLimits: {
        maxDeposit: 100000,
        maxUsers: 500,
      },
    },
    sub_agent: {
      defaultPermissions: [
        "addUser",
        "editUser",
        "viewUsers",
        "addBalance",
        "deductBalance",
        "viewTransactions",
        "viewUserBets",
        "viewCommission",
      ],
      defaultLimits: {
        maxDeposit: 50000,
        maxUsers: 200,
      },
    },
  };

  const handleRoleChange = (role) => {
    setAgentRole(role);
    // Reset permissions and set default ones for the selected role
    const defaults = roleDefaults[role];
    form.setFieldsValue({
      permissions: defaults.defaultPermissions.reduce((acc, perm) => {
        acc[perm] = true;
        return acc;
      }, {}),
      limits: defaults.defaultLimits,
    });
  };

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      // Validate role is selected
      if (!values.role) {
        message.error("Please select an agent role");
        setLoading(false);
        return;
      }

      // Build permissions object
      const permissions = {};
      const allPermissions = permissionGroups.flatMap((group) =>
        group.permissions.map((p) => p.key),
      );

      allPermissions.forEach((perm) => {
        permissions[perm] = values.permissions?.[perm] || false;
      });

      const agentData = {
        fullName: values.fullName,
        email: values.email.toLowerCase(),
        phone: values.phone,
        password: values.password,
        role: values.role,
        permissions: permissions,
        limits: {
          maxDeposit: Number(values.limits?.maxDeposit || 0),
          maxUsers: Number(values.limits?.maxUsers || 0),
        },
        isActive: true,
      };

      console.log("Creating agent with data:", agentData);

      // Create agent using the appropriate endpoint based on role
      let response;
      if (values.role === "master_agent") {
        response = await agentAPI.createAgent(agentData);
      } else {
        // For agent and sub_agent, we still use the same endpoint but with role in body
        response = await agentAPI.createAgent(agentData);
      }

      console.log("Create agent response:", response);

      // Extract agent ID from the response - the endpoint returns data.agent._id
      const agentId = response.data?.data?.agent?._id;

      if (!agentId) {
        console.error("Response structure:", response.data);
        message.error(
          "Failed to get agent ID from response. Please check server logs.",
        );
        setLoading(false);
        return;
      }

      // Update agent permissions if needed
      const permissionsData = {
        permissions: permissions,
        limits: {
          maxDeposit: Number(values.limits?.maxDeposit || 0),
          maxUsers: Number(values.limits?.maxUsers || 0),
        },
        isActive: true,
      };

      await agentAPI.updateAgentPermissions(agentId, permissionsData);

      message.success(
        `${values.role.replace("_", " ")} created successfully with permissions`,
      );
      form.resetFields();
      setAgentRole(null);
    } catch (error) {
      console.error("Failed to create agent:", error);
      message.error(
        error.response?.data?.message ||
          "Failed to create agent. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card
        title={
          <div>
            <TeamOutlined /> Create Agent with Permissions
          </div>
        }
        bordered={true}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          className="space-y-6"
        >
          {/* Basic Agent Information */}
          <Card
            type="inner"
            title="Basic Information"
            size="small"
            className="mb-6"
          >
            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="fullName"
                  label="Full Name"
                  rules={[
                    { required: true, message: "Please enter full name" },
                  ]}
                >
                  <Input placeholder="Enter agent's full name" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="email"
                  label="Email"
                  rules={[
                    { required: true, message: "Please enter email" },
                    { type: "email", message: "Please enter valid email" },
                  ]}
                >
                  <Input placeholder="Enter email address" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="phone"
                  label="Phone Number"
                  rules={[
                    { required: true, message: "Please enter phone number" },
                  ]}
                >
                  <Input placeholder="Enter phone number" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="password"
                  label="Password"
                  rules={[{ required: true, message: "Please enter password" }]}
                >
                  <Input.Password placeholder="Enter password" />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              name="role"
              label="Agent Role"
              rules={[{ required: true, message: "Please select a role" }]}
            >
              <Select
                placeholder="Select agent role"
                onChange={handleRoleChange}
              >
                <Option value="master_agent">Master Agent</Option>
                <Option value="agent">Agent</Option>
                <Option value="sub_agent">Sub Agent</Option>
              </Select>
            </Form.Item>

            {agentRole && (
              <Alert
                message={`Role: ${agentRole.replace("_", " ").toUpperCase()}`}
                description={`Default permissions and limits applied for ${agentRole.replace("_", " ")} role`}
                type="info"
                showIcon
                className="mb-4"
              />
            )}
          </Card>

          {/* Permissions */}
          <Card
            type="inner"
            title={
              <div>
                <SafetyCertificateOutlined /> Permissions
              </div>
            }
            size="small"
          >
            <Form.Item name="permissions">
              <div className="space-y-4">
                {permissionGroups.map((group) => (
                  <div key={group.title}>
                    <h4 className="font-semibold text-base mb-3">
                      {group.title}
                    </h4>
                    <Row gutter={[16, 16]}>
                      {group.permissions.map((permission) => (
                        <Col xs={24} sm={12} lg={8} key={permission.key}>
                          <Form.Item
                            name={["permissions", permission.key]}
                            valuePropName="checked"
                            noStyle
                          >
                            <Switch />
                          </Form.Item>
                          <span className="ml-3 text-sm">
                            {permission.label}
                          </span>
                        </Col>
                      ))}
                    </Row>
                    <Divider className="my-4" />
                  </div>
                ))}
              </div>
            </Form.Item>
          </Card>

          {/* Limits */}
          <Card type="inner" title="Operational Limits" size="small">
            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item
                  name={["limits", "maxDeposit"]}
                  label="Max Deposit Amount"
                  rules={[
                    { required: true, message: "Please enter max deposit" },
                  ]}
                >
                  <InputNumber
                    className="w-full"
                    min={0}
                    formatter={(value) =>
                      `৳ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                    }
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  name={["limits", "maxUsers"]}
                  label="Max Users"
                  rules={[
                    { required: true, message: "Please enter max users" },
                  ]}
                >
                  <InputNumber className="w-full" min={0} />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          {/* Submit Button */}
          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                icon={<PlusOutlined />}
                size="large"
              >
                Create Agent
              </Button>
              <Button
                onClick={() => {
                  form.resetFields();
                  setAgentRole(null);
                }}
              >
                Reset
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default AgentPermissions;
