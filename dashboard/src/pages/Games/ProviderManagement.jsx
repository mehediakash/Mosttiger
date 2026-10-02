import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Card,
  Table,
  Button,
  Tag,
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
  Typography,
} from "antd";
import {
  EditOutlined,
  SearchOutlined,
  ReloadOutlined,
  PlusOutlined,
  OrderedListOutlined,
  ClearOutlined,
  CheckCircleOutlined,
  StopOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import { providerAPI } from "../../services/api";

const { Title, Text } = Typography;
const { Option } = Select;

const ProviderManagement = () => {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [counts, setCounts] = useState({ total: 0, ordered: 0, unordered: 0 });
  const [searchText, setSearchText] = useState("");
  const [orderFilter, setOrderFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editingProvider, setEditingProvider] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [editForm] = Form.useForm();
  const [addForm] = Form.useForm();

  const loadProviders = useCallback(async () => {
    setLoading(true);
    try {
      const response = await providerAPI.getAdminProviders();
      const list = response.data?.data || [];
      setProviders(list);

      const ordered = list.filter(
        (p) =>
          p.displayOrder !== null &&
          p.displayOrder !== undefined &&
          p.displayOrder >= 1
      ).length;

      setCounts({
        total: list.length,
        ordered,
        unordered: list.length - ordered,
      });
    } catch (error) {
      console.error("Failed to load providers:", error);
      message.error(error.response?.data?.message || "Failed to load providers");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProviders();
  }, [loadProviders]);

  const filteredProviders = useMemo(() => {
    return providers.filter((p) => {
      if (
        searchText &&
        !p.name.toLowerCase().includes(searchText.toLowerCase().trim())
      ) {
        return false;
      }
      if (statusFilter !== "all" && p.status !== statusFilter) {
        return false;
      }
      const hasOrder =
        p.displayOrder !== null &&
        p.displayOrder !== undefined &&
        p.displayOrder >= 1;

      if (orderFilter === "ordered" && !hasOrder) return false;
      if (orderFilter === "unordered" && hasOrder) return false;

      return true;
    });
  }, [providers, searchText, statusFilter, orderFilter]);

  const handleEditClick = (record) => {
    setEditingProvider(record);
    editForm.setFieldsValue({
      name: record.name,
      displayOrder: record.displayOrder ?? null,
      status: record.status || "Active",
    });
    setEditModalVisible(true);
  };

  const handleEditSubmit = async () => {
    try {
      const values = await editForm.validateFields();
      setSubmitting(true);

      const displayOrder =
        values.displayOrder === undefined ||
        values.displayOrder === null ||
        values.displayOrder === ""
          ? null
          : Number(values.displayOrder);

      await providerAPI.updateProvider(editingProvider._id, {
        displayOrder,
        status: values.status,
      });

      message.success(
        displayOrder !== null
          ? `Display order set to ${displayOrder} for ${editingProvider.name}`
          : `Custom display order removed for ${editingProvider.name} (Auto Z-A)`
      );

      setEditModalVisible(false);
      setEditingProvider(null);
      await loadProviders();
    } catch (error) {
      if (error.errorFields) return;
      console.error("Update provider error:", error);
      message.error(error.response?.data?.message || "Failed to update provider");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClearOrder = async (record) => {
    try {
      setLoading(true);
      await providerAPI.updateProvider(record._id, { displayOrder: null });
      message.success(`Custom display order cleared for ${record.name}`);
      await loadProviders();
    } catch (error) {
      message.error(error.response?.data?.message || "Failed to clear display order");
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubmit = async () => {
    try {
      const values = await addForm.validateFields();
      setSubmitting(true);

      const displayOrder =
        values.displayOrder === undefined ||
        values.displayOrder === null ||
        values.displayOrder === ""
          ? null
          : Number(values.displayOrder);

      await providerAPI.createProvider({
        name: values.name.trim(),
        displayOrder,
        status: values.status || "Active",
      });

      message.success(`Provider "${values.name.trim()}" added successfully`);
      addForm.resetFields();
      setAddModalVisible(false);
      await loadProviders();
    } catch (error) {
      if (error.errorFields) return;
      console.error("Create provider error:", error);
      message.error(error.response?.data?.message || "Failed to create provider");
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      title: "#",
      key: "index",
      width: 60,
      align: "center",
      render: (_, __, index) => (
        <Text type="secondary" style={{ fontSize: "12px" }}>
          {index + 1}
        </Text>
      ),
    },
    {
      title: "Provider",
      dataIndex: "name",
      key: "name",
      render: (name) => (
        <Space direction="vertical" size={1}>
          <Text strong style={{ fontSize: "14px" }}>
            {name}
          </Text>
        </Space>
      ),
    },
    {
      title: "Display Order",
      dataIndex: "displayOrder",
      key: "displayOrder",
      width: 160,
      render: (order) => {
        if (order !== null && order !== undefined && order >= 1) {
          return (
            <Tooltip title={`Priority #${order} (Displays before unordered providers)`}>
              <Tag
                color="blue"
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  padding: "2px 10px",
                  borderRadius: "6px",
                }}
              >
                #{order}
              </Tag>
            </Tooltip>
          );
        }
        return (
          <Tooltip title="No manual order assigned. Automatically sorted Z-A">
            <span style={{ color: "#8c8c8c", fontWeight: 500 }}>-</span>
          </Tooltip>
        );
      },
    },
    {
      title: "Sort Priority",
      key: "sortType",
      width: 170,
      render: (_, record) => {
        const hasOrder =
          record.displayOrder !== null &&
          record.displayOrder !== undefined &&
          record.displayOrder >= 1;

        if (hasOrder) {
          return (
            <Tag color="cyan">
              <OrderedListOutlined style={{ marginRight: 4 }} />
              Manual (#{record.displayOrder})
            </Tag>
          );
        }
        return <Tag color="default">Auto (Z → A)</Tag>;
      },
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 110,
      render: (status) =>
        status === "Active" ? (
          <Tag color="success" icon={<CheckCircleOutlined />}>
            Active
          </Tag>
        ) : (
          <Tag color="error" icon={<StopOutlined />}>
            Inactive
          </Tag>
        ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 160,
      render: (_, record) => {
        const hasOrder =
          record.displayOrder !== null &&
          record.displayOrder !== undefined &&
          record.displayOrder >= 1;

        return (
          <Space size="small">
            <Button
              type="primary"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEditClick(record)}
            >
              Edit
            </Button>
            {hasOrder && (
              <Popconfirm
                title="Remove Custom Order"
                description={`Reset ${record.name} to automatic Z-A sorting?`}
                onConfirm={() => handleClearOrder(record)}
                okText="Remove"
                cancelText="Cancel"
              >
                <Button
                  size="small"
                  type="text"
                  danger
                  icon={<ClearOutlined />}
                  title="Remove order"
                >
                  Clear
                </Button>
              </Popconfirm>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <div style={{ padding: "4px 0" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <Title level={4} style={{ margin: 0 }}>
            Provider Display Order
          </Title>
          <Text type="secondary" style={{ fontSize: "13px" }}>
            Admin Panel → Games & Providers → Providers
          </Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={loadProviders} loading={loading}>
            Refresh
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              addForm.resetFields();
              setAddModalVisible(true);
            }}
          >
            Add Provider
          </Button>
        </Space>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={8}>
          <Card size="small" style={{ borderRadius: 8 }}>
            <Text type="secondary">Total Providers</Text>
            <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>
              {counts.total}
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small" style={{ borderRadius: 8, borderColor: "#91caff" }}>
            <Text type="secondary">
              <Badge status="processing" color="#1677ff" /> Manually Ordered (Priority)
            </Text>
            <div
              style={{
                fontSize: 22,
                fontWeight: 700,
                marginTop: 4,
                color: "#1677ff",
              }}
            >
              {counts.ordered}
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small" style={{ borderRadius: 8 }}>
            <Text type="secondary">
              <Badge status="default" /> Automatic (Z → A Descending)
            </Text>
            <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>
              {counts.unordered}
            </div>
          </Card>
        </Col>
      </Row>

      <Card
        size="small"
        style={{
          marginBottom: 16,
          backgroundColor: "#f6ffed",
          border: "1px solid #b7eb8f",
          borderRadius: 8,
        }}
      >
        <Space align="start">
          <InfoCircleOutlined style={{ color: "#52c41a", marginTop: 3 }} />
          <Text style={{ fontSize: "12.5px", color: "#389e0d" }}>
            <strong>Display Ordering Rule:</strong> Providers with a custom numeric order appear{" "}
            <strong>FIRST (1 → 2 → 3...)</strong>. Providers without a custom order appear{" "}
            <strong>AFTER them, automatically sorted Z → A</strong>. Duplicate order values are
            deterministically resolved via Z → A fallback.
          </Text>
        </Space>
      </Card>

      <Card style={{ borderRadius: 8 }}>
        <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={8} md={8}>
            <Input
              placeholder="Search provider name..."
              prefix={<SearchOutlined />}
              allowClear
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </Col>
          <Col xs={12} sm={8} md={6}>
            <Select
              style={{ width: "100%" }}
              value={orderFilter}
              onChange={setOrderFilter}
            >
              <Option value="all">All Ordering Types</Option>
              <Option value="ordered">With Custom Order</Option>
              <Option value="unordered">Without Order (Auto Z-A)</Option>
            </Select>
          </Col>
          <Col xs={12} sm={8} md={6}>
            <Select
              style={{ width: "100%" }}
              value={statusFilter}
              onChange={setStatusFilter}
            >
              <Option value="all">All Statuses</Option>
              <Option value="Active">Active Only</Option>
              <Option value="Inactive">Inactive Only</Option>
            </Select>
          </Col>
        </Row>

        <Table
          dataSource={filteredProviders}
          columns={columns}
          rowKey="_id"
          loading={loading}
          pagination={{
            pageSize: 25,
            showSizeChanger: true,
            pageSizeOptions: ["10", "25", "50", "100"],
            showTotal: (total) => `Total ${total} providers`,
          }}
          size="middle"
        />
      </Card>

      <Modal
        title={`Edit Provider - ${editingProvider?.name || ""}`}
        open={editModalVisible}
        onOk={handleEditSubmit}
        onCancel={() => {
          setEditModalVisible(false);
          setEditingProvider(null);
        }}
        confirmLoading={submitting}
        okText="Save Changes"
        destroyOnClose
      >
        <Form form={editForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item label="Provider Name" name="name">
            <Input disabled />
          </Form.Item>

          <Form.Item
            label="Display Order"
            name="displayOrder"
            help="Lower number = higher position. Leave empty for automatic Z-A sorting."
            rules={[
              {
                validator: async (_, value) => {
                  if (value === undefined || value === null || value === "") {
                    return Promise.resolve();
                  }
                  const num = Number(value);
                  if (Number.isNaN(num) || !Number.isInteger(num) || num < 1) {
                    return Promise.reject(
                      new Error("Display order must be a positive integer (1, 2, 3...)")
                    );
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <InputNumber
              style={{ width: "100%" }}
              placeholder="Leave empty for automatic Z-A sorting"
              min={1}
              step={1}
              precision={0}
            />
          </Form.Item>

          <Form.Item label="Status" name="status" initialValue="Active">
            <Select>
              <Option value="Active">Active</Option>
              <Option value="Inactive">Inactive</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Add New Provider"
        open={addModalVisible}
        onOk={handleAddSubmit}
        onCancel={() => {
          setAddModalVisible(false);
        }}
        confirmLoading={submitting}
        okText="Add Provider"
        destroyOnClose
      >
        <Form form={addForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            label="Provider Name"
            name="name"
            rules={[
              { required: true, message: "Please enter provider name" },
              { whitespace: true, message: "Provider name cannot be empty" },
            ]}
          >
            <Input placeholder="e.g. Pragmatic Play, PG Soft, Evolution" />
          </Form.Item>

          <Form.Item
            label="Display Order (Optional)"
            name="displayOrder"
            help="Lower number = higher position. Leave empty for automatic Z-A sorting."
            rules={[
              {
                validator: async (_, value) => {
                  if (value === undefined || value === null || value === "") {
                    return Promise.resolve();
                  }
                  const num = Number(value);
                  if (Number.isNaN(num) || !Number.isInteger(num) || num < 1) {
                    return Promise.reject(
                      new Error("Display order must be a positive integer (1, 2, 3...)")
                    );
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <InputNumber
              style={{ width: "100%" }}
              placeholder="Leave empty for automatic Z-A sorting"
              min={1}
              step={1}
              precision={0}
            />
          </Form.Item>

          <Form.Item label="Status" name="status" initialValue="Active">
            <Select>
              <Option value="Active">Active</Option>
              <Option value="Inactive">Inactive</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ProviderManagement;
