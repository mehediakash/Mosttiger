import React, { useState, useEffect } from "react";
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  DatePicker,
  Switch,
  Tag,
  message,
  Space,
  Tooltip,
  Row,
  Col,
  Statistic,
  Divider,
  Checkbox,
  Tabs,
  Upload,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  GiftOutlined,
  FileTextOutlined,
  CalendarOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { promotionAPI, gameAPI } from "../../services/api";
import { formatCurrency, formatDate } from "../../utils/helpers";

const { Option } = Select;
const { TabPane } = Tabs;

const IMAGE_MIME_TYPES = ["image/webp", "image/png", "image/jpeg"];
const IMAGE_MAX_SIZE_MB = 2;

const normalizeProviderValue = (provider) => {
  if (!provider) return null;
  if (typeof provider === "object") return provider._id || provider.name;
  return provider;
};

const getPromotionFormValues = (promotion = null) => {
  const bonusConfig = promotion?.bonusConfig || {};
  const freeSpinConfig = promotion?.freeSpinConfig || {};

  return {
    title: promotion?.title || "",
    shortDescription: promotion?.shortDescription || "",
    fullDescription: promotion?.fullDescription || "",
    promoCode: promotion?.promoCode || "",
    type: promotion?.type || "deposit_bonus",
    allowedCategories: promotion?.allowedCategories?.length
      ? promotion.allowedCategories
      : ["ALL"],
    allowedProviders: (promotion?.allowedProviders || [])
      .map(normalizeProviderValue)
      .filter(Boolean),
    excludedProviders: (promotion?.excludedProviders || [])
      .map(normalizeProviderValue)
      .filter(Boolean),
    newUserOnly: !!promotion?.newUserOnly,
    firstDepositOnly: !!promotion?.firstDepositOnly,
    maxUsagePerUser: promotion?.maxUsagePerUser || 1,
    isLifetime: !!promotion?.isLifetime,
    expiresAt: promotion?.expiresAt ? dayjs(promotion.expiresAt) : null,
    bonusMinDeposit: bonusConfig.minDeposit ?? 0,
    bonusMaxDeposit: bonusConfig.maxDeposit ?? null,
    bonusPercent: bonusConfig.bonusPercent ?? 0,
    fixedBonusAmount: bonusConfig.fixedBonusAmount ?? 0,
    maxBonus: bonusConfig.maxBonus ?? null,
    turnoverMultiplier: bonusConfig.turnoverMultiplier ?? 0,
    maxWithdraw: bonusConfig.maxWithdraw ?? null,
    freeSpinCount: freeSpinConfig.freeSpinCount ?? 0,
    freeSpinValue: freeSpinConfig.freeSpinValue ?? 0,
    freeSpinProvider: normalizeProviderValue(freeSpinConfig.freeSpinProvider),
  };
};

const appendPromotionField = (formData, key, value) => {
  if (value === undefined || value === null) return;
  if (Array.isArray(value) || typeof value === "object") {
    formData.append(key, JSON.stringify(value));
    return;
  }
  formData.append(key, value);
};

const buildPromotionFormData = (promotionData, imageOptions = {}) => {
  const formData = new FormData();

  Object.entries(promotionData).forEach(([key, value]) => {
    appendPromotionField(formData, key, value);
  });

  if (imageOptions.imageFile) {
    formData.append("image", imageOptions.imageFile);
  }

  if (imageOptions.removeImage) {
    formData.append("removeImage", "true");
  }

  return formData;
};

const BONUS_TYPES = [
  { value: "deposit_bonus", label: "Deposit Bonus" },
  { value: "free_spin", label: "Free Spin" },
  { value: "cashback", label: "Cashback" },
  { value: "rescue_bonus", label: "Rescue Bonus" },
  { value: "sports_bonus", label: "Sports Bonus" },
  { value: "welcome_bonus", label: "Welcome Bonus" },
];

const CATEGORIES = [
  { value: "ALL", label: "All Categories" },
  { value: "Sports", label: "Sports" },
  { value: "Casino", label: "Casino" },
  { value: "Slots", label: "Slots" },
  { value: "Fishing", label: "Fishing" },
  { value: "Lottery", label: "Lottery" },
  { value: "Arcade", label: "Arcade" },
  { value: "Crash", label: "Crash" },
];

const PromotionManagement = () => {
  const [promotions, setPromotions] = useState([]);
  const [providers, setProviders] = useState([]);
  const [categoryOptions, setCategoryOptions] = useState(CATEGORIES);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPromotion, setSelectedPromotion] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    expired: 0,
  });
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });
  const [filters, setFilters] = useState({});
  const [form] = Form.useForm();

  useEffect(() => {
    loadPromotions();
    loadPromotionFormData();
  }, [pagination.current, filters]);

  const loadPromotions = async () => {
    setLoading(true);
    try {
      const response = await promotionAPI.getAllPromotions({
        page: pagination.current,
        limit: pagination.pageSize,
        ...filters,
      });

      const data = response.data.data || response.data;
      const promos = Array.isArray(data) ? data : data.promotions || [];

      setPromotions(promos);
      setPagination((prev) => ({
        ...prev,
        total: data.total || promos.length,
      }));

      // Calculate stats
      const now = new Date();
      const calculatedStats = {
        total: promos.length,
        active: promos.filter((p) => p.status === "active").length,
        inactive: promos.filter((p) => p.status === "inactive").length,
        expired: promos.filter(
          (p) => p.expiresAt && new Date(p.expiresAt) < now,
        ).length,
      };
      setStats(calculatedStats);
    } catch (error) {
      console.error("Failed to load promotions:", error);
      message.error(
        "Failed to load promotions: " +
          (error.response?.data?.message || error.message),
      );
    } finally {
      setLoading(false);
    }
  };

  const loadPromotionFormData = async () => {
    try {
      const response = await gameAPI.getPromotionFormData();
      const payload = response.data.data || response.data;
      setProviders(Array.isArray(payload?.providers) ? payload.providers : []);
      setCategoryOptions(
        Array.isArray(payload?.categories) && payload.categories.length > 0
          ? payload.categories.map((category) => ({
              value: category,
              label: category,
            }))
          : CATEGORIES,
      );
    } catch (error) {
      console.error("Failed to load promotion form data:", error);
      setProviders([]);
      setCategoryOptions(CATEGORIES);
    }
  };

  const handleTableChange = (newPagination) => {
    setPagination({
      ...pagination,
      current: newPagination.current,
      pageSize: newPagination.pageSize,
    });
  };

  const handleCreatePromotion = async (values, imageOptions = {}) => {
    try {
      const promotionData = {
        title: values.title,
        shortDescription: values.shortDescription,
        fullDescription: values.fullDescription,
        promoCode: values.promoCode ? values.promoCode.toUpperCase() : null,
        type: values.type,
        allowedCategories: values.allowedCategories || ["ALL"],
        allowedProviders: values.allowedProviders || [],
        excludedProviders: values.excludedProviders || [],
        newUserOnly: !!values.newUserOnly,
        firstDepositOnly: !!values.firstDepositOnly,
        maxUsagePerUser: values.maxUsagePerUser || 1,
        isLifetime: values.isLifetime,
        expiresAt:
          !values.isLifetime && values.expiresAt
            ? values.expiresAt.toISOString()
            : null,
        bonusConfig: {
          minDeposit: values.bonusMinDeposit || 0,
          maxDeposit: values.bonusMaxDeposit || null,
          bonusPercent: values.bonusPercent || 0,
          fixedBonusAmount: values.fixedBonusAmount || 0,
          maxBonus: values.maxBonus || null,
          turnoverMultiplier: values.turnoverMultiplier || 0,
          maxWithdraw: values.maxWithdraw || null,
        },
        freeSpinConfig: {
          freeSpinCount: values.freeSpinCount || 0,
          freeSpinValue: values.freeSpinValue || 0,
          freeSpinProvider: values.freeSpinProvider || null,
        },
      };
      const payload =
        imageOptions.imageFile || imageOptions.removeImage
          ? buildPromotionFormData(promotionData, imageOptions)
          : promotionData;

      if (selectedPromotion) {
        await promotionAPI.updatePromotion(
          selectedPromotion._id,
          payload,
        );
        message.success("Promotion updated successfully");
      } else {
        await promotionAPI.createPromotion(payload);
        message.success("Promotion created successfully");
      }
      setModalVisible(false);
      form.resetFields();
      setSelectedPromotion(null);
      loadPromotions();
    } catch (error) {
      console.error("Operation failed:", error);
      message.error(
        "Operation failed: " + (error.response?.data?.message || error.message),
      );
    }
  };

  const handleToggleStatus = async (promoId, currentStatus) => {
    try {
      if (currentStatus === "active") {
        await promotionAPI.deactivatePromotion(promoId);
        message.success("Promotion deactivated successfully");
      } else {
        await promotionAPI.activatePromotion(promoId);
        message.success("Promotion activated successfully");
      }
      loadPromotions();
    } catch (error) {
      message.error("Failed to update status");
    }
  };

  const handleDeletePromotion = async (promoId) => {
    Modal.confirm({
      title: "Delete Promotion",
      content:
        "Are you sure you want to delete this promotion? This action cannot be undone.",
      okText: "Delete",
      okType: "danger",
      onOk: async () => {
        try {
          await promotionAPI.deletePromotion(promoId);
          message.success("Promotion deleted successfully");
          loadPromotions();
        } catch (error) {
          message.error("Failed to delete promotion");
        }
      },
    });
  };

  const columns = [
    {
      title: "Title",
      dataIndex: "title",
      key: "title",
      width: 150,
      render: (title) => <span className="font-semibold">{title}</span>,
    },
    {
      title: "Code",
      dataIndex: "promoCode",
      key: "promoCode",
      width: 100,
      render: (code) =>
        code ? <span className="font-mono font-bold">{code}</span> : "—",
    },
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
      width: 120,
      render: (type) => {
        const typeObj = BONUS_TYPES.find((t) => t.value === type);
        return <Tag color="blue">{typeObj?.label || type}</Tag>;
      },
    },
    {
      title: "Audience",
      key: "audience",
      width: 140,
      render: (_, record) =>
        record.newUserOnly || record.firstDepositOnly ? (
          <Tag color="gold">New Users Only</Tag>
        ) : (
          <Tag color="default">All Users</Tag>
        ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (status, record) => {
        const isExpired =
          record.expiresAt && new Date(record.expiresAt) < new Date();
        return (
          <Space direction="vertical" size={0}>
            <Tag color={status === "active" ? "green" : "red"}>
              {status.toUpperCase()}
            </Tag>
            {isExpired && <Tag color="orange">EXPIRED</Tag>}
          </Space>
        );
      },
    },
    {
      title: "Expiry",
      dataIndex: "expiresAt",
      key: "expiresAt",
      width: 120,
      render: (date, record) => {
        if (record.isLifetime)
          return <span className="text-blue-600">Lifetime</span>;
        return date ? formatDate(date) : "No expiry";
      },
    },
    {
      title: "Bonus Config",
      key: "bonusConfig",
      width: 150,
      render: (_, record) => {
        const { bonusConfig } = record;
        return (
          <div className="text-sm space-y-1">
            {bonusConfig?.bonusPercent > 0 && (
              <div>{bonusConfig.bonusPercent}% bonus</div>
            )}
            {bonusConfig?.fixedBonusAmount > 0 && (
              <div>৳{bonusConfig.fixedBonusAmount}</div>
            )}
            {bonusConfig?.turnoverMultiplier > 0 && (
              <div>{bonusConfig.turnoverMultiplier}x turnover</div>
            )}
          </div>
        );
      },
    },
    {
      title: "Free Spins",
      key: "freeSpins",
      width: 100,
      render: (_, record) => {
        const { freeSpinConfig } = record;
        return freeSpinConfig?.freeSpinCount > 0 ? (
          <span>{freeSpinConfig.freeSpinCount} spins</span>
        ) : (
          "—"
        );
      },
    },
    {
      title: "Actions",
      key: "actions",
      fixed: "right",
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Edit">
            <Button
              type="text"
              icon={<EditOutlined />}
              size="small"
              onClick={() => {
                setSelectedPromotion(record);
                form.setFieldsValue(getPromotionFormValues(record));
                setModalVisible(true);
              }}
            />
          </Tooltip>
          <Tooltip
            title={record.status === "active" ? "Deactivate" : "Activate"}
          >
            <Button
              type="text"
              size="small"
              onClick={() => handleToggleStatus(record._id, record.status)}
            >
              <Switch size="small" checked={record.status === "active"} />
            </Button>
          </Tooltip>
          <Tooltip title="Delete">
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              size="small"
              onClick={() => handleDeletePromotion(record._id)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Total Promotions"
              value={stats.total}
              prefix={<GiftOutlined />}
              valueStyle={{ color: "#1890ff" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Active"
              value={stats.active}
              prefix={<GiftOutlined />}
              valueStyle={{ color: "#52c41a" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Inactive"
              value={stats.inactive}
              prefix={<GiftOutlined />}
              valueStyle={{ color: "#faad14" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Expired"
              value={stats.expired}
              prefix={<CalendarOutlined />}
              valueStyle={{ color: "#cf1322" }}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <div className="mb-4 flex justify-between items-center">
          <Space>
            <Select
              placeholder="Filter by status"
              style={{ width: 150 }}
              allowClear
              onChange={(value) => {
                setFilters({ ...filters, status: value });
                setPagination({ ...pagination, current: 1 });
              }}
            >
              <Option value="active">Active</Option>
              <Option value="inactive">Inactive</Option>
            </Select>
          </Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setSelectedPromotion(null);
              form.resetFields();
              setModalVisible(true);
            }}
          >
            Create Promotion
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={promotions}
          loading={loading}
          scroll={{ x: 1400 }}
          rowKey="_id"
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} promotions`,
          }}
          onChange={handleTableChange}
        />
      </Card>

      {/* Create/Edit Promotion Modal */}
      <Modal
        title={selectedPromotion ? "Edit Promotion" : "Create Promotion"}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
          setSelectedPromotion(null);
        }}
        footer={null}
        width={900}
        style={{ top: 20 }}
        bodyStyle={{ maxHeight: "75vh", overflowY: "auto" }}
        destroyOnClose
      >
        <PromotionForm
          form={form}
          onFinish={handleCreatePromotion}
          initialValues={selectedPromotion}
          providers={providers}
          categoryOptions={categoryOptions}
        />
      </Modal>
    </div>
  );
};

// Promotion Form Component
const PromotionForm = ({
  form,
  onFinish,
  initialValues,
  providers,
  categoryOptions,
}) => {
  const [loading, setLoading] = useState(false);
  const [isLifetime, setIsLifetime] = useState(false);
  const [imageFileList, setImageFileList] = useState([]);
  const [currentImageUrl, setCurrentImageUrl] = useState("");
  const [imageRemoved, setImageRemoved] = useState(false);

  const resetFormState = () => {
    const formValues = getPromotionFormValues(initialValues);
    form.setFieldsValue(formValues);
    setIsLifetime(formValues.isLifetime);
    setImageFileList([]);
    setCurrentImageUrl(initialValues?.imageUrl || "");
    setImageRemoved(false);
  };

  useEffect(() => {
    resetFormState();
  }, [initialValues]);

  const validateImage = (file) => {
    if (!IMAGE_MIME_TYPES.includes(file.type)) {
      message.error("Only WEBP, PNG, and JPEG images are allowed");
      return Upload.LIST_IGNORE;
    }

    if (file.size / 1024 / 1024 > IMAGE_MAX_SIZE_MB) {
      message.error("Image size must not exceed 2 MB");
      return Upload.LIST_IGNORE;
    }

    return false;
  };

  const handleImageChange = ({ fileList }) => {
    setImageFileList(fileList.slice(-1));
    if (fileList.length > 0) {
      setImageRemoved(false);
    }
  };

  const handleRemoveCurrentImage = () => {
    setCurrentImageUrl("");
    setImageRemoved(true);
  };

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const imageFile =
        imageFileList[0]?.originFileObj || imageFileList[0] || null;
      await onFinish(values, {
        imageFile,
        removeImage: imageRemoved && !imageFile,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSubmit}
      initialValues={getPromotionFormValues(initialValues)}
    >
      <Tabs>
        {/* Basic Info Tab */}
        <TabPane tab="Basic Info" key="basic">
          <Form.Item
            name="title"
            label="Promotion Title"
            rules={[
              { required: true, message: "Please enter promotion title" },
            ]}
          >
            <Input placeholder="e.g., Welcome Bonus 100%" />
          </Form.Item>

          <Form.Item name="shortDescription" label="Short Description">
            <Input placeholder="Brief description (100 characters)" />
          </Form.Item>

          <Form.Item name="fullDescription" label="Full Description">
            <Input.TextArea
              placeholder="Detailed promotion description"
              rows={3}
            />
          </Form.Item>

          <Form.Item label="Promotion Image">
            {currentImageUrl && !imageFileList.length && !imageRemoved && (
              <div className="mb-3 flex items-center gap-3">
                <img
                  src={currentImageUrl}
                  alt="Promotion"
                  className="h-20 w-32 rounded border object-cover"
                />
                <Button danger onClick={handleRemoveCurrentImage}>
                  Remove Image
                </Button>
              </div>
            )}
            <Upload
              accept="image/webp,image/png,image/jpeg"
              beforeUpload={validateImage}
              fileList={imageFileList}
              listType="picture"
              maxCount={1}
              onChange={handleImageChange}
              onRemove={() => {
                setImageFileList([]);
                return true;
              }}
            >
              <Button icon={<UploadOutlined />}>
                {currentImageUrl && !imageRemoved
                  ? "Replace Image"
                  : "Upload Image"}
              </Button>
            </Upload>
            <div className="mt-2 text-xs text-gray-500">
              WEBP, PNG, or JPEG only. Maximum size 2 MB.
            </div>
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="promoCode" label="Promo Code (Optional)">
                <Input
                  placeholder="e.g., WELCOME100"
                  style={{ textTransform: "uppercase" }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="type"
                label="Promotion Type"
                rules={[{ required: true, message: "Please select type" }]}
              >
                <Select placeholder="Select promotion type">
                  {BONUS_TYPES.map((type) => (
                    <Option key={type.value} value={type.value}>
                      {type.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </TabPane>

        {/* Targeting Tab */}
        <TabPane tab="Targeting" key="targeting">
          <Form.Item
            name="allowedCategories"
            label="Allowed Categories"
            rules={[
              {
                required: true,
                message: "Please select at least one category",
              },
            ]}
          >
            <Select mode="multiple" placeholder="Select categories">
              {categoryOptions.map((cat) => (
                <Option key={cat.value} value={cat.value}>
                  {cat.label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="allowedProviders" label="Allowed Providers">
            <Select
              mode="multiple"
              placeholder="Select providers (leave empty for all)"
            >
              {providers.map((provider) => (
                <Option key={provider} value={provider}>
                  {provider}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="excludedProviders" label="Excluded Providers">
            <Select mode="multiple" placeholder="Select providers to exclude">
              {providers.map((provider) => (
                <Option key={provider} value={provider}>
                  {provider}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="newUserOnly"
                label="New Users Only"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="maxUsagePerUser" label="Max Usage Per User">
                <InputNumber min={1} className="w-full" />
              </Form.Item>
            </Col>
          </Row>

          <div className="-mt-2 mb-4 text-xs text-gray-500">
            This promotion will only be available to users who have never
            completed a deposit.
          </div>
        </TabPane>

        {/* Bonus Settings Tab */}
        <TabPane tab="Bonus Settings" key="bonus">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="bonusPercent" label="Bonus Percentage">
                <InputNumber
                  placeholder="e.g., 100"
                  min={0}
                  max={1000}
                  className="w-full"
                  addonAfter="%"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="fixedBonusAmount" label="Fixed Bonus Amount">
                <InputNumber
                  placeholder="Fixed amount"
                  min={0}
                  className="w-full"
                  addonAfter="৳"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="bonusMinDeposit" label="Minimum Deposit">
                <InputNumber
                  placeholder="Minimum deposit required"
                  min={0}
                  className="w-full"
                  addonAfter="৳"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="bonusMaxDeposit" label="Maximum Deposit">
                <InputNumber
                  placeholder="Maximum deposit allowed"
                  min={0}
                  className="w-full"
                  addonAfter="৳"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="maxBonus" label="Maximum Bonus">
                <InputNumber
                  placeholder="Maximum bonus amount"
                  min={0}
                  className="w-full"
                  addonAfter="৳"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="maxWithdraw" label="Maximum Withdrawal">
                <InputNumber
                  placeholder="Maximum withdrawal from bonus"
                  min={0}
                  className="w-full"
                  addonAfter="৳"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="turnoverMultiplier" label="Turnover Multiplier">
            <InputNumber
              placeholder="e.g., 5 for 5x"
              min={0}
              className="w-full"
              addonAfter="x"
            />
          </Form.Item>
        </TabPane>

        {/* Free Spin Settings Tab */}
        <TabPane tab="Free Spins" key="freespins">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="freeSpinCount" label="Free Spin Count">
                <InputNumber
                  placeholder="Number of free spins"
                  min={0}
                  className="w-full"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="freeSpinValue" label="Free Spin Value">
                <InputNumber
                  placeholder="Value per spin"
                  min={0}
                  className="w-full"
                  addonAfter="৳"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="freeSpinProvider" label="Free Spin Provider">
            <Select placeholder="Select provider for free spins (optional)">
              {providers.map((provider) => (
                <Option key={provider} value={provider}>
                  {provider}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </TabPane>

        {/* Expiry Tab */}
        <TabPane tab="Expiry" key="expiry">
          <Form.Item
            name="isLifetime"
            label="Lifetime Promotion"
            valuePropName="checked"
          >
            <Switch onChange={(checked) => setIsLifetime(checked)} />
          </Form.Item>

          {!isLifetime && (
            <Form.Item
              name="expiresAt"
              label="Expiry Date & Time"
              rules={[
                { required: !isLifetime, message: "Please select expiry date" },
              ]}
            >
              <DatePicker
                className="w-full"
                showTime
                format="YYYY-MM-DD HH:mm:ss"
                disabledDate={(current) =>
                  current && current < dayjs().startOf("day")
                }
              />
            </Form.Item>
          )}
        </TabPane>
      </Tabs>

      <Divider />

      <Form.Item>
        <Space>
          <Button type="primary" htmlType="submit" loading={loading}>
            {initialValues ? "Update Promotion" : "Create Promotion"}
          </Button>
          <Button
            onClick={() => {
              resetFormState();
            }}
          >
            Reset
          </Button>
        </Space>
      </Form.Item>
    </Form>
  );
};

export default PromotionManagement;
