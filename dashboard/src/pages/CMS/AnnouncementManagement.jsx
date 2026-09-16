import React, { useEffect, useState } from "react";
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Switch,
  Space,
  Tag,
  Typography,
  Popconfirm,
  message,
  Tooltip,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  SoundOutlined,
} from "@ant-design/icons";
import { announcementAPI } from "../../services/api";
import { formatDate } from "../../utils/helpers";

const { Text, Title, Paragraph } = Typography;
const { TextArea } = Input;

const AnnouncementManagement = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  const [form] = Form.useForm();

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const response = await announcementAPI.getAnnouncements();
      const data = response.data?.data || response.data || [];
      setAnnouncements(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load announcements:", error);
      message.error(
        error.response?.data?.message || "Failed to load announcements",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingItem(null);
    form.resetFields();
    form.setFieldsValue({
      title: "",
      message: "",
      displayOrder: 0,
      isActive: true,
    });
    setModalVisible(true);
  };

  const handleOpenEditModal = (record) => {
    setEditingItem(record);
    form.resetFields();
    form.setFieldsValue({
      title: record.title || "",
      message: record.message || "",
      displayOrder: record.displayOrder ?? 0,
      isActive: record.isActive ?? true,
    });
    setModalVisible(true);
  };

  const handleModalSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      const payload = {
        title: values.title?.trim() || "",
        message: values.message?.trim(),
        displayOrder: Number(values.displayOrder) || 0,
        isActive: Boolean(values.isActive),
      };

      if (editingItem) {
        await announcementAPI.updateAnnouncement(editingItem._id, payload);
        message.success("Announcement updated successfully");
      } else {
        await announcementAPI.createAnnouncement(payload);
        message.success("Announcement created successfully");
      }

      setModalVisible(false);
      fetchAnnouncements();
    } catch (error) {
      if (error?.errorFields) return; // Antd validation error
      console.error("Error saving announcement:", error);
      message.error(
        error.response?.data?.message || "Failed to save announcement",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await announcementAPI.deleteAnnouncement(id);
      message.success("Announcement deleted successfully");
      fetchAnnouncements();
    } catch (error) {
      console.error("Failed to delete announcement:", error);
      message.error(
        error.response?.data?.message || "Failed to delete announcement",
      );
    }
  };

  const handleToggleStatus = async (record, checked) => {
    setTogglingId(record._id);
    try {
      await announcementAPI.toggleStatus(record._id, checked);
      message.success(
        `Announcement ${checked ? "activated" : "deactivated"} successfully`,
      );
      setAnnouncements((prev) =>
        prev.map((item) =>
          item._id === record._id ? { ...item, isActive: checked } : item,
        ),
      );
    } catch (error) {
      console.error("Failed to toggle status:", error);
      message.error(
        error.response?.data?.message || "Failed to update announcement status",
      );
    } finally {
      setTogglingId(null);
    }
  };

  const columns = [
    {
      title: "Order",
      dataIndex: "displayOrder",
      key: "displayOrder",
      width: 90,
      align: "center",
      render: (order) => (
        <Tag color="blue" style={{ minWidth: 28, textAlign: "center" }}>
          {order ?? 0}
        </Tag>
      ),
      sorter: (a, b) => (a.displayOrder || 0) - (b.displayOrder || 0),
    },
    {
      title: "Title",
      dataIndex: "title",
      key: "title",
      width: 180,
      render: (title) =>
        title ? (
          <Text strong>{title}</Text>
        ) : (
          <Text type="secondary" italic>
            (No title)
          </Text>
        ),
    },
    {
      title: "Message / Announcement Content",
      dataIndex: "message",
      key: "message",
      render: (msg) => (
        <Paragraph
          ellipsis={{ rows: 2, expandable: true, symbol: "more" }}
          style={{ marginBottom: 0, whiteSpace: "pre-line" }}
        >
          {msg}
        </Paragraph>
      ),
    },
    {
      title: "Status",
      dataIndex: "isActive",
      key: "isActive",
      width: 130,
      align: "center",
      render: (isActive, record) => (
        <Space orientation="vertical" size={4} align="center">
          <Switch
            checked={Boolean(isActive)}
            loading={togglingId === record._id}
            onChange={(checked) => handleToggleStatus(record, checked)}
          />
          <Tag color={isActive ? "success" : "default"}>
            {isActive ? "Active" : "Inactive"}
          </Tag>
        </Space>
      ),
    },
    {
      title: "Created At",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 160,
      render: (date) => (date ? formatDate(date) : "-"),
      sorter: (a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0),
    },
    {
      title: "Actions",
      key: "actions",
      width: 130,
      align: "center",
      render: (_, record) => (
        <Space orientation="horizontal" size="small">
          <Tooltip title="Edit Announcement">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleOpenEditModal(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Delete Announcement"
            description="Are you sure you want to delete this announcement?"
            onConfirm={() => handleDelete(record._id)}
            okText="Yes"
            cancelText="No"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Delete Announcement">
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: "4px" }}>
      <Card
        title={
          <Space>
            <SoundOutlined style={{ fontSize: 20, color: "#1890ff" }} />
            <div>
              <Title level={4} style={{ margin: 0 }}>
                NewsTicker Announcements
              </Title>
              <Text type="secondary" style={{ fontSize: 13 }}>
                Manage news ticker announcements displayed across the website
              </Text>
            </div>
          </Space>
        }
        extra={
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={fetchAnnouncements}
              loading={loading}
            >
              Refresh
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleOpenCreateModal}
            >
              Add Announcement
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={announcements}
          rowKey="_id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} announcements`,
          }}
          locale={{
            emptyText:
              "No announcements created yet. Click 'Add Announcement' to create one.",
          }}
        />
      </Card>

      {/* CREATE / EDIT MODAL */}
      <Modal
        title={editingItem ? "Edit Announcement" : "Create New Announcement"}
        open={modalVisible}
        onOk={handleModalSubmit}
        onCancel={() => setModalVisible(false)}
        confirmLoading={submitting}
        okText={editingItem ? "Update" : "Create"}
        cancelText="Cancel"
        destroyOnClose
        width={600}
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item
            name="title"
            label="Title (Optional)"
            tooltip="An optional title or headline for internal reference or modal view"
          >
            <Input
              placeholder="e.g. Welcome Offer / Maintenance Notice"
              maxLength={200}
              showCount
            />
          </Form.Item>

          <Form.Item
            name="message"
            label="Announcement Message"
            rules={[
              {
                required: true,
                message: "Please enter the announcement message",
              },
            ]}
            tooltip="This content will scroll continuously in the NewsTicker on the user homepage"
          >
            <TextArea
              placeholder="Enter announcement text to display in the marquee ticker..."
              rows={5}
              maxLength={2000}
              showCount
            />
          </Form.Item>

          <Form.Item
            name="displayOrder"
            label="Display Order / Priority"
            tooltip="Lower numbers appear first in the ticker sequence (e.g. 0, 1, 2)"
          >
            <InputNumber min={0} style={{ width: "100%" }} placeholder="0" />
          </Form.Item>

          <Form.Item
            name="isActive"
            label="Status"
            valuePropName="checked"
            tooltip="Only active announcements appear on the live website"
          >
            <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AnnouncementManagement;
