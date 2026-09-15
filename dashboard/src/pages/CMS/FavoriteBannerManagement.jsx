import React, { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Col,
  Form,
  Image,
  Input,
  InputNumber,
  message,
  Modal,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Upload,
} from "antd";
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
  SaveOutlined,
  SearchOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { cmsAPI } from "../../services/api";
import { formatDate } from "../../utils/helpers";

const bannerTypes = [
  { value: "favorite-slider", label: "Favorite Slider" },
  { value: "home-slider", label: "Home Slider" },
  { value: "promotion-banner", label: "Promotion Banner" },
  { value: "popup-banner", label: "Popup Banner" },
  { value: "announcement-banner", label: "Announcement Banner" },
];

const statusOptions = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const allowedImageTypes = ["image/webp", "image/png", "image/jpeg"];
const maxImageSize = 2 * 1024 * 1024;

const getListPayload = (response) => {
  const data = response?.data?.data || {};
  return {
    banners: data.banners || [],
    pagination: data.pagination || {},
  };
};

const appendBannerFormData = (values, file) => {
  const formData = new FormData();
  ["title", "description", "bannerType", "targetUrl", "status"].forEach((key) => {
    if (values[key] !== undefined && values[key] !== null) {
      formData.append(key, values[key]);
    }
  });
  formData.append("sortOrder", String(values.sortOrder || 0));
  if (file) formData.append("image", file);
  return formData;
};

const validateImageFile = (file) => {
  if (!allowedImageTypes.includes(file.type)) {
    message.error("Only WEBP, PNG, and JPEG images are allowed");
    return Upload.LIST_IGNORE;
  }

  if (file.size > maxImageSize) {
    message.error("Image size must not exceed 2 MB");
    return Upload.LIST_IGNORE;
  }

  return false;
};

const FavoriteBannerManagement = () => {
  const [form] = Form.useForm();
  const [filterForm] = Form.useForm();
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedBanner, setSelectedBanner] = useState(null);
  const [fileList, setFileList] = useState([]);
  const [filters, setFilters] = useState({ bannerType: "favorite-slider" });
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });

  const loadBanners = async () => {
    setLoading(true);
    try {
      const response = await cmsAPI.getBanners({
        page: pagination.current,
        limit: pagination.pageSize,
        ...filters,
      });
      const payload = getListPayload(response);
      setBanners(payload.banners);
      setPagination((prev) => ({
        ...prev,
        total: payload.pagination.total || 0,
      }));
    } catch (error) {
      message.error(error.response?.data?.message || "Failed to load banners");
      setBanners([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBanners();
  }, [filters, pagination.current, pagination.pageSize]);

  const openCreate = () => {
    setSelectedBanner(null);
    setFileList([]);
    form.resetFields();
    form.setFieldsValue({
      bannerType: "favorite-slider",
      status: "active",
      sortOrder: 0,
    });
    setModalOpen(true);
  };

  const openEdit = (record) => {
    setSelectedBanner(record);
    setFileList([]);
    form.setFieldsValue({
      title: record.title,
      description: record.description,
      bannerType: record.bannerType,
      targetUrl: record.targetUrl,
      sortOrder: record.sortOrder,
      status: record.status,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (values) => {
    const imageFile = fileList[0]?.originFileObj;

    if (!selectedBanner && !imageFile) {
      message.error("Banner image is required");
      return;
    }

    setSaving(true);
    try {
      const formData = appendBannerFormData(values, imageFile);
      if (selectedBanner) {
        await cmsAPI.updateBanner(selectedBanner._id, formData);
        message.success("Banner updated successfully");
      } else {
        await cmsAPI.createBanner(formData);
        message.success("Banner created successfully");
      }
      setModalOpen(false);
      setSelectedBanner(null);
      setFileList([]);
      form.resetFields();
      loadBanners();
    } catch (error) {
      message.error(error.response?.data?.message || "Failed to save banner");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (record) => {
    Modal.confirm({
      title: "Delete Banner",
      content: `Are you sure you want to delete "${record.title}"?`,
      okText: "Delete",
      okType: "danger",
      onOk: async () => {
        await cmsAPI.deleteBanner(record._id);
        message.success("Banner deleted successfully");
        loadBanners();
      },
    });
  };

  const saveOrder = async () => {
    try {
      await cmsAPI.reorderBanners(
        banners.map((banner) => ({
          id: banner._id,
          sortOrder: banner.sortOrder,
        })),
      );
      message.success("Banner order saved");
      loadBanners();
    } catch (error) {
      message.error(error.response?.data?.message || "Failed to save order");
    }
  };

  const rows = useMemo(
    () =>
      banners.map((banner) => ({
        ...banner,
        key: banner._id,
      })),
    [banners],
  );

  const columns = [
    {
      title: "Preview Image",
      dataIndex: "image",
      width: 130,
      render: (image, record) => (
        <Image
          src={image}
          alt={record.title}
          width={96}
          height={54}
          style={{ objectFit: "cover", borderRadius: 6 }}
        />
      ),
    },
    {
      title: "Title",
      dataIndex: "title",
      sorter: (a, b) => a.title.localeCompare(b.title),
    },
    {
      title: "Banner Type",
      dataIndex: "bannerType",
      render: (value) => <Tag color="blue">{value}</Tag>,
    },
    {
      title: "Sort Order",
      dataIndex: "sortOrder",
      width: 140,
      render: (value, record) => (
        <InputNumber
          min={0}
          value={value}
          onChange={(nextValue) => {
            setBanners((items) =>
              items.map((item) =>
                item._id === record._id
                  ? { ...item, sortOrder: Number(nextValue || 0) }
                  : item,
              ),
            );
          }}
        />
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      render: (status, record) => (
        <Select
          value={status}
          style={{ width: 120 }}
          options={statusOptions}
          onChange={async (value) => {
            await cmsAPI.updateBannerStatus(record._id, { status: value });
            message.success("Status updated");
            loadBanners();
          }}
        />
      ),
    },
    {
      title: "Created Date",
      dataIndex: "createdAt",
      render: formatDate,
    },
    {
      title: "Actions",
      key: "actions",
      fixed: "right",
      render: (_, record) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => openEdit(record)} />
          <Button danger icon={<DeleteOutlined />} onClick={() => handleDelete(record)} />
        </Space>
      ),
    },
  ];

  return (
    <Space direction="vertical" size="large" className="w-full">
      <Card>
        <Form
          form={filterForm}
          layout="vertical"
          initialValues={{ bannerType: "favorite-slider" }}
          onFinish={(values) => {
            setFilters(values);
            setPagination((prev) => ({ ...prev, current: 1 }));
          }}
        >
          <Row gutter={16}>
            <Col xs={24} md={7}>
              <Form.Item name="search" label="Search">
                <Input prefix={<SearchOutlined />} placeholder="Search title or description" />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item name="bannerType" label="Banner Type">
                <Select allowClear options={bannerTypes} />
              </Form.Item>
            </Col>
            <Col xs={24} md={5}>
              <Form.Item name="status" label="Status">
                <Select allowClear options={statusOptions} />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item label=" ">
                <Space wrap>
                  <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>
                    Search
                  </Button>
                  <Button icon={<ReloadOutlined />} onClick={loadBanners}>
                    Refresh
                  </Button>
                  <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                    Create
                  </Button>
                </Space>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Card>

      <Card
        title="Favorite Banner"
        extra={
          <Button icon={<SaveOutlined />} onClick={saveOrder} disabled={!banners.length}>
            Save Order
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={rows}
          rowKey="_id"
          loading={loading}
          scroll={{ x: 1100 }}
          pagination={pagination}
          onChange={(nextPagination) => setPagination(nextPagination)}
        />
      </Card>

      <Modal
        title={selectedBanner ? "Edit Banner" : "Create Banner"}
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          setSelectedBanner(null);
          setFileList([]);
          form.resetFields();
        }}
        footer={null}
        width={760}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="title"
                label="Title"
                rules={[{ required: true, message: "Title is required" }]}
              >
                <Input placeholder="Banner title" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="bannerType"
                label="Banner Type"
                rules={[{ required: true, message: "Banner type is required" }]}
              >
                <Select options={bannerTypes} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label="Description">
            <Input.TextArea rows={3} placeholder="Banner description" />
          </Form.Item>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item name="targetUrl" label="Target URL">
                <Input placeholder="https://example.com" />
              </Form.Item>
            </Col>
            <Col xs={12} md={6}>
              <Form.Item name="sortOrder" label="Sort Order">
                <InputNumber min={0} className="w-full" />
              </Form.Item>
            </Col>
            <Col xs={12} md={6}>
              <Form.Item name="status" label="Status">
                <Select options={statusOptions} />
              </Form.Item>
            </Col>
          </Row>

          {selectedBanner?.image && !fileList.length && (
            <Form.Item label="Current Image">
              <Image
                src={selectedBanner.image}
                alt={selectedBanner.title}
                width={180}
                height={100}
                style={{ objectFit: "cover", borderRadius: 6 }}
              />
            </Form.Item>
          )}

          <Form.Item
            label="Image Upload"
            required={!selectedBanner}
            extra="Allowed: WEBP, PNG, JPG, JPEG. Maximum size: 2 MB."
          >
            <Upload
              accept="image/webp,image/png,image/jpeg"
              listType="picture-card"
              fileList={fileList}
              maxCount={1}
              beforeUpload={validateImageFile}
              onChange={({ fileList: nextFileList }) => setFileList(nextFileList.slice(-1))}
              onRemove={() => setFileList([])}
            >
              {fileList.length >= 1 ? null : (
                <div>
                  <UploadOutlined />
                  <div style={{ marginTop: 8 }}>Upload</div>
                </div>
              )}
            </Upload>
          </Form.Item>

          <Space>
            <Button type="primary" htmlType="submit" loading={saving}>
              {selectedBanner ? "Update Banner" : "Create Banner"}
            </Button>
            <Button onClick={() => setModalOpen(false)}>Cancel</Button>
          </Space>
        </Form>
      </Modal>
    </Space>
  );
};

export default FavoriteBannerManagement;
