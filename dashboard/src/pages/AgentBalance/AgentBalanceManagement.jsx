import React, { useState, useEffect } from "react";
import {
  Card,
  Form,
  Input,
  InputNumber,
  Select,
  Button,
  message,
  Table,
  Tag,
  Modal,
  Descriptions,
  Statistic,
  Row,
  Col,
  Space,
  Tabs,
  Alert,
  Divider,
} from "antd";
import {
  PlusOutlined,
  MinusOutlined,
  SwapOutlined,
  DollarOutlined,
  TeamOutlined,
  UserOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import { agentBalanceAPI, userAPI, agentAPI } from "../../services/api";
import { formatCurrency, formatDate } from "../../utils/helpers";
import { useSelector } from "react-redux";
import { usePermissions } from "../../hooks/usePermissions";

const { Option } = Select;
const { TabPane } = Tabs;

const AgentBalanceManagement = () => {
  const [activeTab, setActiveTab] = useState("addFunds");
  const [agents, setAgents] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [walletOverview, setWalletOverview] = useState({});
  const [myWalletBalance, setMyWalletBalance] = useState(0);

  const { user: currentUser } = useSelector((state) => state.auth);
  const { isAdmin, can } = usePermissions();

  useEffect(() => {
    loadData();
    if (!isAdmin) {
      loadMyWalletBalance();
    }
  }, [isAdmin]);

  const loadMyWalletBalance = async () => {
    try {
      // For agents, load their AgentSettings wallet balance
      const response = await agentBalanceAPI.getMyWalletBalance();
      setMyWalletBalance(response.data?.data?.wallet?.balance || 0);
    } catch (error) {
      console.error("Failed to load wallet balance:", error);
    }
  };

  const loadData = async () => {
    try {
      if (isAdmin) {
        // Admin loads all agents
        const [agentsRes, overviewRes] = await Promise.all([
          agentAPI.getAgents(),
          agentBalanceAPI.getAdminWalletOverview(),
        ]);

        console.log("Admin agents response:", agentsRes.data);
        const agentsData = agentsRes.data?.data?.agents || [];
        console.log("Loaded agents data:", agentsData);
        setAgents(agentsData);

        const totalAgentBalance = agentsData.reduce((sum, agent) => {
          return sum + (agent.settings?.wallet?.balance || 0);
        }, 0);

        const activeAgentsCount = agentsData.filter(
          (agent) => agent.isActive,
        ).length;
        const walletData = overviewRes.data?.data || {};

        setWalletOverview({
          platformBalance: walletData.wallet?.balance || 0,
          totalAgentBalance: totalAgentBalance,
          activeAgents: activeAgentsCount,
        });
      } else {
        // Agent loads only their referredBy agents/sub-agents
        const agentsRes = await agentAPI.getDownlineAgents({
          role: "master_agent,agent,sub_agent",
          limit: 1000,
        });
        console.log("Agent downline response:", agentsRes.data);
        const agentsData =
          agentsRes.data?.data?.agents || agentsRes.data?.agents || [];
        console.log("Loaded downline agents:", agentsData);
        setAgents(agentsData);

        // Load wallet balance
        await loadMyWalletBalance();
      }

      // Load users (referredBy chain for agents, all for admin)
      await loadAllUsers();
    } catch (error) {
      console.error("Failed to load data:", error);
      message.error("Failed to load data");
      setAgents([]);
      setWalletOverview({
        platformBalance: 0,
        totalAgentBalance: 0,
        activeAgents: 0,
      });
    }
  };

  const loadAllUsers = async () => {
    try {
      // Admin loads all users, agents load only their referredBy users
      const response = isAdmin
        ? await userAPI.getUsers({ page: 1, limit: 1000 })
        : await userAPI.getDownlineUsers({ page: 1, limit: 1000 });

      const usersData =
        response.data?.data?.users || response.data?.users || [];
      console.log("Loaded users:", usersData);
      setUsers(usersData);
    } catch (error) {
      console.error("Failed to load users:", error);
      message.error("Failed to load users");
    }
  };

  const handleAddFunds = async (values) => {
    setLoading(true);
    try {
      // Check if agent has sufficient balance
      if (!isAdmin && myWalletBalance < values.amount) {
        message.error(
          `Insufficient balance. You have ${formatCurrency(myWalletBalance)} but trying to transfer ${formatCurrency(values.amount)}`,
        );
        setLoading(false);
        return;
      }

      if (isAdmin) {
        // Admin always adds to agents only - map recipientId to agentId
        await agentBalanceAPI.addFundsToAgent({
          agentId: values.recipientId,
          amount: values.amount,
          notes: values.notes,
        });
      } else {
        // Agent can add funds to both agents and users
        if (values.recipientType === "user") {
          // Add funds to user using adjustBalance endpoint
          await userAPI.adjustBalance({
            userId: values.recipientId,
            amount: values.amount,
            type: "add",
            reason: values.notes || "Funds added by agent",
          });
        } else {
          // Add funds to agent using transfer endpoint
          await agentBalanceAPI.transferToSubAgent({
            subAgentId: values.recipientId,
            amount: values.amount,
            notes: values.notes,
          });
        }
      }

      message.success("Funds added successfully");
      loadData();
      if (!isAdmin) loadMyWalletBalance();
    } catch (error) {
      message.error(
        "Failed to add funds: " +
          (error.response?.data?.message || "Unknown error"),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDeductFunds = async (values) => {
    setLoading(true);
    try {
      if (isAdmin) {
        await agentBalanceAPI.deductFundsFromAgent(values);
      } else {
        // Agent uses balance adjustment endpoint
        await agentBalanceAPI.transferToSubAgent({
          subAgentId: values.agentId,
          amount: -Math.abs(values.amount), // Negative for deduction
          notes: values.notes,
        });
      }

      message.success("Funds deducted successfully");
      loadData();
      if (!isAdmin) loadMyWalletBalance();
    } catch (error) {
      message.error(
        "Failed to deduct funds: " +
          (error.response?.data?.message || "Unknown error"),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleTransferToSubAgent = async (values) => {
    setLoading(true);
    try {
      // Check if agent has sufficient balance
      if (!isAdmin && myWalletBalance < values.amount) {
        message.error(
          `Insufficient balance. You have ${formatCurrency(myWalletBalance)} but trying to transfer ${formatCurrency(values.amount)}`,
        );
        setLoading(false);
        return;
      }

      await agentBalanceAPI.transferToSubAgent(values);
      message.success("Transfer completed successfully");
      loadData();
      if (!isAdmin) loadMyWalletBalance();
    } catch (error) {
      message.error(
        "Transfer failed: " +
          (error.response?.data?.message || "Unknown error"),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDeductFromUser = async (values) => {
    setLoading(true);
    try {
      if (isAdmin) {
        // Admin uses admin endpoint
        await userAPI.adjustBalance(values.userId, {
          amount: -Math.abs(values.amount),
          walletType: "main",
          reason: values.notes || "Admin deduction",
        });
      } else {
        // Agent uses user management endpoint
        await userAPI.adjustBalance({
          userId: values.userId,
          amount: Math.abs(values.amount),
          type: "deduct",
          reason: values.notes || "Balance deduction",
        });
      }

      message.success("Amount deducted from user successfully");
      loadAllUsers();
      if (!isAdmin) loadMyWalletBalance();
    } catch (error) {
      message.error(
        "Deduction failed: " +
          (error.response?.data?.message || "Unknown error"),
      );
    } finally {
      setLoading(false);
    }
  };

  const BalanceStats = () => (
    <Row gutter={[16, 16]}>
      {isAdmin ? (
        <>
          <Col xs={24} sm={8}>
            <Card size="small">
              <Statistic
                title="Platform Balance"
                value={walletOverview.platformBalance || 0}
                precision={2}
                prefix={<DollarOutlined />}
                suffix="৳"
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card size="small">
              <Statistic
                title="Total Agent Balance"
                value={walletOverview.totalAgentBalance || 0}
                precision={2}
                prefix={<TeamOutlined />}
                suffix="৳"
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card size="small">
              <Statistic
                title="Active Agents"
                value={walletOverview.activeAgents || 0}
                prefix={<UserOutlined />}
              />
            </Card>
          </Col>
        </>
      ) : (
        <>
          <Col xs={24} sm={8}>
            <Card size="small">
              <Statistic
                title="My Wallet Balance"
                value={myWalletBalance || 0}
                precision={2}
                prefix={<WalletOutlined />}
                suffix="৳"
                valueStyle={{
                  color: myWalletBalance > 0 ? "#3f8600" : "#cf1322",
                }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card size="small">
              <Statistic
                title="Sub Agents"
                value={agents.length || 0}
                prefix={<TeamOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card size="small">
              <Statistic
                title="Users Under Me"
                value={users.length || 0}
                prefix={<UserOutlined />}
              />
            </Card>
          </Col>
        </>
      )}
    </Row>
  );

  return (
    <div className="space-y-6">
      {!isAdmin && myWalletBalance === 0 && (
        <Alert
          message="Insufficient Balance"
          description="You have no balance in your wallet. You cannot transfer funds or create sub-agents with initial balance."
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {!isAdmin && !can.addBalance && !can.deductBalance && (
        <Alert
          message="Permission Required"
          description="You do not have financial management permissions. Contact admin to enable these permissions."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <BalanceStats />

      <Card
        title={
          isAdmin
            ? "Agent Balance Management"
            : "Financial Management (ReferredBy Chain Only)"
        }
      >
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          {/* Add Funds to Agent/User */}
          <TabPane
            tab={isAdmin ? "Add Funds to Agent" : "Add Funds"}
            key="addFunds"
          >
            <BalanceActionForm
              title={isAdmin ? "Add Funds to Agent" : "Add Funds to Agent/User"}
              onSubmit={handleAddFunds}
              loading={loading}
              agents={agents}
              users={users}
              actionType="add"
              icon={<PlusOutlined />}
            />
          </TabPane>

          {/* Deduct Funds from Agent */}
          <TabPane tab="Deduct Funds from Agent" key="deductFunds">
            <BalanceActionForm
              title="Deduct Funds from Agent"
              onSubmit={handleDeductFunds}
              loading={loading}
              agents={agents}
              actionType="deduct"
              icon={<MinusOutlined />}
            />
          </TabPane>

          {/* Transfer to Sub-Agent */}
          <TabPane tab="Transfer to Sub-Agent" key="transferSubAgent">
            <TransferSubAgentForm
              onSubmit={handleTransferToSubAgent}
              loading={loading}
              agents={agents}
            />
          </TabPane>

          {/* Deduct from User */}
          <TabPane tab="Deduct from User" key="deductUser">
            <DeductUserForm
              onSubmit={handleDeductFromUser}
              loading={loading}
              users={users}
            />
          </TabPane>
        </Tabs>
      </Card>

      {/* Recent Transactions Table */}
      <Card title="Recent Balance Transactions">
        <TransactionHistory />
      </Card>
    </div>
  );
};

// Balance Action Form Component
const BalanceActionForm = ({
  title,
  onSubmit,
  loading,
  agents,
  users,
  actionType,
  icon,
}) => {
  const [form] = Form.useForm();
  const { isAdmin } = usePermissions();
  const [recipientType, setRecipientType] = useState("agent");

  // Ensure agents and users are always arrays
  const safeAgents = Array.isArray(agents) ? agents : [];
  const safeUsers = Array.isArray(users) ? users : [];

  console.log("BalanceActionForm - agents:", safeAgents.length, safeAgents);
  console.log("BalanceActionForm - users:", safeUsers.length, safeUsers);
  console.log(
    "BalanceActionForm - isAdmin:",
    isAdmin,
    "recipientType:",
    recipientType,
  );

  const handleRecipientTypeChange = (value) => {
    setRecipientType(value);
    form.setFieldsValue({ recipientId: undefined });
  };

  const handleFormSubmit = (values) => {
    // Add recipientType to values for proper routing
    onSubmit({ ...values, recipientType });
  };

  return (
    <div className="max-w-2xl">
      <Alert
        message={title}
        description={
          actionType === "add"
            ? isAdmin
              ? "This will add funds to the selected agent's wallet from the platform balance."
              : "This will transfer funds from YOUR wallet to the selected recipient (agent or user). You must have sufficient balance."
            : isAdmin
              ? "This will deduct funds from the selected agent's wallet."
              : "This will recover funds from the selected agent's wallet to YOUR wallet."
        }
        type={actionType === "add" ? "success" : "warning"}
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Form form={form} layout="vertical" onFinish={handleFormSubmit}>
        {!isAdmin && actionType === "add" && (
          <Form.Item
            name="recipientType"
            label="Recipient Type"
            initialValue="agent"
            rules={[
              { required: true, message: "Please select recipient type" },
            ]}
          >
            <Select
              placeholder="Select recipient type"
              onChange={handleRecipientTypeChange}
            >
              <Option value="agent">Agent / Sub-Agent</Option>
              <Option value="user">User</Option>
            </Select>
          </Form.Item>
        )}

        <Form.Item
          name="recipientId"
          label={
            isAdmin
              ? "Select Agent"
              : recipientType === "user"
                ? "Select User"
                : "Select Agent"
          }
          rules={[
            {
              required: true,
              message: `Please select ${recipientType === "user" ? "a user" : "an agent"}`,
            },
          ]}
        >
          <Select
            placeholder={`Select ${recipientType === "user" ? "user" : "agent"}`}
            showSearch
            optionFilterProp="children"
            filterOption={(input, option) =>
              option.children
                .toString()
                .toLowerCase()
                .includes(input.toLowerCase())
            }
            disabled={
              isAdmin || recipientType === "agent"
                ? safeAgents.length === 0
                : safeUsers.length === 0
            }
          >
            {isAdmin || recipientType === "agent"
              ? safeAgents.map((agent) => (
                  <Option key={agent._id} value={agent._id}>
                    <div className="flex justify-between items-center">
                      <span>
                        {agent.fullName} ({agent.email})
                      </span>
                      <Tag color="blue">
                        {formatCurrency(agent.settings?.wallet?.balance || 0)}
                      </Tag>
                    </div>
                  </Option>
                ))
              : safeUsers.map((user) => (
                  <Option key={user._id} value={user._id}>
                    <div className="flex justify-between items-center">
                      <span>
                        {user.fullName} ({user.email})
                      </span>
                      <Tag color="green">
                        {formatCurrency(user.wallet?.main || 0)}
                      </Tag>
                    </div>
                  </Option>
                ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="amount"
          label="Amount"
          rules={[
            { required: true, message: "Please enter amount" },
            {
              validator: (_, value) => {
                if (value && value > 0) return Promise.resolve();
                return Promise.reject(
                  new Error("Amount must be greater than 0"),
                );
              },
            },
          ]}
        >
          <InputNumber
            placeholder="Enter amount"
            className="w-full"
            min={0}
            step={100}
            formatter={(value) =>
              `৳ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
            }
          />
        </Form.Item>

        <Form.Item
          name="notes"
          label="Notes"
          rules={[{ required: true, message: "Please enter notes" }]}
        >
          <Input.TextArea
            placeholder="Enter reason for this transaction"
            rows={3}
          />
        </Form.Item>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            icon={icon}
            danger={actionType === "deduct"}
            className="w-full"
          >
            {title}
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

// Transfer to Sub-Agent Form
const TransferSubAgentForm = ({ onSubmit, loading, agents }) => {
  const [form] = Form.useForm();
  const { isAdmin } = usePermissions();

  // Ensure agents is always an array
  const safeAgents = Array.isArray(agents) ? agents : [];

  return (
    <div className="max-w-2xl">
      <Alert
        message="Transfer Balance to Sub-Agent"
        description={
          isAdmin
            ? "This will transfer funds from platform balance to the selected sub-agent's wallet."
            : "This will transfer funds from YOUR wallet to the selected sub-agent's wallet. The amount will be deducted from your balance."
        }
        type="info"
        showIcon
        className="mb-4"
      />

      <Form form={form} layout="vertical" onFinish={onSubmit}>
        <Form.Item
          name="subAgentId"
          label="Select Sub-Agent"
          rules={[{ required: true, message: "Please select a sub-agent" }]}
        >
          <Select
            placeholder="Select sub-agent"
            showSearch
            disabled={safeAgents.length === 0}
          >
            {safeAgents
              .filter((agent) => agent.role === "sub_agent")
              .map((agent) => (
                <Option key={agent._id} value={agent._id}>
                  {agent.fullName} -{" "}
                  {formatCurrency(agent.settings?.wallet?.balance || 0)}
                </Option>
              ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="amount"
          label="Transfer Amount"
          rules={[
            { required: true, message: "Please enter amount" },
            {
              validator: (_, value) => {
                if (value && value > 0) return Promise.resolve();
                return Promise.reject(
                  new Error("Amount must be greater than 0"),
                );
              },
            },
          ]}
        >
          <InputNumber
            placeholder="Enter amount to transfer"
            className="w-full"
            min={0}
            step={100}
            formatter={(value) =>
              `৳ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
            }
          />
        </Form.Item>

        <Form.Item name="notes" label="Transfer Notes">
          <Input.TextArea
            placeholder="Enter purpose of this transfer"
            rows={3}
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
            Transfer to Sub-Agent
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

// Deduct from User Form
const DeductUserForm = ({ onSubmit, loading, users }) => {
  const [form] = Form.useForm();
  const { isAdmin } = usePermissions();

  return (
    <div className="max-w-2xl">
      <Alert
        message="Deduct Balance from User"
        description={
          isAdmin
            ? "Admin can deduct funds from any user's main wallet balance. This does not add to your wallet."
            : "This will deduct funds from the user's wallet and return the amount to YOUR wallet. You can only deduct from users you created (referredBy chain)."
        }
        type="warning"
        showIcon
        className="mb-4"
      />

      <Form form={form} layout="vertical" onFinish={onSubmit}>
        <Form.Item
          name="userId"
          label="Select User"
          rules={[{ required: true, message: "Please select a user" }]}
        >
          <Select placeholder="Select user" showSearch optionFilterProp="label">
            {users.map((user) => (
              <Option
                key={user._id}
                value={user._id}
                label={`${user.fullName} ${user.email}`}
              >
                <div className="flex justify-between items-center">
                  <span>
                    {user.fullName} ({user.email})
                  </span>
                  <Tag color="blue">
                    {formatCurrency(user.wallet?.main || 0)}
                  </Tag>
                </div>
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="amount"
          label="Deduction Amount"
          rules={[
            { required: true, message: "Please enter amount" },
            {
              validator: (_, value) => {
                if (value && value > 0) return Promise.resolve();
                return Promise.reject(
                  new Error("Amount must be greater than 0"),
                );
              },
            },
          ]}
        >
          <InputNumber
            placeholder="Enter amount to deduct"
            className="w-full"
            min={0}
            step={100}
            formatter={(value) =>
              `৳ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
            }
          />
        </Form.Item>

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

        <Form.Item
          name="notes"
          label="Reason for Deduction"
          rules={[{ required: true, message: "Please enter reason" }]}
        >
          <Input.TextArea
            placeholder="Enter reason for this deduction"
            rows={3}
          />
        </Form.Item>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            icon={<MinusOutlined />}
            danger
            className="w-full"
          >
            Deduct from User
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

// Transaction History Component
const TransactionHistory = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const { isAdmin } = usePermissions();

  useEffect(() => {
    loadTransactions();
  }, [isAdmin]);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      if (isAdmin) {
        // Admin loads from wallet overview
        const response = await agentBalanceAPI.getAdminWalletOverview();
        console.log("Admin wallet overview:", response.data);

        // Get ledger entries from the response
        const ledgerEntries = response.data?.data?.wallet?.ledger || [];

        // Transform ledger entries to table format
        const formattedTransactions = ledgerEntries.map((entry, index) => ({
          key: entry._id || index,
          transactionId: entry.referenceId || `TXN-${entry._id || index}`,
          type: entry.type,
          description: entry.description,
          amount: Math.abs(entry.amount),
          createdBy: entry.createdBy,
          createdAt: entry.createdAt,
          status: "completed",
        }));

        // Sort by date (newest first)
        formattedTransactions.sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
        );

        setTransactions(formattedTransactions);
      } else {
        // Agent loads their own transactions
        const response = await agentBalanceAPI.getMyTransactions();
        console.log("Agent transactions:", response.data);

        // Get transactions from the response
        const txList = response.data?.data?.transactions || [];

        // Transform transactions to table format
        const formattedTransactions = txList.map((tx, index) => ({
          key: tx._id || index,
          transactionId: tx.referenceId || `TXN-${tx._id || index}`,
          type: tx.type,
          description: tx.description,
          amount: Math.abs(tx.amount),
          createdAt: tx.createdAt,
          status: tx.status || "completed",
        }));

        setTransactions(formattedTransactions);
      }
    } catch (error) {
      console.error("Failed to load transactions:", error);
      // Only show error for actual server errors, not permission issues
      if (error.response?.status !== 403) {
        message.error("Failed to load transactions");
      }
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: "Transaction ID",
      dataIndex: "transactionId",
      key: "transactionId",
      render: (id) => <span className="font-mono text-xs">{id}</span>,
    },
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
      render: (type, record) => {
        // Determine display type and color based on transaction type
        let displayType = type;
        let color = "default";

        if (type === "bet") {
          displayType = "Player Loss";
          color = "red";
        } else if (type === "win") {
          displayType = "Player Win";
          color = "green";
        } else if (type === "agent_transfer") {
          displayType = "Agent Transfer";
          color = "blue";
        } else if (type === "deposit") {
          displayType = "Deposit";
          color = "green";
        } else if (type === "withdrawal") {
          displayType = "Withdrawal";
          color = "orange";
        } else if (type === "commission") {
          displayType = "Commission";
          color = "purple";
        } else {
          displayType = type.replace("_", " ").toUpperCase();
        }

        return (
          <Tag color={color}>
            {displayType}
          </Tag>
        );
      },
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      ellipsis: true,
      render: (description, record) => {
        // Provide clear description for bet transactions
        if (record.type === "bet") {
          return description || `Player loss from betting activity`;
        } else if (record.type === "win") {
          return description || `Player win from betting activity`;
        }
        return description || "-";
      },
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      render: (amount, record) => {
        // Show amount with appropriate sign for clarity
        const absAmount = Math.abs(amount);
        const isDebit = ["bet", "withdrawal", "transfer"].includes(record.type);
        
        return (
          <span style={{ color: isDebit ? '#cf1322' : '#3f8600' }}>
            {isDebit ? '- ' : '+ '}
            {formatCurrency(absAmount)}
          </span>
        );
      },
    },
    {
      title: "Date",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date) => formatDate(date),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => (
        <Tag color={status === "completed" ? "green" : "orange"}>
          {status.toUpperCase()}
        </Tag>
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={transactions}
      loading={loading}
      scroll={{ x: 800 }}
      pagination={{ pageSize: 10 }}
    />
  );
};

export default AgentBalanceManagement;
