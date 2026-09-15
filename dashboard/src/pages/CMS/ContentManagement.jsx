import React, { useState, useEffect } from 'react';
import {
  Card, Table, Button, Modal, Form, Input, Select,
  Switch, DatePicker, InputNumber, message, Space,
  Tag, Upload, Image, Row, Col, Tabs, Divider, Spin
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined,
  EyeOutlined, UploadOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { cmsAPI } from '../../services/api';
import { formatDate } from '../../utils/helpers';

const { Option } = Select;
const { TextArea } = Input;
const { RangePicker } = DatePicker;
const { TabPane } = Tabs;

const IMAGE_MIME_TYPES = ['image/webp', 'image/png', 'image/jpeg'];
const IMAGE_MAX_SIZE_MB = 2;

const buildContentFormData = (values, imageFile) => {
  const formData = new FormData();

  Object.entries(values).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (value instanceof Date) {
      formData.append(key, value.toISOString());
      return;
    }
    if (typeof value === 'object' && !(value instanceof Date)) {
      formData.append(key, JSON.stringify(value));
      return;
    }
    formData.append(key, value);
  });

  if (imageFile) {
    formData.append('image', imageFile);
  }

  return formData;
};

const ContentManagement = () => {
  const [content, setContent] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedContent, setSelectedContent] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [form] = Form.useForm();

  const contentTypes = [
    { value: 'banner', label: 'Banner', color: 'blue' },
    { value: 'promotion', label: 'Promotion', color: 'green' },
    { value: 'footer', label: 'Footer', color: 'orange' },
    { value: 'faq', label: 'FAQ', color: 'purple' },
    { value: 'terms', label: 'Terms & Conditions', color: 'red' },
    { value: 'privacy', label: 'Privacy Policy', color: 'cyan' },
    { value: 'about', label: 'About Us', color: 'geekblue' },
  ];

  useEffect(() => {
    loadContent();
  }, [activeTab]);

  const loadContent = async () => {
    setLoading(true);
    try {
      const params = activeTab !== 'all' ? { type: activeTab } : {};
      const response = await cmsAPI.getContent(params);
      console.log('CMS Content Response:', response.data);
      
      // Server returns data.content or data.data.content depending on endpoint
      const contentData = response.data?.data?.content || response.data?.content || [];
      setContent(Array.isArray(contentData) ? contentData : []);
    } catch (error) {
      console.error('Failed to load content:', error);
      message.error('Failed to load content');
      setContent([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateContent = async (values, imageFile = null) => {
    try {
      // Format dates properly - convert dayjs objects to Date
      const payload = {
        ...values,
        startDate: values.startDate ? values.startDate.toDate() : null,
        endDate: values.endDate ? values.endDate.toDate() : null,
        isActive: Boolean(values.isActive)
      };
      const requestData = imageFile ? buildContentFormData(payload, imageFile) : payload;

      if (selectedContent) {
        await cmsAPI.updateContent(selectedContent._id, requestData);
        message.success('Content updated successfully');
      } else {
        await cmsAPI.createContent(requestData);
        message.success('Content created successfully');
      }
      setModalVisible(false);
      form.resetFields();
      setSelectedContent(null);
      loadContent();
    } catch (error) {
      console.error('Operation error:', error);
      message.error('Operation failed: ' + (error.response?.data?.message || 'Unknown error'));
    }
  };

  const handleDeleteContent = async (id) => {
    try {
      await cmsAPI.deleteContent(id);
      message.success('Content deleted successfully');
      loadContent();
    } catch (error) {
      console.error('Failed to delete content:', error);
      message.error('Failed to delete content');
    }
  };

  const columns = [
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      render: (title, record) => (
        <div className="flex items-center space-x-3">
          {record.image && (
            <Image
              width={50}
              height={30}
              src={record.image}
              alt={title}
              className="rounded object-cover"
              preview={{
                mask: 'View'
              }}
            />
          )}
          <div>
            <div className="font-medium">{title}</div>
            <div className="text-xs text-gray-500">{record.type}</div>
          </div>
        </div>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type) => {
        const typeConfig = contentTypes.find(t => t.value === type);
        return <Tag color={typeConfig?.color}>{typeConfig?.label}</Tag>;
      },
    },
    {
      title: 'Order',
      dataIndex: 'order',
      key: 'order',
      align: 'center',
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? 'ACTIVE' : 'INACTIVE'}
        </Tag>
      ),
    },
    {
      title: 'Dates',
      dataIndex: 'startDate',
      key: 'dates',
      render: (startDate, record) => (
        <div className="text-xs">
          <div>Start: {startDate ? formatDate(startDate) : 'N/A'}</div>
          {record.endDate && <div>End: {formatDate(record.endDate)}</div>}
        </div>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Space size="small">
          <Button 
            type="text" 
            icon={<EditOutlined />} 
            size="small"
            onClick={() => {
              setSelectedContent(record);
              form.setFieldsValue({
                type: record.type,
                title: record.title,
                content: record.content,
                order: record.order,
                isActive: record.isActive,
                startDate: record.startDate ? dayjs(record.startDate) : null,
                endDate: record.endDate ? dayjs(record.endDate) : null,
                metadata: record.metadata || {}
              });
              setModalVisible(true);
            }}
          />
          <Button 
            type="text" 
            icon={<DeleteOutlined />} 
            size="small"
            danger
            onClick={() => {
              Modal.confirm({
                title: 'Delete Content',
                content: `Are you sure you want to delete "${record.title}"?`,
                okText: 'Delete',
                okType: 'danger',
                cancelText: 'Cancel',
                onOk: () => handleDeleteContent(record._id),
              });
            }}
          />
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          tabBarExtraContent={
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={() => {
                setSelectedContent(null);
                form.resetFields();
                setModalVisible(true);
              }}
            >
              Create Content
            </Button>
          }
        >
          <TabPane tab="All Content" key="all" />
          {contentTypes.map(type => (
            <TabPane 
              tab={type.label} 
              key={type.value} 
            />
          ))}
        </Tabs>

        <Table
          columns={columns}
          dataSource={content}
          loading={loading}
          rowKey="_id"
          scroll={{ x: 800 }}
          pagination={{
            pageSize: 10,
            total: content.length,
            showTotal: (total) => `Total ${total} items`
          }}
        />
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        title={selectedContent ? 'Edit Content' : 'Create Content'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
          setSelectedContent(null);
        }}
        footer={null}
        width={900}
        style={{ top: 20 }}
        destroyOnClose
      >
        <CMSContentForm
          form={form}
          onFinish={handleCreateContent}
          contentTypes={contentTypes}
          initialValues={selectedContent}
        />
      </Modal>
    </div>
  );
};

// CMS Content Form Component
const CMSContentForm = ({ form, onFinish, contentTypes, initialValues }) => {
  const [loading, setLoading] = useState(false);
  const [imageFileList, setImageFileList] = useState([]);
  const [currentImage, setCurrentImage] = useState(initialValues?.image || '');

  useEffect(() => {
    setCurrentImage(initialValues?.image || '');
    setImageFileList([]);
  }, [initialValues]);

  const resetImageState = () => {
    setCurrentImage(initialValues?.image || '');
    setImageFileList([]);
  };

  const validateImage = (file) => {
    if (!IMAGE_MIME_TYPES.includes(file.type)) {
      message.error('Only WEBP, PNG, and JPEG images are allowed');
      return Upload.LIST_IGNORE;
    }

    if (file.size / 1024 / 1024 > IMAGE_MAX_SIZE_MB) {
      message.error('Image size must not exceed 2 MB');
      return Upload.LIST_IGNORE;
    }

    return false;
  };

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const imageFile = imageFileList[0]?.originFileObj || imageFileList[0] || null;
      await onFinish(values, imageFile);
    } finally {
      setLoading(false);
    }
  };

  // Transform initialValues to ensure dates are dayjs objects
  const transformedInitialValues = initialValues ? {
    ...initialValues,
    startDate: initialValues.startDate ? dayjs(initialValues.startDate) : null,
    endDate: initialValues.endDate ? dayjs(initialValues.endDate) : null,
  } : {};

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSubmit}
      initialValues={{
        type: 'banner',
        isActive: true,
        order: 1,
        metadata: {},
        ...transformedInitialValues
      }}
    >
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="type"
            label="Content Type"
            rules={[{ required: true, message: 'Please select content type' }]}
          >
            <Select placeholder="Select content type">
              {contentTypes.map(type => (
                <Option key={type.value} value={type.value}>
                  {type.label}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="order"
            label="Display Order"
            rules={[{ required: true, message: 'Please enter display order' }]}
          >
            <InputNumber
              min={0}
              max={1000}
              className="w-full"
              placeholder="Order number"
            />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item
        name="title"
        label="Title"
        rules={[{ required: true, message: 'Please enter title' }]}
      >
        <Input placeholder="Enter content title" />
      </Form.Item>

      <Form.Item
        name="content"
        label="Content"
        rules={[{ required: true, message: 'Please enter content' }]}
      >
        <TextArea
          rows={6}
          placeholder="Enter content text or HTML"
        />
      </Form.Item>

      <Form.Item label="Image">
        {currentImage && !imageFileList.length && (
          <div className="mb-3">
            <Image
              width={160}
              height={90}
              src={currentImage}
              alt="CMS Content"
              className="rounded object-cover"
            />
          </div>
        )}
        <Upload
          accept="image/webp,image/png,image/jpeg"
          beforeUpload={validateImage}
          fileList={imageFileList}
          listType="picture"
          maxCount={1}
          onChange={({ fileList }) => setImageFileList(fileList.slice(-1))}
          onRemove={() => {
            setImageFileList([]);
            return true;
          }}
        >
          <Button icon={<UploadOutlined />}>
            {currentImage ? 'Replace Image' : 'Choose Image'}
          </Button>
        </Upload>
        <div className="mt-2 text-xs text-gray-500">
          WEBP, PNG, or JPEG only. Maximum size 2 MB.
        </div>
      </Form.Item>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="startDate"
            label="Start Date"
            rules={[{ required: true, message: 'Please select start date' }]}
          >
            <DatePicker
              showTime
              format="YYYY-MM-DD HH:mm:ss"
              className="w-full"
              placeholder="Select start date"
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="endDate"
            label="End Date (Optional)"
          >
            <DatePicker
              showTime
              format="YYYY-MM-DD HH:mm:ss"
              className="w-full"
              placeholder="Select end date"
            />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item
        name="isActive"
        label="Active Status"
        valuePropName="checked"
      >
        <Switch 
          checkedChildren="Active"
          unCheckedChildren="Inactive"
        />
      </Form.Item>

      {/* Metadata for banners and promotions */}
      <Form.Item
        noStyle
        shouldUpdate={(prevValues, currentValues) => prevValues.type !== currentValues.type}
      >
        {({ getFieldValue }) => 
          getFieldValue('type') === 'banner' && (
            <>
              <Divider orientation="left">Banner Settings</Divider>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name={['metadata', 'buttonText']}
                    label="Button Text"
                  >
                    <Input placeholder="e.g., Play Now" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name={['metadata', 'redirectUrl']}
                    label="Redirect URL"
                  >
                    <Input placeholder="https://example.com/promotion" />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item
                name={['metadata', 'theme']}
                label="Theme"
              >
                <Select placeholder="Select theme">
                  <Option value="dark">Dark</Option>
                  <Option value="light">Light</Option>
                  <Option value="primary">Primary</Option>
                </Select>
              </Form.Item>
            </>
          )
        }
      </Form.Item>

      {/* Metadata for promotions */}
      <Form.Item
        noStyle
        shouldUpdate={(prevValues, currentValues) => prevValues.type !== currentValues.type}
      >
        {({ getFieldValue }) => 
          getFieldValue('type') === 'promotion' && (
            <>
              <Divider orientation="left">Promotion Settings</Divider>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name={['metadata', 'discountPercentage']}
                    label="Discount Percentage"
                  >
                    <InputNumber 
                      min={0}
                      max={100}
                      className="w-full"
                      placeholder="e.g., 20" 
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name={['metadata', 'code']}
                    label="Promo Code"
                  >
                    <Input placeholder="e.g., SAVE20" />
                  </Form.Item>
                </Col>
              </Row>
            </>
          )
        }
      </Form.Item>

      <Form.Item>
        <Space>
          <Button 
            type="primary" 
            htmlType="submit" 
            loading={loading}
            size="large"
          >
            {initialValues ? 'Update Content' : 'Create Content'}
          </Button>
          <Button 
            size="large"
            onClick={() => {
              form.resetFields();
              resetImageState();
            }}
          >
            Reset
          </Button>
        </Space>
      </Form.Item>
    </Form>
  );
};

export default ContentManagement;
