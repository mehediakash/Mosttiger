import React, { useState, useEffect } from "react";
import {
  Card,
  Row,
  Col,
  Input,
  Select,
  Button,
  Tag,
  Modal,
  Form,
  Switch,
  InputNumber,
  message,
  Tabs,
  Statistic,
  Badge,
  Tooltip,
  Space,
  Image,
  Spin,
  Pagination,
} from "antd";
import {
  PlayCircleOutlined,
  SearchOutlined,
  SettingOutlined,
  EyeOutlined,
  PoweroffOutlined,
  StarOutlined,
} from "@ant-design/icons";
import { gameAPI } from "../../services/api";
import { formatCurrency, formatNumber } from "../../utils/helpers";

const { Option } = Select;
const { TabPane } = Tabs;

const GameLauncher = () => {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedGame, setSelectedGame] = useState(null);
  const [launchModalVisible, setLaunchModalVisible] = useState(false);
  const [configModalVisible, setConfigModalVisible] = useState(false);
  const [filters, setFilters] = useState({
    category: "",
    brand: "",
    search: "",
    is_active: "all", // 'all', 'true', 'false'
  });
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 24,
    total: 0,
    totalPages: 0,
  });
  const [availableFilters, setAvailableFilters] = useState({
    categories: [],
    brands: [],
  });

  useEffect(() => {
    loadGames();
  }, [pagination.current, pagination.pageSize, filters]);

  const loadGames = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.current,
        limit: pagination.pageSize,
      };

      // Add filters only if they have values
      if (filters.category) params.category = filters.category;
      if (filters.brand) params.brand = filters.brand;
      if (filters.search) params.search = filters.search;
      if (filters.is_active !== "all") params.is_active = filters.is_active;

      const response = await gameAPI.getGames(params);
      const data = response.data.data;

      setGames(data.games || []);
      setPagination((prev) => ({
        ...prev,
        total: data.total || 0,
        totalPages: data.totalPages || 0,
      }));
      setAvailableFilters({
        categories: data.filters?.categories || [],
        brands: data.filters?.brands || [],
      });
    } catch (error) {
      console.error("Failed to load games:", error);
      message.error("Failed to load games");
      setGames([]);
      setPagination((prev) => ({ ...prev, total: 0, totalPages: 0 }));
      setAvailableFilters({ categories: [], brands: [] });
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, current: 1 })); // Reset to first page on filter change
  };

  const handlePageChange = (page, pageSize) => {
    setPagination((prev) => ({ ...prev, current: page, pageSize }));
  };

  const handleLaunchGame = async (game) => {
    setSelectedGame(game);
    setLaunchModalVisible(true);
  };

  const handleGameLaunch = async (values) => {
    try {
      const response = await gameAPI.launchGame(selectedGame._id, values);
      // Server returns gameUrl in response.data.data
      const gameUrl = response.data?.data?.gameUrl || response.data?.gameUrl;
      if (gameUrl) {
        window.open(gameUrl, "_blank");
        setLaunchModalVisible(false);
        message.success("Game launched successfully!");
      } else {
        message.error("Failed to get game URL");
      }
    } catch (error) {
      console.error("Launch game error:", error);
      message.error(
        "Failed to launch game: " +
          (error.response?.data?.message || "Unknown error"),
      );
    }
  };

  const handleUpdateConfig = async (values) => {
    try {
      await gameAPI.updateGameConfig(selectedGame._id, values);
      message.success("Game configuration updated successfully");
      setConfigModalVisible(false);
      loadGames();
    } catch (error) {
      console.error("Failed to update configuration:", error);
      message.error(
        "Failed to update configuration: " +
          (error.response?.data?.message || error.message || "Unknown error"),
      );
    }
  };

  const categories = availableFilters.categories;
  const providers = availableFilters.brands;

  const GameCard = ({ game }) => (
    <Card
      hoverable
      className="h-full"
      cover={
        <div className="relative">
          <img
            alt={game.game_name}
            src={game.image_url || "/api/placeholder/300/200"}
            className="h-40 object-cover"
          />
          {game.maintenanceMode && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <Tag color="red">MAINTENANCE</Tag>
            </div>
          )}
          {game.featured && (
            <div className="absolute top-2 left-2">
              <StarOutlined className="text-primary text-lg" />
            </div>
          )}
          {game.isHot && (
            <div className="absolute top-2 right-2">
              <Tag color="red">🔥 HOT</Tag>
            </div>
          )}
          {game.is_hot && (
            <div className="absolute top-2 right-2">
              <Tag color="red">🔥 HOT</Tag>
            </div>
          )}
        </div>
      }
      actions={[
        <Tooltip title="Play Game">
          <PlayCircleOutlined
            onClick={() => handleLaunchGame(game)}
            disabled={game.maintenanceMode}
          />
        </Tooltip>,
        <Tooltip title="View Details">
          <EyeOutlined />
        </Tooltip>,
        <Tooltip title="Settings">
          <SettingOutlined
            onClick={() => {
              setSelectedGame(game);
              setConfigModalVisible(true);
            }}
          />
        </Tooltip>,
      ]}
    >
      <Card.Meta
        title={
          <div className="flex justify-between items-start">
            <span className="text-sm font-medium">{game.game_name}</span>
            <div className="flex gap-1">
              {game.is_active !== false && <Tag color="green">ACTIVE</Tag>}
              {game.is_active === false && <Tag color="red">INACTIVE</Tag>}
              {game.featured && <Tag color="gold">FEATURED</Tag>}
              {(game.isHot || game.is_hot) && <Tag color="red">🔥 HOT</Tag>}
            </div>
          </div>
        }
        description={
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span>Provider:</span>
              <Tag color="blue" size="small">
                {game.brand}
              </Tag>
            </div>
            <div className="flex justify-between">
              <span>Category:</span>
              <Tag color="green" size="small">
                {game.category}
              </Tag>
            </div>
            <div className="flex justify-between">
              <span>RTP:</span>
              <span>{game.rtp || 95}%</span>
            </div>
            <div className="flex justify-between">
              <span>Min Bet:</span>
              <span>{formatCurrency(game.min_bet || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span>Max Bet:</span>
              <span>{formatCurrency(game.max_bet || 10000)}</span>
            </div>
          </div>
        }
      />
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Filters */}

      <Card>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={6}>
            <Input
              placeholder="Search games..."
              prefix={<SearchOutlined />}
              value={filters.search}
              onChange={(e) => handleFilterChange("search", e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={12} sm={5}>
            <Select
              placeholder="Category"
              value={filters.category || undefined}
              onChange={(value) => handleFilterChange("category", value || "")}
              className="w-full"
              allowClear
            >
              {categories.map((cat) => (
                <Option key={cat} value={cat}>
                  {cat.replace("_", " ").toUpperCase()}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={12} sm={5}>
            <Select
              placeholder="Provider"
              value={filters.brand || undefined}
              onChange={(value) => handleFilterChange("brand", value || "")}
              className="w-full"
              allowClear
            >
              {providers.map((provider) => (
                <Option key={provider} value={provider}>
                  {provider}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={12} sm={4}>
            <Select
              placeholder="Status"
              value={filters.is_active}
              onChange={(value) => handleFilterChange("is_active", value)}
              className="w-full"
            >
              <Option value="all">All Games</Option>
              <Option value="true">Active Only</Option>
              <Option value="false">Inactive Only</Option>
            </Select>
          </Col>
          <Col xs={12} sm={4}>
            <div className="text-center text-sm text-gray-600">
              {pagination.total} games
            </div>
          </Col>
        </Row>
      </Card>

      {/* Games Grid */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Spin size="large" />
        </div>
      ) : games.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">
            No games found matching your criteria.
          </p>
        </div>
      ) : (
        <>
          <Row gutter={[16, 16]}>
            {games.map((game) => (
              <Col xs={12} sm={8} md={6} lg={4} key={game._id}>
                <GameCard game={game} />
              </Col>
            ))}
          </Row>

          {/* Pagination */}
          <Card className="mt-4">
            <div className="flex justify-center">
              <Pagination
                current={pagination.current}
                pageSize={pagination.pageSize}
                total={pagination.total}
                onChange={handlePageChange}
                showSizeChanger
                showTotal={(total, range) =>
                  `${range[0]}-${range[1]} of ${total} games`
                }
                pageSizeOptions={["12", "24", "48", "96"]}
              />
            </div>
          </Card>
        </>
      )}

      {/* Launch Modal */}
      <Modal
        title={`Launch ${selectedGame?.game_name}`}
        open={launchModalVisible}
        onCancel={() => setLaunchModalVisible(false)}
        footer={null}
        width={400}
      >
        <Form
          layout="vertical"
          onFinish={handleGameLaunch}
          initialValues={{
            currency: "BDT",
            language: "en",
          }}
        >
          <Form.Item
            name="currency"
            label="Currency"
            rules={[{ required: true, message: "Please select currency" }]}
          >
            <Select>
              <Option value="BDT">Bangladeshi Taka (BDT)</Option>
              <Option value="USD">US Dollar (USD)</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="language"
            label="Language"
            rules={[{ required: true, message: "Please select language" }]}
          >
            <Select>
              <Option value="en">English</Option>
              <Option value="bn">Bengali</Option>
            </Select>
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              className="w-full"
              icon={<PlayCircleOutlined />}
            >
              Launch Game
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* Config Modal */}
      <Modal
        title={`Configure ${selectedGame?.game_name}`}
        open={configModalVisible}
        onCancel={() => setConfigModalVisible(false)}
        footer={null}
        width={600}
      >
        <GameConfigForm game={selectedGame} onFinish={handleUpdateConfig} />
      </Modal>
    </div>
  );
};

// Game Configuration Form
const GameConfigForm = ({ game, onFinish }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [currentConfig, setCurrentConfig] = useState(null);
  const [configLoading, setConfigLoading] = useState(false);

  useEffect(() => {
    if (game) {
      fetchCurrentConfig();
    }
  }, [game]);

  const fetchCurrentConfig = async () => {
    setConfigLoading(true);
    try {
      const response = await gameAPI.getGameConfig(game._id);
      const config = response.data?.data || response.data;
      setCurrentConfig(config);

      // Set form initial values from the fetched config
      form.setFieldsValue({
        isActive: config.isActive ?? game?.is_active ?? true,
        minBet: config.minBet ?? game?.min_bet ?? 10,
        maxBet: config.maxBet ?? game?.max_bet ?? 10000,
        rtp: config.rtp ?? game?.rtp ?? 95,
        commission: config.commission ?? 5,
        featured: config.featured ?? game?.featured ?? false,
        // ================= HOT GAME =================
        isHot:
          config.isHot ?? config.is_hot ?? game?.isHot ?? game?.is_hot ?? false,
        maintenanceMode: config.maintenanceMode ?? false,
      });
    } catch (error) {
      console.error("Failed to fetch current config:", error);
      // Fallback to game object values
      const fallbackConfig = {
        isActive: game?.is_active ?? true,
        minBet: game?.min_bet ?? 10,
        maxBet: game?.max_bet ?? 10000,
        rtp: game?.rtp ?? 95,
        commission: 5,
        featured: game?.featured ?? false,
        isHot: game?.isHot ?? game?.is_hot ?? false,
        maintenanceMode: false,
      };
      setCurrentConfig(fallbackConfig);
      form.setFieldsValue(fallbackConfig);
      message.warning("Using default configuration values");
    } finally {
      setConfigLoading(false);
    }
  };

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
      {configLoading ? (
        <div className="text-center py-4">
          <Spin size="small" />
          <div className="mt-2">Loading current configuration...</div>
        </div>
      ) : (
        <>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="isActive"
                label={`Active Status (Current: ${currentConfig?.isActive ? "Active" : "Inactive"})`}
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="maintenanceMode"
                label={`Maintenance Mode (Current: ${currentConfig?.maintenanceMode ? "Enabled" : "Disabled"})`}
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            {/* FEATURED GAME */}

            <Col span={12}>
              <Form.Item
                name="featured"
                label={`Featured Game (Current: ${
                  currentConfig?.featured ? "Featured" : "Not Featured"
                })`}
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>

            {/* HOT GAME */}

            <Col span={12}>
              <Form.Item
                name="isHot"
                label={`🔥 Hot Game (Current: ${
                  currentConfig?.isHot || currentConfig?.is_hot
                    ? "HOT"
                    : "Not Hot"
                })`}
                valuePropName="checked"
                initialValue={false}
              >
                <Switch checkedChildren="HOT" unCheckedChildren="OFF" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="minBet"
                label={`Minimum Bet (Current: ${formatCurrency(currentConfig?.minBet || 0)})`}
                rules={[
                  { required: true, message: "Please enter minimum bet" },
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
            <Col span={12}>
              <Form.Item
                name="maxBet"
                label={`Maximum Bet (Current: ${formatCurrency(currentConfig?.maxBet || 10000)})`}
                rules={[
                  { required: true, message: "Please enter maximum bet" },
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
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="rtp"
                label={`RTP (%) (Current: ${currentConfig?.rtp || 95}%)`}
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
                label={`Commission (%) (Current: ${currentConfig?.commission || 5}%)`}
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
              <Button
                onClick={() => {
                  form.resetFields();
                }}
              >
                Reset
              </Button>
            </Space>
          </Form.Item>
        </>
      )}
    </Form>
  );
};

export default GameLauncher;
