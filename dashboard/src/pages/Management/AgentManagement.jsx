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
  Row,
  Col,
  Statistic,
  Tooltip,
  Switch,
  Alert,
  Tabs,
  Descriptions,
  Tree,
  Spin,
} from "antd";
import {
  TeamOutlined,
  UserAddOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  DollarOutlined,
  SettingOutlined,
  PlusOutlined,
  ApartmentOutlined,
  BarChartOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useDispatch, useSelector } from "react-redux";
import { agentAPI, adminAPI, userAPI, authAPI } from "../../services/api";
import { formatCurrency, formatDate, formatNumber } from "../../utils/helpers";
import usePermissions from "../../hooks/usePermissions";
import { PERMISSIONS, ROLES } from "../../utils/rolePermissions";
import CreateAgentModal from "../../components/Agent/CreateAgentModal";
import { updateUser } from "../../store/slices/authSlice";

const { Option } = Select;
const { TabPane } = Tabs;

const AgentManagement = () => {
  const dispatch = useDispatch();
  const { user: currentUser } = useSelector((state) => state.auth);
  const { can, role, isAdmin, isMasterAgent, isSubAgent } = usePermissions();
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentUserSettings, setCurrentUserSettings] = useState(null);
  const [stats, setStats] = useState({
    totalAgents: 0,
    masterAgents: 0,
    subAgents: 0,
    regularAgents: 0,
  });
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [permissionModalVisible, setPermissionModalVisible] = useState(false);
  const [commissionModalVisible, setCommissionModalVisible] = useState(false);
  const [hierarchyData, setHierarchyData] = useState([]);
  const [hierarchyLoading, setHierarchyLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("list");
  const [updatingPermissions, setUpdatingPermissions] = useState(false);
  const [updatingCommission, setUpdatingCommission] = useState(false);
  const [form] = Form.useForm();
  const [permissionForm] = Form.useForm();
  const [commissionForm] = Form.useForm();

  useEffect(() => {
    loadAgents();
    loadCurrentUserSettings();
  }, []);

  const loadCurrentUserSettings = async () => {
    try {
      // Load current user's full data including settings
      if (!isAdmin && currentUser?._id) {
        const response = await authAPI.getCurrentUser();
        const userData = response.data?.data || response.data?.user;
        
        // Update Redux store with fresh user data including commission rates
        if (userData && userData.settings) {
          // Update the auth state with the complete user data
          dispatch(updateUser(userData));
          
          setCurrentUserSettings({
            commissionRates: userData.commissionRates || userData.settings?.commissionRates || {}
          });
        }
      }
    } catch (error) {
      console.error("Failed to load current user settings:", error);
    }
  };

  useEffect(() => {
    if (activeTab === "hierarchy" && agents.length > 0) {
      loadAgentHierarchy();
    }
  }, [activeTab, agents]);

  const loadAgents = async () => {
    setLoading(true);
    try {
      let response;

      // Admin uses different endpoint than agents
      if (isAdmin) {
        response = await agentAPI.getAgents();
        const agentsData = response.data?.data?.agents || [];
        const agentsArray = Array.isArray(agentsData) ? agentsData : [];
        setAgents(agentsArray);

        // Calculate stats
        const totalAgents = response.data?.data?.total || agentsArray.length;
        const masterAgents = agentsArray.filter(
          (agent) => agent.role === "master_agent",
        ).length;
        const subAgents = agentsArray.filter(
          (agent) => agent.role === "sub_agent",
        ).length;
        const regularAgents = agentsArray.filter(
          (agent) => agent.role === "agent",
        ).length;
        setStats({
          totalAgents,
          masterAgents,
          subAgents,
          regularAgents,
        });
      } else {
        // Agents use downline endpoint
        response = await agentAPI.getDownlineAgents();
        const agentsData = response.data?.data?.agents || [];
        const agentsArray = Array.isArray(agentsData) ? agentsData : [];
        setAgents(agentsArray);

        // Calculate stats
        const totalAgents = response.data?.data?.total || agentsArray.length;
        const masterAgents = agentsArray.filter(
          (agent) => agent.role === "master_agent",
        ).length;
        const subAgents = agentsArray.filter(
          (agent) => agent.role === "sub_agent",
        ).length;
        const regularAgents = agentsArray.filter(
          (agent) => agent.role === "agent",
        ).length;
        setStats({
          totalAgents,
          masterAgents,
          subAgents,
          regularAgents,
        });
      }
    } catch (error) {
      console.error("Failed to load agents:", error);
      message.error(
        error.response?.data?.message ||
          "Failed to load agents. Please try again.",
      );
      setAgents([]);
      setStats({
        totalAgents: 0,
        masterAgents: 0,
        subAgents: 0,
        regularAgents: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAgentHierarchy = async () => {
    setHierarchyLoading(true);
    try {
      let allAgents = [];
      let allUsers = [];

      if (isAdmin) {
        // Admin: Use optimized hierarchy endpoint
        const hierarchyResponse = await agentAPI.getAdminHierarchy();
        allAgents = hierarchyResponse.data?.data?.agents || [];
        allUsers = hierarchyResponse.data?.data?.users || [];
      } else {
        // Master Agent/Agent: Use the complete hierarchy endpoint
        console.log("Loading complete hierarchy for:", currentUser._id);
        const hierarchyResponse = await agentAPI.getCompleteHierarchy({
          includeUsers: true,
        });

        allAgents = hierarchyResponse.data?.data?.agents || [];
        allUsers = hierarchyResponse.data?.data?.users || [];
      }

      console.log("Hierarchy data loaded:", {
        totalAgents: allAgents.length,
        totalUsers: allUsers.length,
        currentUserId: currentUser._id,
      });

      // Log sample data for debugging
      if (allAgents.length > 0) {
        console.log("Sample agent:", allAgents[0]);
      }
      if (allUsers.length > 0) {
        console.log("Sample user:", allUsers[0]);
      }

      let hierarchyTree = [];

      if (isAdmin) {
        // Admin: Build hierarchy starting from master agents
        const masterAgents = allAgents.filter(
          (agent) => agent.role === ROLES.MASTER_AGENT,
        );

        hierarchyTree = masterAgents.map((masterAgent) =>
          buildHierarchyNode(masterAgent, allAgents, allUsers),
        );
      } else {
        // Master Agent/Agent: Build hierarchy starting from current user
        const currentAgentData = {
          _id: currentUser._id,
          fullName: currentUser.fullName,
          email: currentUser.email,
          phone: currentUser.phone,
          role: currentUser.role,
          settings: currentUser.settings,
        };

        console.log("Building hierarchy for:", currentAgentData);
        hierarchyTree = [
          buildHierarchyNode(currentAgentData, allAgents, allUsers),
        ];
      }

      console.log("Hierarchy tree built:", hierarchyTree);
      setHierarchyData(hierarchyTree);
    } catch (error) {
      console.error("Failed to load agent hierarchies:", error);
      message.error("Failed to load agent hierarchy");
    } finally {
      setHierarchyLoading(false);
    }
  };

  // Build hierarchy node recursively based on referredBy
  const buildHierarchyNode = (agent, allAgents, allUsers = []) => {
    if (!agent) return null;

    console.log("Building node for:", agent.fullName, agent._id);

    // Find all agents/sub-agents referred by this agent
    const childAgents = allAgents.filter((a) => {
      // Compare as strings to handle both ObjectId and string formats
      const matches = String(a.referredBy) === String(agent._id);
      if (matches) {
        console.log(`  Found child agent: ${a.fullName} (${a.role})`);
      }
      return matches;
    });

    // Find all users referred by this agent
    const childUsers = allUsers.filter((u) => {
      const matches = String(u.referredBy) === String(agent._id);
      if (matches) {
        console.log(`  Found child user: ${u.fullName}`);
      }
      return matches;
    });

    console.log(
      `  Total children: ${childAgents.length} agents, ${childUsers.length} users`,
    );

    // Build children nodes
    const agentChildren = childAgents.map((child) =>
      buildHierarchyNode(child, allAgents, allUsers),
    );

    // Build user nodes
    const userChildren = childUsers.map((user) => ({
      title: user.fullName || user.name || "Unknown User",
      key: user._id,
      role: "user",
      email: user.email,
      phone: user.phone,
      balance: user.wallet?.main || 0,
      isLeaf: true,
    }));

    // Combine agent and user children
    const allChildren = [...agentChildren, ...userChildren];

    const node = {
      title: agent.fullName || agent.name || "Unknown",
      key: agent._id,
      role: agent.role,
      userCount: childUsers.length,
      agentCount: childAgents.length,
      email: agent.email,
      phone: agent.phone,
      balance: agent.settings?.wallet?.balance || 0,
      children: allChildren.length > 0 ? allChildren : undefined,
    };

    return node;
  };

  // Transform server hierarchy data to Ant Design Tree format (kept for backward compatibility)
  const transformHierarchyForTree = (hierarchyData) => {
    if (!hierarchyData) return null;

    const transformNode = (node) => {
      return {
        title: node.fullName || node.title,
        key: node._id,
        role: node.role,
        userCount: node.stats?.downlineUsers || 0,
        email: node.email,
        phone: node.phone,
        children: node.downline ? node.downline.map(transformNode) : [],
      };
    };

    return transformNode(hierarchyData);
  };

  const handleCreateAgent = async (payload) => {
    try {
      // Admin creates master agents, other agents create sub-agents
      if (isAdmin) {
        await agentAPI.createAgent(payload);
      } else {
        await agentAPI.createSubAgent(payload);
      }

      message.success("Agent created successfully");
      setCreateModalVisible(false);
      loadAgents();
    } catch (error) {
      console.error("Create agent error:", error);
      throw error; // Re-throw to be handled by modal
    }
  };

  const handleUpdatePermissions = async (values) => {
    try {
      setUpdatingPermissions(true);

      // Validate limits
      if (
        !values.limits ||
        !values.limits.maxDeposit ||
        !values.limits.maxUsers
      ) {
        message.error("Please fill in all limit fields");
        setUpdatingPermissions(false);
        return;
      }

      // Convert permissions array to object format for server
      const permissionsObj = {};

      // Define all available permissions with default false
      const allPermissions = [
        "addUser",
        "editUser",
        "viewUsers",
        "resetUserPassword",
        "addBalance",
        "deductBalance",
        "adjustBalance",
        "approveDeposit",
        "approveWithdrawal",
        "viewTransactions",
        "viewUserBets",
        "cancelBets",
        "createSubAgents",
        "viewSubAgents",
        "setSubAgentCommission",
        "viewCommission",
        "withdrawCommission",
        "viewReports",
      ];

      // Set all permissions to false initially
      allPermissions.forEach((perm) => {
        permissionsObj[perm] = false;
      });

      // Set selected permissions to true
      if (Array.isArray(values.permissions)) {
        values.permissions.forEach((perm) => {
          permissionsObj[perm] = true;
        });
      }

      const updateData = {
        permissions: permissionsObj,
        limits: {
          maxDeposit: Number(values.limits.maxDeposit),
          maxUsers: Number(values.limits.maxUsers),
        },
        isActive: Boolean(values.isActive),
        isSuspended: Boolean(values.isSuspended),
      };

      console.log("Sending update data:", updateData);
      console.log("Agent ID:", selectedAgent._id);

      await agentAPI.updateAgentPermissions(selectedAgent._id, updateData);
      message.success("Permissions updated successfully");
      setPermissionModalVisible(false);
      permissionForm.resetFields();
      setSelectedAgent(null);
      loadAgents();
    } catch (error) {
      console.error("Failed to update permissions:", error);
      console.error("Error response:", error.response);
      message.error(
        error.response?.data?.message || "Failed to update permissions",
      );
    } finally {
      setUpdatingPermissions(false);
    }
  };

  const handleViewAgent = (agent) => {
    setSelectedAgent(agent);
    setViewModalVisible(true);
    loadAgentHierarchy(agent._id);
  };

  const handleSetCommission = (agent) => {
    setSelectedAgent(agent);
    setCommissionModalVisible(true);

    // Get commission rates from settings
    const commissionRates = agent.settings?.commissionRates || {};
    const downlineCommissionRates =
      agent.settings?.downlineCommissionRates || {};

    console.log("Setting commission form values:", {
      commissionRates,
      downlineCommissionRates,
    });

    commissionForm.setFieldsValue({
      "commissionRates.loss_commission": commissionRates.loss_commission || 0,
      "commissionRates.turnover_commission":
        commissionRates.turnover_commission || 0,
      "commissionRates.profit_share": commissionRates.profit_share || 0,
      "downlineCommissionRates.level1.loss_commission":
        downlineCommissionRates.level1?.loss_commission || 0,
      "downlineCommissionRates.level1.turnover_commission":
        downlineCommissionRates.level1?.turnover_commission || 0,
      "downlineCommissionRates.level1.profit_share":
        downlineCommissionRates.level1?.profit_share || 0,
      "downlineCommissionRates.level2.loss_commission":
        downlineCommissionRates.level2?.loss_commission || 0,
      "downlineCommissionRates.level2.turnover_commission":
        downlineCommissionRates.level2?.turnover_commission || 0,
      "downlineCommissionRates.level2.profit_share":
        downlineCommissionRates.level2?.profit_share || 0,
      "downlineCommissionRates.level3.loss_commission":
        downlineCommissionRates.level3?.loss_commission || 0,
      "downlineCommissionRates.level3.turnover_commission":
        downlineCommissionRates.level3?.turnover_commission || 0,
      "downlineCommissionRates.level3.profit_share":
        downlineCommissionRates.level3?.profit_share || 0,
    });
  };

  const handleUpdateCommission = async (values) => {
    try {
      setUpdatingCommission(true);

      // Build commission object
      const commissionRates = {
        loss_commission: Number(values["commissionRates.loss_commission"] || 0),
        turnover_commission: Number(
          values["commissionRates.turnover_commission"] || 0,
        ),
        profit_share: Number(values["commissionRates.profit_share"] || 0),
      };

      const downlineCommissionRates = {
        level1: {
          loss_commission: Number(
            values["downlineCommissionRates.level1.loss_commission"] || 0,
          ),
          turnover_commission: Number(
            values["downlineCommissionRates.level1.turnover_commission"] || 0,
          ),
          profit_share: Number(
            values["downlineCommissionRates.level1.profit_share"] || 0,
          ),
        },
        level2: {
          loss_commission: Number(
            values["downlineCommissionRates.level2.loss_commission"] || 0,
          ),
          turnover_commission: Number(
            values["downlineCommissionRates.level2.turnover_commission"] || 0,
          ),
          profit_share: Number(
            values["downlineCommissionRates.level2.profit_share"] || 0,
          ),
        },
        level3: {
          loss_commission: Number(
            values["downlineCommissionRates.level3.loss_commission"] || 0,
          ),
          turnover_commission: Number(
            values["downlineCommissionRates.level3.turnover_commission"] || 0,
          ),
          profit_share: Number(
            values["downlineCommissionRates.level3.profit_share"] || 0,
          ),
        },
      };

      const updateData = {
        commissionRates,
        downlineCommissionRates,
      };

      console.log("Sending commission update:", updateData);
      console.log("Agent ID:", selectedAgent._id);

      // Use appropriate API based on user role
      if (isAdmin) {
        // Admin uses admin API
        await adminAPI.updateAgentCommission(selectedAgent._id, updateData);
      } else {
        // Master Agent/Sub Agent uses agent management API
        await agentAPI.updateSubAgentCommission(selectedAgent._id, updateData);
      }
      
      message.success("Commission rates updated successfully");
      setCommissionModalVisible(false);
      commissionForm.resetFields();
      setSelectedAgent(null);
      loadAgents();
    } catch (error) {
      console.error("Failed to update commission:", error);
      console.error("Error response:", error.response);
      message.error(
        error.response?.data?.message || "Failed to update commission rates",
      );
    } finally {
      setUpdatingCommission(false);
    }
  };

  const handleEditPermissions = (agent) => {
    setSelectedAgent(agent);
    setPermissionModalVisible(true);

    // Get permissions from settings object
    const permissions = agent.settings?.permissions || {};
    const limits = agent.settings?.limits || {};
    const isActive =
      agent.settings?.isActive !== undefined
        ? agent.settings.isActive
        : agent.isActive;
    const isSuspended = agent.settings?.isSuspended || false;

    // Convert permissions object to array of enabled permission keys
    const enabledPermissions = Object.keys(permissions).filter(
      (key) => permissions[key] === true,
    );

    console.log("Setting form values:", {
      permissions: enabledPermissions,
      limits,
      isActive,
      isSuspended,
    });

    permissionForm.setFieldsValue({
      permissions: enabledPermissions,
      limits: {
        maxDeposit: limits.maxDeposit || 100000,
        maxUsers: limits.maxUsers || 100,
      },
      isActive,
      isSuspended,
    });
  };

  const columns = [
    {
      title: "Agent",
      dataIndex: "fullName",
      key: "fullName",
      render: (text, record) => (
        <div className="flex items-center space-x-3">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm ${
              record.role === ROLES.MASTER_AGENT
                ? "bg-purple-500"
                : record.role === ROLES.AGENT
                  ? "bg-blue-500"
                  : "bg-green-500"
            }`}
          >
            {record.fullName?.charAt(0) || "A"}
          </div>
          <div>
            <div className="font-medium">{record.fullName}</div>
            <div className="text-gray-500 text-sm">{record.email}</div>
            <Tag
              color={
                record.role === ROLES.MASTER_AGENT
                  ? "purple"
                  : record.role === ROLES.AGENT
                    ? "blue"
                    : "green"
              }
            >
              {record.role?.replace("_", " ").toUpperCase()}
            </Tag>
          </div>
        </div>
      ),
    },
    {
      title: "Contact",
      dataIndex: "phone",
      key: "phone",
    },
    {
      title: "Wallet Balance",
      dataIndex: "walletBalance",
      key: "walletBalance",
      render: (balance, record) =>
        formatCurrency(record.settings?.wallet?.balance || 0),
    },
    {
      title: "Commission Rate",
      dataIndex: "commissionRates",
      key: "commissionRates",
      render: (rates, record) =>
        record.settings?.commissionRates?.loss_commission
          ? `${record.settings.commissionRates.loss_commission}%`
          : "N/A",
    },
    {
      title: "Users Count",
      dataIndex: "userCount",
      key: "userCount",
      render: (count, record) => formatNumber(record.stats?.downlineUsers || 0),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (_, record) => (
        <Space>
          <Tag color={record.isActive ? "green" : "red"}>
            {record.isActive ? "ACTIVE" : "INACTIVE"}
          </Tag>
          {record.isSuspended && <Tag color="orange">SUSPENDED</Tag>}
        </Space>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => {
        // Check if user can update commission for this specific agent
        // Admin: can update all
        // Master Agent: can update Sub Agent and Agent
        // Sub Agent: can update Agent only
        
        let canUpdateCommission = false;
        
        if (isAdmin) {
          canUpdateCommission = true;
        } else if (can.setCommission) {
          // Check based on role hierarchy
          if (isMasterAgent) {
            // Master Agent can update Sub Agent and Agent
            canUpdateCommission = 
              record.role === "sub_agent" || record.role === "agent";
          } else if (isSubAgent) {
            // Sub Agent can update Agent only
            canUpdateCommission = record.role === "agent";
          }
          
          // Also check if agent is in downline (additional verification)
          const isInDownline = 
            String(record.referredBy) === String(currentUser._id) ||
            String(record.hierarchy?.masterAgent) === String(currentUser._id) ||
            String(record.hierarchy?.agent) === String(currentUser._id) ||
            String(record.hierarchy?.subAgent) === String(currentUser._id);
          
          // If we have referredBy info, use it for additional check
          if (record.referredBy) {
            canUpdateCommission = canUpdateCommission && isInDownline;
          }
        }

        // Debug logging
        if (process.env.NODE_ENV === 'development') {
          console.log('Commission Button Check:', {
            agentName: record.fullName,
            agentRole: record.role,
            currentUserRole: currentUser.role,
            hasSetCommissionPerm: can.setCommission,
            isAdmin,
            isMasterAgent,
            isSubAgent,
            canUpdateCommission
          });
        }

        return (
          <Space size="small">
            <Tooltip title="View Details">
              <Button
                type="text"
                icon={<EyeOutlined />}
                size="small"
                onClick={() => handleViewAgent(record)}
              />
            </Tooltip>

            {can.viewSubAgents && (
              <Tooltip title="Edit Permissions">
                <Button
                  type="text"
                  icon={<SettingOutlined />}
                  size="small"
                  onClick={() => handleEditPermissions(record)}
                />
              </Tooltip>
            )}

            {canUpdateCommission && (
              <Tooltip title="Update Commission">
                <Button
                  type="text"
                  icon={<DollarOutlined />}
                  size="small"
                  onClick={() => handleSetCommission(record)}
                />
              </Tooltip>
            )}
          </Space>
        );
      },
    },
  ];

  const permissionOptions = [
    { value: "addUser", label: "Add User" },
    { value: "editUser", label: "Edit User" },
    { value: "viewUsers", label: "View Users" },
    { value: "resetUserPassword", label: "Reset User Password" },
    { value: "addBalance", label: "Add Balance" },
    { value: "deductBalance", label: "Deduct Balance" },
    { value: "adjustBalance", label: "Adjust Balance" },
    { value: "approveDeposit", label: "Approve Deposit" },
    { value: "approveWithdrawal", label: "Approve Withdrawal" },
    { value: "viewTransactions", label: "View Transactions" },
    { value: "viewUserBets", label: "View User Bets" },
    { value: "cancelBets", label: "Cancel Bets" },
    { value: "createSubAgents", label: "Create Sub Agents" },
    { value: "viewSubAgents", label: "View Sub Agents" },
    { value: "setSubAgentCommission", label: "Set Sub Agent Commission" },
    { value: "viewCommission", label: "View Commission" },
    { value: "withdrawCommission", label: "Withdraw Commission" },
    { value: "viewReports", label: "View Reports" },
  ];

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Total Agents"
              value={stats.totalAgents}
              prefix={<TeamOutlined />}
              valueStyle={{ color: "#3f8600" }}
            />
          </Card>
        </Col>
        {currentUser?.role === "admin" && (
          <Col xs={24} sm={6}>
            <Card>
              <Statistic
                title="Master Agents"
                value={stats.masterAgents}
                prefix={<TeamOutlined />}
                valueStyle={{ color: "#722ed1" }}
              />
            </Card>
          </Col>
        )}
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Sub Agents"
              value={stats.subAgents}
              prefix={<TeamOutlined />}
              valueStyle={{ color: "#1890ff" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Agents"
              value={stats.regularAgents}
              prefix={<TeamOutlined />}
              valueStyle={{ color: "#3f8600" }}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab="Agents List" key="list">
            <div className="mb-4 flex justify-between items-center">
              <div className="flex space-x-2">
                <Input
                  placeholder="Search agents..."
                  prefix={<SearchOutlined />}
                  style={{ width: 300 }}
                />
              </div>
              {can.createSubAgents && (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setCreateModalVisible(true)}
                >
                  Create Agent
                </Button>
              )}
            </div>

            <Table
              columns={columns}
              dataSource={agents}
              loading={loading}
              scroll={{ x: 800 }}
              rowKey="_id"
              locale={{
                emptyText: loading
                  ? "Loading agents..."
                  : "No agents found. Create a master agent to get started.",
              }}
            />
          </TabPane>

          <TabPane tab="Hierarchy View" key="hierarchy">
            <div className="p-4 border rounded">
              {hierarchyLoading ? (
                <div className="flex justify-center items-center py-8">
                  <Spin size="large" />
                  <span className="ml-2">Loading hierarchy...</span>
                </div>
              ) : hierarchyData.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No hierarchy data available
                </div>
              ) : (
                <Tree
                  showLine
                  defaultExpandAll
                  treeData={hierarchyData}
                  titleRender={(nodeData) => (
                    <div className="flex items-center space-x-3 p-2">
                      {nodeData.role === "user" ? (
                        <UserOutlined
                          style={{ fontSize: "16px", color: "#52c41a" }}
                        />
                      ) : (
                        <TeamOutlined
                          style={{ fontSize: "16px", color: "#1890ff" }}
                        />
                      )}
                      <span style={{ fontWeight: 500, fontSize: "14px" }}>
                        {nodeData.title}
                      </span>
                      <Tag
                        color={
                          nodeData.role === "master_agent"
                            ? "purple"
                            : nodeData.role === "agent"
                              ? "blue"
                              : nodeData.role === "sub_agent"
                                ? "cyan"
                                : nodeData.role === "user"
                                  ? "green"
                                  : "default"
                        }
                      >
                        {nodeData.role?.replace("_", " ").toUpperCase()}
                      </Tag>
                      {nodeData.email && (
                        <span className="text-gray-500 text-xs">
                          {nodeData.email}
                        </span>
                      )}
                      {nodeData.role !== "user" && (
                        <span className="text-gray-500 text-xs">
                          {nodeData.role === "agent"
                            ? `(${nodeData.userCount || 0} users)`
                            : `(${nodeData.agentCount || 0} agents, ${nodeData.userCount || 0} users)`}
                        </span>
                      )}
                    </div>
                  )}
                />
              )}
            </div>
          </TabPane>
        </Tabs>
      </Card>

      {/* Create Agent Modal */}
      <CreateAgentModal
        visible={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        onSuccess={handleCreateAgent}
        currentUserRole={role}
      />

      {/* View Agent Modal */}
      <Modal
        title="Agent Details"
        open={viewModalVisible}
        onCancel={() => setViewModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setViewModalVisible(false)}>
            Close
          </Button>,
        ]}
        width={800}
      >
        {selectedAgent && (
          <Tabs>
            <TabPane tab="Basic Info" key="info">
              <Descriptions column={2} bordered>
                <Descriptions.Item label="Full Name">
                  {selectedAgent.fullName}
                </Descriptions.Item>
                <Descriptions.Item label="Email">
                  {selectedAgent.email}
                </Descriptions.Item>
                <Descriptions.Item label="Phone">
                  {selectedAgent.phone}
                </Descriptions.Item>
                <Descriptions.Item label="Role">
                  <Tag
                    color={
                      selectedAgent.role === ROLES.MASTER_AGENT
                        ? "purple"
                        : selectedAgent.role === ROLES.AGENT
                          ? "blue"
                          : "green"
                    }
                  >
                    {selectedAgent.role?.replace("_", " ").toUpperCase()}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Wallet Balance">
                  {formatCurrency(selectedAgent.settings?.wallet?.balance || 0)}
                </Descriptions.Item>
                <Descriptions.Item label="Status">
                  <Space>
                    <Tag color={selectedAgent.isActive ? "green" : "red"}>
                      {selectedAgent.isActive ? "ACTIVE" : "INACTIVE"}
                    </Tag>
                    {selectedAgent.isSuspended && (
                      <Tag color="orange">SUSPENDED</Tag>
                    )}
                  </Space>
                </Descriptions.Item>
                <Descriptions.Item label="Created At" span={2}>
                  {formatDate(selectedAgent.createdAt)}
                </Descriptions.Item>
              </Descriptions>
            </TabPane>

            <TabPane tab="Hierarchy" key="hierarchy">
              <Tree showLine treeData={hierarchyData} defaultExpandAll />
            </TabPane>
          </Tabs>
        )}
      </Modal>

      {/* Permission Modal */}
      <Modal
        title={`Edit Permissions - ${selectedAgent?.fullName}`}
        open={permissionModalVisible}
        onCancel={() => {
          setPermissionModalVisible(false);
          permissionForm.resetFields();
          setSelectedAgent(null);
        }}
        footer={null}
        width={700}
      >
        <Form
          form={permissionForm}
          layout="vertical"
          onFinish={handleUpdatePermissions}
        >
          {/* Permissions Section */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-semibold mb-3 text-blue-900">Permissions</h3>
            <Form.Item
              name="permissions"
              label="Select Agent Permissions"
              tooltip="Choose which features this agent can access"
            >
              <Select
                mode="multiple"
                placeholder="Select permissions..."
                optionLabelProp="label"
                options={permissionOptions}
                maxTagCount="responsive"
              />
            </Form.Item>
          </div>

          {/* Limits Section */}
          <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
            <h3 className="font-semibold mb-3 text-green-900">Limits</h3>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name={["limits", "maxDeposit"]}
                  label="Max Deposit Limit"
                  rules={[
                    {
                      required: true,
                      message: "Please enter max deposit limit",
                    },
                    {
                      type: "number",
                      message: "Must be a number",
                      transform: (value) => {
                        return value ? Number(value) : undefined;
                      },
                    },
                  ]}
                >
                  <InputNumber
                    placeholder="e.g. 100000"
                    min={0}
                    max={9999999}
                    className="w-full"
                    formatter={(value) =>
                      `৳${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                    }
                    parser={(value) => value.replace(/\D/g, "")}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name={["limits", "maxUsers"]}
                  label="Max Users"
                  rules={[
                    { required: true, message: "Please enter max users" },
                    {
                      type: "number",
                      message: "Must be a number",
                      transform: (value) => {
                        return value ? Number(value) : undefined;
                      },
                    },
                  ]}
                >
                  <InputNumber
                    placeholder="e.g. 100"
                    min={0}
                    max={99999}
                    className="w-full"
                  />
                </Form.Item>
              </Col>
            </Row>
          </div>

          {/* Status Section */}
          <div className="mb-6 p-4 bg-orange-50 rounded-lg border border-orange-200">
            <h3 className="font-semibold mb-3 text-orange-900">Status</h3>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="isActive"
                  label="Active Status"
                  valuePropName="checked"
                  initialValue={true}
                >
                  <Switch
                    checkedChildren="Active"
                    unCheckedChildren="Inactive"
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="isSuspended"
                  label="Suspended"
                  valuePropName="checked"
                  initialValue={false}
                >
                  <Switch
                    checkedChildren="Suspended"
                    unCheckedChildren="Not Suspended"
                    danger
                  />
                </Form.Item>
              </Col>
            </Row>
          </div>

          {/* Buttons */}
          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                loading={updatingPermissions}
                disabled={updatingPermissions}
              >
                {updatingPermissions ? "Updating..." : "Update Permissions"}
              </Button>
              <Button
                size="large"
                onClick={() => {
                  setPermissionModalVisible(false);
                  permissionForm.resetFields();
                  setSelectedAgent(null);
                }}
                disabled={updatingPermissions}
              >
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Commission Modal */}
      <Modal
        title={`Set Commission Rates - ${selectedAgent?.fullName}`}
        open={commissionModalVisible}
        onCancel={() => {
          setCommissionModalVisible(false);
          commissionForm.resetFields();
          setSelectedAgent(null);
        }}
        footer={null}
        width={900}
      >
        <Form
          form={commissionForm}
          layout="vertical"
          onFinish={handleUpdateCommission}
        >
          {/* Important Notice */}
          {!isAdmin && (() => {
            // Get commission rates from loaded settings or fallback to user object
            const userCommissionRates = currentUserSettings?.commissionRates || 
                                       currentUser?.settings?.commissionRates || 
                                       currentUser?.commissionRates || 
                                       {};
            
            return (
              <Alert
                message="Hierarchical Commission Constraint"
                description={
                  <div>
                    <p style={{ marginBottom: 8, fontWeight: 500 }}>
                      Commission rates must follow hierarchy rules:
                    </p>
                    <ul style={{ marginBottom: 8, paddingLeft: 20 }}>
                      <li>Child agent's commission cannot exceed parent's commission</li>
                      <li>Your commission limits apply to all agents you create or update</li>
                    </ul>
                    <p style={{ marginBottom: 0, marginTop: 8 }}>
                      <strong>Your Maximum Commission Rates:</strong><br />
                      Loss: <strong>{userCommissionRates.loss_commission || 0}%</strong> | 
                      Turnover: <strong>{userCommissionRates.turnover_commission || 0}%</strong> | 
                      Profit Share: <strong>{userCommissionRates.profit_share || 0}%</strong>
                    </p>
                  </div>
                }
                type="warning"
                showIcon
                style={{ marginBottom: 20 }}
              />
            );
          })()}

          {/* Agent Commission Section */}
          <div className="mb-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
            <h3 className="font-semibold mb-4 text-purple-900">
              Agent Commission Rates
            </h3>
            <Row gutter={16}>
              <Col xs={24} sm={8}>
                <Form.Item
                  name="commissionRates.loss_commission"
                  label={`Loss Commission (%) ${!isAdmin ? `- Max: ${(currentUserSettings?.commissionRates || currentUser?.settings?.commissionRates || currentUser?.commissionRates || {}).loss_commission || 0}%` : ''}`}
                  rules={[
                    {
                      required: true,
                      message: "Please enter loss commission",
                    },
                    { type: "number", message: "Must be a number" },
                    !isAdmin && {
                      validator: (_, value) => {
                        const maxValue = (currentUserSettings?.commissionRates || currentUser?.settings?.commissionRates || currentUser?.commissionRates || {}).loss_commission || 0;
                        if (value > maxValue) {
                          return Promise.reject(new Error(`Cannot exceed your limit of ${maxValue}%`));
                        }
                        return Promise.resolve();
                      },
                    },
                  ].filter(Boolean)}
                >
                  <InputNumber
                    placeholder="0 - 100"
                    min={0}
                    max={isAdmin ? 100 : ((currentUserSettings?.commissionRates || currentUser?.settings?.commissionRates || currentUser?.commissionRates || {}).loss_commission || 100)}
                    className="w-full"
                    formatter={(value) =>
                      `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                    }
                    parser={(value) => value.replace(/,/g, "")}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item
                  name="commissionRates.turnover_commission"
                  label={`Turnover Commission (%) ${!isAdmin ? `- Max: ${(currentUserSettings?.commissionRates || currentUser?.settings?.commissionRates || currentUser?.commissionRates || {}).turnover_commission || 0}%` : ''}`}
                  rules={[
                    {
                      required: true,
                      message: "Please enter turnover commission",
                    },
                    { type: "number", message: "Must be a number" },
                    !isAdmin && {
                      validator: (_, value) => {
                        const maxValue = (currentUserSettings?.commissionRates || currentUser?.settings?.commissionRates || currentUser?.commissionRates || {}).turnover_commission || 0;
                        if (value > maxValue) {
                          return Promise.reject(new Error(`Cannot exceed your limit of ${maxValue}%`));
                        }
                        return Promise.resolve();
                      },
                    },
                  ].filter(Boolean)}
                >
                  <InputNumber
                    placeholder="0 - 100"
                    min={0}
                    max={isAdmin ? 100 : ((currentUserSettings?.commissionRates || currentUser?.settings?.commissionRates || currentUser?.commissionRates || {}).turnover_commission || 100)}
                    className="w-full"
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item
                  name="commissionRates.profit_share"
                  label={`Profit Share (%) ${!isAdmin ? `- Max: ${(currentUserSettings?.commissionRates || currentUser?.settings?.commissionRates || currentUser?.commissionRates || {}).profit_share || 0}%` : ''}`}
                  rules={[
                    {
                      required: true,
                      message: "Please enter profit share",
                    },
                    { type: "number", message: "Must be a number" },
                    !isAdmin && {
                      validator: (_, value) => {
                        const maxValue = (currentUserSettings?.commissionRates || currentUser?.settings?.commissionRates || currentUser?.commissionRates || {}).profit_share || 0;
                        if (value > maxValue) {
                          return Promise.reject(new Error(`Cannot exceed your limit of ${maxValue}%`));
                        }
                        return Promise.resolve();
                      },
                    },
                  ].filter(Boolean)}
                >
                  <InputNumber
                    placeholder="0 - 100"
                    min={0}
                    max={isAdmin ? 100 : ((currentUserSettings?.commissionRates || currentUser?.settings?.commissionRates || currentUser?.commissionRates || {}).profit_share || 100)}
                    className="w-full"
                  />
                </Form.Item>
              </Col>
            </Row>
          </div>

          {/* Level 1 Downline Commission */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-semibold mb-4 text-blue-900">
              Level 1 Downline Commission Rates
            </h3>
            <Row gutter={16}>
              <Col xs={24} sm={8}>
                <Form.Item
                  name="downlineCommissionRates.level1.loss_commission"
                  label="Loss Commission (%)"
                  rules={[{ required: true, message: "Please enter value" }]}
                >
                  <InputNumber
                    placeholder="0 - 100"
                    min={0}
                    max={100}
                    className="w-full"
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item
                  name="downlineCommissionRates.level1.turnover_commission"
                  label="Turnover Commission (%)"
                  rules={[{ required: true, message: "Please enter value" }]}
                >
                  <InputNumber
                    placeholder="0 - 100"
                    min={0}
                    max={100}
                    className="w-full"
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item
                  name="downlineCommissionRates.level1.profit_share"
                  label="Profit Share (%)"
                  rules={[{ required: true, message: "Please enter value" }]}
                >
                  <InputNumber
                    placeholder="0 - 100"
                    min={0}
                    max={100}
                    className="w-full"
                  />
                </Form.Item>
              </Col>
            </Row>
          </div>

          {/* Level 2 Downline Commission */}
          <div className="mb-6 p-4 bg-cyan-50 rounded-lg border border-cyan-200">
            <h3 className="font-semibold mb-4 text-cyan-900">
              Level 2 Downline Commission Rates
            </h3>
            <Row gutter={16}>
              <Col xs={24} sm={8}>
                <Form.Item
                  name="downlineCommissionRates.level2.loss_commission"
                  label="Loss Commission (%)"
                  rules={[{ required: true, message: "Please enter value" }]}
                >
                  <InputNumber
                    placeholder="0 - 100"
                    min={0}
                    max={100}
                    className="w-full"
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item
                  name="downlineCommissionRates.level2.turnover_commission"
                  label="Turnover Commission (%)"
                  rules={[{ required: true, message: "Please enter value" }]}
                >
                  <InputNumber
                    placeholder="0 - 100"
                    min={0}
                    max={100}
                    className="w-full"
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item
                  name="downlineCommissionRates.level2.profit_share"
                  label="Profit Share (%)"
                  rules={[{ required: true, message: "Please enter value" }]}
                >
                  <InputNumber
                    placeholder="0 - 100"
                    min={0}
                    max={100}
                    className="w-full"
                  />
                </Form.Item>
              </Col>
            </Row>
          </div>

          {/* Level 3 Downline Commission */}
          <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
            <h3 className="font-semibold mb-4 text-green-900">
              Level 3 Downline Commission Rates
            </h3>
            <Row gutter={16}>
              <Col xs={24} sm={8}>
                <Form.Item
                  name="downlineCommissionRates.level3.loss_commission"
                  label="Loss Commission (%)"
                  rules={[{ required: true, message: "Please enter value" }]}
                >
                  <InputNumber
                    placeholder="0 - 100"
                    min={0}
                    max={100}
                    className="w-full"
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item
                  name="downlineCommissionRates.level3.turnover_commission"
                  label="Turnover Commission (%)"
                  rules={[{ required: true, message: "Please enter value" }]}
                >
                  <InputNumber
                    placeholder="0 - 100"
                    min={0}
                    max={100}
                    className="w-full"
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item
                  name="downlineCommissionRates.level3.profit_share"
                  label="Profit Share (%)"
                  rules={[{ required: true, message: "Please enter value" }]}
                >
                  <InputNumber
                    placeholder="0 - 100"
                    min={0}
                    max={100}
                    className="w-full"
                  />
                </Form.Item>
              </Col>
            </Row>
          </div>

          {/* Buttons */}
          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                loading={updatingCommission}
                disabled={updatingCommission}
              >
                {updatingCommission ? "Updating..." : "Update Commission"}
              </Button>
              <Button
                size="large"
                onClick={() => {
                  setCommissionModalVisible(false);
                  commissionForm.resetFields();
                  setSelectedAgent(null);
                }}
                disabled={updatingCommission}
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

export default AgentManagement;
