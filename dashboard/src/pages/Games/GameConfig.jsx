import React, { useState, useEffect } from "react";
import {
  Card,
  Table,
  Button,
  Tag,
  Switch,
  Input,
  Select,
  Space,
  Modal,
  Form,
  InputNumber,
  message,
  Row,
  Col,
  Tooltip,
  Popconfirm,
  Badge,
} from "antd";
import {
  EditOutlined,
  SettingOutlined,
  SearchOutlined,
  FilterOutlined,
  ReloadOutlined,
  PoweroffOutlined,
  CheckCircleOutlined,
  StopOutlined,
} from "@ant-design/icons";
import { gameAPI } from "../../services/api";
import { formatCurrency } from "../../utils/helpers";

const { Option } = Select;

const GameConfig = () => {
  const [gameConfigs, setGameConfigs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState(null);
  const [configModalVisible, setConfigModalVisible] = useState(false);
  const [filters, setFilters] = useState({
    category: "",
    provider: "",
    isActive: "",
    search: "",
  });
  const [form] = Form.useForm();

  useEffect(() => {
    loadGameConfigs();
  }, [filters]);

  const loadGameConfigs = async () => {
    setLoading(true);
    try {
      const response = await gameAPI.getGameConfigs({
        page: 1,
        limit: 100,
        ...filters,
      });
      setGameConfigs(response.data.data.configs || []);
    } catch (error) {
      console.error("Failed to load game configs:", error);
      message.error("Failed to load game configurations");
      setGameConfigs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateConfig = async (gameId, values) => {
    try {
      await gameAPI.updateGameConfig(gameId, values);
      message.success("Game configuration updated successfully");
      loadGameConfigs();
    } catch (error) {
      console.error("Failed to update configuration:", error);
      message.error(
        "Failed to update configuration: " +
          (error.response?.data?.message || error.message),
      );
    }
  };

  const handleToggleMaintenance = async (gameId, maintenanceMode) => {
    try {
      await gameAPI.toggleMaintenanceMode(gameId, { maintenanceMode });
      message.success(
        `Maintenance mode ${maintenanceMode ? "enabled" : "disabled"}`,
      );
      loadGameConfigs();
    } catch (error) {
      console.error("Failed to toggle maintenance mode:", error);
      message.error("Failed to toggle maintenance mode");
    }
  };

  const handleEditConfig = (config) => {
    console.log("Edit config:", config);
    console.log("isHot value:", config.isHot);
    setSelectedConfig(config);
    form.setFieldsValue({
      isActive: config.isActive,
      minBet: config.minBet,
      maxBet: config.maxBet,
      rtp: config.rtp,
      commission: config.commission,
      featured: config.featured,
      isHot: config.isHot === true ? true : false,
      maintenanceMode: config.maintenanceMode,
    });
    setConfigModalVisible(true);
  };

  const handleConfigSubmit = async (values) => {
    if (selectedConfig) {
      // Create safe payload with proper type handling
      const payload = {
        ...values,
        isHot: values.isHot === true ? true : false,
      };
      console.log("Submitting payload:", payload);
      await handleUpdateConfig(selectedConfig.game._id, payload);
      setConfigModalVisible(false);
      setSelectedConfig(null);
      form.resetFields();
    }
  };

  const columns = [
    {
      title: "Game",
      dataIndex: ["game", "game_name"],
      key: "gameName",
      render: (name, record) => (
        <div>
          <div className="font-medium">{name}</div>
          <div className="text-xs text-gray-500">{record.game?.brand}</div>
        </div>
      ),
    },
    {
      title: "Category",
      dataIndex: ["game", "category"],
      key: "category",
      render: (category) => (
        <Tag color="blue">{category?.replace("_", " ").toUpperCase()}</Tag>
      ),
    },
    {
      title: "Status",
      key: "status",
      render: (_, record) => (
        <Space>
          <Badge
            status={record.isActive ? "success" : "error"}
            text={record.isActive ? "Active" : "Inactive"}
          />
          {record.maintenanceMode && (
            <Badge status="warning" text="Maintenance" />
          )}
        </Space>
      ),
    },
    {
      title: "Bet Limits",
      key: "betLimits",
      render: (_, record) => (
        <div className="text-sm">
          <div>Min: {formatCurrency(record.minBet)}</div>
          <div>Max: {formatCurrency(record.maxBet)}</div>
        </div>
      ),
    },
    {
      title: "RTP",
      dataIndex: "rtp",
      key: "rtp",
      render: (rtp) => `${rtp}%`,
    },
    {
      title: "Commission",
      dataIndex: "commission",
      key: "commission",
      render: (commission) => `${commission}%`,
    },
    {
      title: "Featured",
      dataIndex: "featured",
      key: "featured",
      render: (featured) => (
        <Tag color={featured ? "gold" : "default"}>
          {featured ? "Featured" : "Regular"}
        </Tag>
      ),
    },
    {
      title: "Hot Game",
      dataIndex: "isHot",
      key: "isHot",
      width: 130,
      render: (isHot) => (
        <Tag
          color={isHot ? "red" : "#f5f5f5"}
          style={{
            padding: "6px 12px",
            borderRadius: "20px",
            fontWeight: "600",
            fontSize: "12px",
            border: isHot ? "1px solid #ff4d4f" : "1px solid #d9d9d9",
            color: isHot ? "#fff" : "#666",
            textAlign: "center",
          }}
        >
          {isHot ? "🔥 HOT" : "Normal"}
        </Tag>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Tooltip title="Edit Configuration">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEditConfig(record)}
            />
          </Tooltip>

          <Tooltip
            title={
              record.maintenanceMode
                ? "Disable Maintenance"
                : "Enable Maintenance"
            }
          >
            <Popconfirm
              title={`Are you sure you want to ${record.maintenanceMode ? "disable" : "enable"} maintenance mode?`}
              onConfirm={() =>
                handleToggleMaintenance(
                  record.game._id,
                  !record.maintenanceMode,
                )
              }
              okText="Yes"
              cancelText="No"
            >
              <Button
                type="text"
                icon={
                  record.maintenanceMode ? (
                    <CheckCircleOutlined />
                  ) : (
                    <StopOutlined />
                  )
                }
                danger={record.maintenanceMode}
              />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Game Configuration</h1>
        <p className="text-gray-600">
          Manage game settings, bet limits, and maintenance modes
        </p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={6}>
            <Input
              placeholder="Search games..."
              prefix={<SearchOutlined />}
              value={filters.search}
              onChange={(e) => handleFilterChange("search", e.target.value)}
            />
          </Col>

          <Col xs={12} sm={4}>
            <Select
              placeholder="Category"
              value={filters.category}
              onChange={(value) => handleFilterChange("category", value)}
              className="w-full"
              allowClear
            >
              <Option value="slots">Slots</Option>
              <Option value="live_casino">Live Casino</Option>
              <Option value="sports">Sports</Option>
              <Option value="virtual_sports">Virtual Sports</Option>
              <Option value="poker">Poker</Option>
              <Option value="lottery">Lottery</Option>
            </Select>
          </Col>
          <Col xs={12} sm={4}>
            <Select
              placeholder="Provider"
              value={filters.provider}
              onChange={(value) => handleFilterChange("provider", value)}
              className="w-full"
              allowClear
            >
              <Option value="Evolution">Evolution</Option>
              <Option value="Pragmatic Play">Pragmatic Play</Option>
              <Option value="NetEnt">NetEnt</Option>
              <Option value="Microgaming">Microgaming</Option>
              <Option value="Playtech">Playtech</Option>
              <Option value="Habanero">Habanero</Option>
            </Select>
          </Col>
          <Col xs={12} sm={4}>
            <Select
              placeholder="Status"
              value={filters.isActive}
              onChange={(value) => handleFilterChange("isActive", value)}
              className="w-full"
              allowClear
            >
              <Option value="true">Active</Option>
              <Option value="false">Inactive</Option>
            </Select>
          </Col>
          <Col xs={12} sm={6}>
            <Space>
              <Button
                type="primary"
                icon={<FilterOutlined />}
                onClick={loadGameConfigs}
              >
                Apply Filters
              </Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => {
                  setFilters({
                    category: "",
                    provider: "",
                    isActive: "",
                    search: "",
                  });
                  loadGameConfigs();
                }}
              >
                Reset
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Game Configs Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={gameConfigs}
          loading={loading}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} configurations`,
          }}
          scroll={{ x: 1200 }}
          rowKey={(record) => record.game._id}
        />
      </Card>

      {/* Configuration Modal */}
      <Modal
        title={`Configure ${selectedConfig?.game?.game_name}`}
        open={configModalVisible}
        onCancel={() => {
          setConfigModalVisible(false);
          setSelectedConfig(null);
          form.resetFields();
        }}
        footer={null}
        width={700}
        bodyStyle={{ maxHeight: "70vh", overflowY: "auto" }}
      >
        <GameConfigForm
          form={form}
          onFinish={handleConfigSubmit}
          game={selectedConfig?.game}
        />
      </Modal>
    </div>
  );
};

// Game Configuration Form Component
const GameConfigForm = ({ form, onFinish, game }) => {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      await onFinish(values);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form form={form} layout="vertical" onFinish={handleSubmit}>
      <Row gutter={16}>
        asdfasdfasdf
        <Col span={12}>
          <Form.Item
            name="isActive"
            label="Active Status"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="featured"
            label="Featured Game"
            valuePropName="checked"
            tooltip="Include in featured games carousel"
          >
            <Switch checkedChildren="Yes" unCheckedChildren="No" />
          </Form.Item>
        </Col>

        <Col span={12}>
          <div
            style={{
              padding: "12px",
              border: "1px solid #ffccc7",
              borderRadius: "10px",
              background: "#fff2f0",
              minHeight: "85px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div
                style={{
                  fontWeight: 600,
                  color: "#ff4d4f",
                  fontSize: "15px",
                }}
              >
                🔥 Hot Game
              </div>

              <div
                style={{
                  fontSize: "12px",
                  color: "#888",
                  marginTop: "4px",
                }}
              >
                Show in Hot Category
              </div>
            </div>

            <Form.Item
              name="isHot"
              valuePropName="checked"
              initialValue={false}
              className="mb-0"
            >
              <Switch checkedChildren="HOT" unCheckedChildren="OFF" />
            </Form.Item>
          </div>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="minBet"
            label="Minimum Bet"
            rules={[{ required: true, message: "Please enter minimum bet" }]}
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
        <Col span={12}>
          <Form.Item
            name="maxBet"
            label="Maximum Bet"
            rules={[{ required: true, message: "Please enter maximum bet" }]}
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
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="rtp"
            label="RTP (%)"
            rules={[{ required: true, message: "Please enter RTP" }]}
          >
            <InputNumber
              className="w-full"
              min={0}
              max={100}
              step={0.1}
              addonAfter="%"
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="commission"
            label="Commission (%)"
            rules={[{ required: true, message: "Please enter commission" }]}
          >
            <InputNumber
              className="w-full"
              min={0}
              max={100}
              step={0.1}
              addonAfter="%"
            />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item>
        <Space>
          <Button type="primary" htmlType="submit" loading={loading}>
            Update Configuration
          </Button>
          <Button onClick={() => form.resetFields()}>Reset</Button>
        </Space>
      </Form.Item>
    </Form>
  );
};

export default GameConfig;
