import React, { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  message,
  Modal,
  Row,
  Select,
  Space,
  Table,
  Tooltip,
} from "antd";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  EyeOutlined,
  PauseCircleOutlined,
  ReloadOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { affiliateAPI } from "../../services/api";
import {
  dateText,
  getApplicationRows,
  getUserId,
  renderStatusTag,
  statusOptions,
} from "./affiliateUtils";
import AffiliateConfigModal from "./AffiliateConfigModal";
import ApplicationDetailsDrawer from "./ApplicationDetailsDrawer";

const AffiliateApplications = () => {
  const [form] = Form.useForm();
  const [rejectForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [applications, setApplications] = useState([]);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [filters, setFilters] = useState({});
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });

  const loadApplications = async () => {
    setLoading(true);
    try {
      const response = await affiliateAPI.getApplications({
        page: pagination.current,
        limit: pagination.pageSize,
        status: filters.status,
      });
      const data = response.data?.data || {};
      setApplications(data.applications || []);
      setPagination((prev) => ({
        ...prev,
        total: data.pagination?.total || 0,
      }));
    } catch (error) {
      message.error(error.response?.data?.message || "Failed to load applications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApplications();
  }, [pagination.current, pagination.pageSize, filters.status]);

  const rows = useMemo(() => {
    const search = (filters.search || "").toLowerCase();
    return getApplicationRows(applications).filter((row) => {
      const matchesSearch =
        !search ||
        row.applicant.toLowerCase().includes(search) ||
        row.username.toLowerCase().includes(search) ||
        row.phone.toLowerCase().includes(search);
      const matchesPromotion =
        !filters.promotionMethod ||
        row.promotionMethod
          .toLowerCase()
          .includes(filters.promotionMethod.toLowerCase());
      const matchesCountry =
        !filters.country ||
        row.country.toLowerCase().includes(filters.country.toLowerCase());

      return matchesSearch && matchesPromotion && matchesCountry;
    });
  }, [applications, filters]);

  const openDetails = async (application) => {
    try {
      const response = await affiliateAPI.getApplicationDetails(application._id);
      setSelectedApplication(response.data?.data || application);
      setDetailsOpen(true);
    } catch (error) {
      message.error("Failed to load application details");
    }
  };

  const handleApprove = async (values) => {
    if (!selectedApplication) return;

    setActionLoading(true);
    try {
      await affiliateAPI.approveApplication(selectedApplication._id, values);
      message.success("Application approved");
      setApproveOpen(false);
      setSelectedApplication(null);
      loadApplications();
    } catch (error) {
      message.error(error.response?.data?.message || "Failed to approve application");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (values) => {
    if (!selectedApplication) return;

    setActionLoading(true);
    try {
      await affiliateAPI.rejectApplication(selectedApplication._id, values);
      message.success("Application rejected");
      setRejectOpen(false);
      rejectForm.resetFields();
      setSelectedApplication(null);
      loadApplications();
    } catch (error) {
      message.error(error.response?.data?.message || "Failed to reject application");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSuspend = (application) => {
    const userId = getUserId(application);
    if (!userId) {
      message.error("Affiliate user was not found");
      return;
    }

    Modal.confirm({
      title: "Suspend affiliate?",
      content: "This will prevent affiliate dashboard access and future withdrawals.",
      okText: "Suspend",
      okButtonProps: { danger: true },
      onOk: async () => {
        await affiliateAPI.suspendAffiliate(userId, {
          reason: "Suspended from application review",
        });
        message.success("Affiliate suspended");
        loadApplications();
      },
    });
  };

  const columns = [
    {
      title: "Applicant",
      dataIndex: "applicant",
      sorter: (a, b) => a.applicant.localeCompare(b.applicant),
    },
    { title: "Username", dataIndex: "username" },
    { title: "Phone", dataIndex: "phone" },
    { title: "Promotion Method", dataIndex: "promotionMethod" },
    {
      title: "Estimated Players",
      dataIndex: "estimatedMonthlyPlayers",
      sorter: (a, b) => a.estimatedMonthlyPlayers - b.estimatedMonthlyPlayers,
    },
    {
      title: "Applied Date",
      dataIndex: "createdAt",
      render: dateText,
      sorter: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
    },
    {
      title: "Status",
      dataIndex: "status",
      render: renderStatusTag,
    },
    {
      title: "Actions",
      key: "actions",
      fixed: "right",
      render: (_, record) => (
        <Space>
          <Tooltip title="View">
            <Button icon={<EyeOutlined />} onClick={() => openDetails(record)} />
          </Tooltip>
          <Tooltip title="Approve">
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={() => {
                setSelectedApplication(record);
                setApproveOpen(true);
              }}
              disabled={record.status === "approved"}
            />
          </Tooltip>
          <Tooltip title="Reject">
            <Button
              danger
              icon={<CloseCircleOutlined />}
              onClick={() => {
                setSelectedApplication(record);
                setRejectOpen(true);
              }}
              disabled={record.status === "rejected"}
            />
          </Tooltip>
          <Tooltip title="Suspend">
            <Button
              icon={<PauseCircleOutlined />}
              onClick={() => handleSuspend(record)}
              disabled={record.status === "suspended"}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <Space direction="vertical" size="large" className="w-full">
      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) => {
            setFilters(values);
            setPagination((prev) => ({ ...prev, current: 1 }));
          }}
        >
          <Row gutter={16}>
            <Col xs={24} md={6}>
              <Form.Item name="search" label="Search">
                <Input prefix={<SearchOutlined />} placeholder="Name, username, phone" />
              </Form.Item>
            </Col>
            <Col xs={24} md={5}>
              <Form.Item name="status" label="Status">
                <Select
                  allowClear
                  options={statusOptions.map((value) => ({
                    value,
                    label: value.toUpperCase(),
                  }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={5}>
              <Form.Item name="promotionMethod" label="Promotion Method">
                <Input placeholder="Promotion method" />
              </Form.Item>
            </Col>
            <Col xs={24} md={5}>
              <Form.Item name="country" label="Country">
                <Input placeholder="Country" />
              </Form.Item>
            </Col>
            <Col xs={24} md={3}>
              <Form.Item label=" ">
                <Space>
                  <Button type="primary" htmlType="submit" icon={<SearchOutlined />} />
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={() => {
                      form.resetFields();
                      setFilters({});
                    }}
                  />
                </Space>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Card>

      <Card title="Affiliate Applications">
        <Table
          columns={columns}
          dataSource={rows}
          loading={loading}
          rowKey="_id"
          scroll={{ x: 1300 }}
          pagination={pagination}
          onChange={(nextPagination) => setPagination(nextPagination)}
        />
      </Card>

      <ApplicationDetailsDrawer
        open={detailsOpen}
        application={selectedApplication}
        onClose={() => setDetailsOpen(false)}
      />

      <AffiliateConfigModal
        open={approveOpen}
        title="Approve Affiliate"
        initialConfig={{}}
        loading={actionLoading}
        onCancel={() => setApproveOpen(false)}
        onSubmit={handleApprove}
      />

      <Modal
        title="Reject Application"
        open={rejectOpen}
        onCancel={() => setRejectOpen(false)}
        footer={null}
      >
        <Form form={rejectForm} layout="vertical" onFinish={handleReject}>
          <Form.Item
            name="rejectionReason"
            label="Rejection Reason"
            rules={[{ required: true, message: "Reason is required" }]}
          >
            <Input.TextArea rows={4} />
          </Form.Item>
          <Space>
            <Button type="primary" danger htmlType="submit" loading={actionLoading}>
              Reject
            </Button>
            <Button onClick={() => setRejectOpen(false)}>Cancel</Button>
          </Space>
        </Form>
      </Modal>
    </Space>
  );
};

export default AffiliateApplications;
