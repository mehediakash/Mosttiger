import React, { useEffect, useState } from "react";
import {
  Button,
  Card,
  Descriptions,
  Drawer,
  Form,
  Input,
  message,
  Modal,
  Select,
  Space,
  Table,
  Tag,
} from "antd";
import { CheckOutlined, CloseOutlined, EyeOutlined, ReloadOutlined } from "@ant-design/icons";
import { affiliateAPI } from "../../services/api";
import { dateText, money, renderStatusTag, statusOptions } from "./affiliateUtils";

const AffiliateWithdraw = () => {
  const [rejectForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [withdrawals, setWithdrawals] = useState([]);
  const [selected, setSelected] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [filters, setFilters] = useState({});
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });

  const loadWithdrawals = async () => {
    setLoading(true);
    try {
      const response = await affiliateAPI.getWithdrawals({
        page: pagination.current,
        limit: pagination.pageSize,
        status: filters.status,
      });
      const data = response.data?.data || {};
      setWithdrawals(data.withdrawals || []);
      setPagination((prev) => ({
        ...prev,
        total: data.pagination?.total || 0,
      }));
    } catch (error) {
      message.error("Failed to load affiliate withdrawals");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWithdrawals();
  }, [pagination.current, pagination.pageSize, filters.status]);

  const approveWithdrawal = (record) => {
    Modal.confirm({
      title: "Approve withdrawal?",
      content: `Approve ${money(record.amount)} for ${record.affiliate?.username || "affiliate"}?`,
      okText: "Approve",
      onOk: async () => {
        await affiliateAPI.approveWithdrawal(record._id, {});
        message.success("Withdrawal approved");
        loadWithdrawals();
      },
    });
  };

  const rejectWithdrawal = async (values) => {
    await affiliateAPI.rejectWithdrawal(selected._id, values);
    message.success("Withdrawal rejected");
    setRejectOpen(false);
    rejectForm.resetFields();
    loadWithdrawals();
  };

  const columns = [
    {
      title: "Affiliate",
      dataIndex: "affiliate",
      render: (affiliate) => affiliate?.username || affiliate?.fullName || "N/A",
    },
    { title: "Amount", dataIndex: "amount", render: money },
    {
      title: "Payment Method",
      dataIndex: "paymentMethod",
      render: (value) => <Tag>{value?.toUpperCase()}</Tag>,
    },
    {
      title: "Payment Number",
      dataIndex: "paymentDetails",
      render: (value) => value?.toNumber || value?.accountNumber || "N/A",
    },
    { title: "Requested Date", dataIndex: "createdAt", render: dateText },
    { title: "Status", dataIndex: "status", render: renderStatusTag },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Button
            icon={<EyeOutlined />}
            onClick={() => {
              setSelected(record);
              setDrawerOpen(true);
            }}
          />
          <Button
            type="primary"
            icon={<CheckOutlined />}
            disabled={record.status !== "pending"}
            onClick={() => approveWithdrawal(record)}
          />
          <Button
            danger
            icon={<CloseOutlined />}
            disabled={record.status !== "pending"}
            onClick={() => {
              setSelected(record);
              setRejectOpen(true);
            }}
          />
        </Space>
      ),
    },
  ];

  return (
    <Space direction="vertical" size="large" className="w-full">
      <Card>
        <Form layout="inline" onFinish={setFilters}>
          <Form.Item name="status">
            <Select
              allowClear
              placeholder="Status"
              style={{ width: 180 }}
              options={statusOptions.concat(["processing", "completed", "failed"]).map((value) => ({
                value,
                label: value.toUpperCase(),
              }))}
            />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                Filter
              </Button>
              <Button icon={<ReloadOutlined />} onClick={loadWithdrawals}>
                Refresh
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      <Card title="Affiliate Withdraw Requests">
        <Table
          columns={columns}
          dataSource={withdrawals}
          rowKey="_id"
          loading={loading}
          pagination={pagination}
          onChange={setPagination}
          scroll={{ x: 1100 }}
        />
      </Card>

      <Drawer
        title="Withdraw Request"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={560}
      >
        {selected && (
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label="Affiliate">{selected.affiliate?.username || "N/A"}</Descriptions.Item>
            <Descriptions.Item label="Amount">{money(selected.amount)}</Descriptions.Item>
            <Descriptions.Item label="Net Amount">{money(selected.netAmount)}</Descriptions.Item>
            <Descriptions.Item label="Payment Method">{selected.paymentMethod}</Descriptions.Item>
            <Descriptions.Item label="Payment Number">{selected.paymentDetails?.toNumber || "N/A"}</Descriptions.Item>
            <Descriptions.Item label="Account Name">{selected.paymentDetails?.accountName || "N/A"}</Descriptions.Item>
            <Descriptions.Item label="Bank">{selected.paymentDetails?.bankName || "N/A"}</Descriptions.Item>
            <Descriptions.Item label="Status">{renderStatusTag(selected.status)}</Descriptions.Item>
            <Descriptions.Item label="Requested">{dateText(selected.createdAt)}</Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>

      <Modal
        title="Reject Withdrawal"
        open={rejectOpen}
        onCancel={() => setRejectOpen(false)}
        footer={null}
      >
        <Form form={rejectForm} layout="vertical" onFinish={rejectWithdrawal}>
          <Form.Item
            name="rejectionReason"
            label="Reason"
            rules={[{ required: true, message: "Reason is required" }]}
          >
            <Input.TextArea rows={4} />
          </Form.Item>
          <Space>
            <Button type="primary" danger htmlType="submit">
              Reject
            </Button>
            <Button onClick={() => setRejectOpen(false)}>Cancel</Button>
          </Space>
        </Form>
      </Modal>
    </Space>
  );
};

export default AffiliateWithdraw;
