import React, { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Col,
  DatePicker,
  Descriptions,
  Drawer,
  Form,
  Input,
  message,
  Row,
  Select,
  Space,
  Table,
  Tooltip,
} from "antd";
import { EyeOutlined, ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import { referralAPI } from "../../services/api";
import {
  bonusStatusOptions,
  buildQueryFromFilters,
  dateText,
  getListPayload,
  getReferralRow,
  getUserDisplay,
  labelize,
  money,
  renderReferralStatusTag,
} from "./referralUtils";

const { RangePicker } = DatePicker;

const ReferralPendingClaims = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [claims, setClaims] = useState([]);
  const [selected, setSelected] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [filters, setFilters] = useState({});
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });

  const loadClaims = async () => {
    setLoading(true);
    try {
      const response = await referralAPI.getPendingClaims(
        buildQueryFromFilters(filters, pagination),
      );
      const payload = getListPayload(response, ["pendingClaims", "bonuses", "claims"]);
      setClaims(payload.rows);
      setPagination((prev) => ({
        ...prev,
        total: payload.pagination?.total || payload.rows.length,
      }));
    } catch (error) {
      message.error(error.response?.data?.message || "Failed to load pending referral claims");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClaims();
  }, [filters, pagination.current, pagination.pageSize]);

  const rows = useMemo(() => claims.map(getReferralRow), [claims]);

  const openDetails = (record) => {
    setSelected(record);
    setDrawerOpen(true);
  };

  const columns = [
    {
      title: "Referrer",
      dataIndex: "referrer",
      render: getUserDisplay,
    },
    {
      title: "Referral User",
      dataIndex: "referredUser",
      render: getUserDisplay,
    },
    { title: "Bonus Amount", dataIndex: "bonusAmount", render: money, sorter: true },
    {
      title: "Qualified Date",
      dataIndex: "qualifiedAt",
      render: (_, record) => dateText(record.qualifiedAt || record.bonus?.qualifiedAt),
      sorter: true,
    },
    {
      title: "Pending Since",
      dataIndex: "createdAt",
      render: (_, record) => dateText(record.bonus?.createdAt || record.createdAt),
      sorter: true,
    },
    {
      title: "Status",
      dataIndex: "status",
      render: (_, record) => renderReferralStatusTag(record.bonus?.status || record.status),
    },
    {
      title: "Actions",
      key: "actions",
      fixed: "right",
      render: (_, record) => (
        <Tooltip title="View">
          <Button icon={<EyeOutlined />} onClick={() => openDetails(record)} />
        </Tooltip>
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
              <Form.Item name="search" label="Username">
                <Input prefix={<SearchOutlined />} placeholder="Referrer or referral user" />
              </Form.Item>
            </Col>
            <Col xs={24} md={5}>
              <Form.Item name="status" label="Status">
                <Select
                  allowClear
                  options={bonusStatusOptions.map((value) => ({
                    value,
                    label: labelize(value),
                  }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={5}>
              <Form.Item name="referralCode" label="Referral Code">
                <Input placeholder="Referral code" />
              </Form.Item>
            </Col>
            <Col xs={24} md={5}>
              <Form.Item name="dateRange" label="Date Range">
                <RangePicker className="w-full" />
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
                      loadClaims();
                    }}
                  />
                </Space>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Card>

      <Card title="Referral Pending Claims">
        <Table
          columns={columns}
          dataSource={rows}
          rowKey="_id"
          loading={loading}
          pagination={pagination}
          scroll={{ x: 1100 }}
          onChange={(nextPagination) => setPagination(nextPagination)}
        />
      </Card>

      <Drawer
        title="Pending Claim Details"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={620}
      >
        {selected && (
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label="Referrer">{getUserDisplay(selected.referrer)}</Descriptions.Item>
            <Descriptions.Item label="Referral User">{getUserDisplay(selected.referredUser)}</Descriptions.Item>
            <Descriptions.Item label="Referral Code">{selected.referralCode || "N/A"}</Descriptions.Item>
            <Descriptions.Item label="Bonus Amount">{money(selected.bonusAmount)}</Descriptions.Item>
            <Descriptions.Item label="Qualified Date">
              {dateText(selected.qualifiedAt || selected.bonus?.qualifiedAt)}
            </Descriptions.Item>
            <Descriptions.Item label="Pending Since">
              {dateText(selected.bonus?.createdAt || selected.createdAt)}
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              {renderReferralStatusTag(selected.bonus?.status || selected.status)}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>
    </Space>
  );
};

export default ReferralPendingClaims;
