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
  relationshipStatusOptions,
  renderReferralStatusTag,
  renderTurnoverProgress,
} from "./referralUtils";

const { RangePicker } = DatePicker;

const ReferralHistory = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [selected, setSelected] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [filters, setFilters] = useState({});
  const [sorter, setSorter] = useState({});
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });

  const loadHistory = async () => {
    setLoading(true);
    try {
      const response = await referralAPI.getHistory(
        buildQueryFromFilters(filters, pagination, sorter),
      );
      const payload = getListPayload(response, ["referrals", "relationships", "history"]);
      setHistory(payload.rows);
      setPagination((prev) => ({
        ...prev,
        total: payload.pagination?.total || payload.rows.length,
      }));
    } catch (error) {
      message.error(error.response?.data?.message || "Failed to load referral history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [filters, pagination.current, pagination.pageSize, sorter.field, sorter.order]);

  const rows = useMemo(() => history.map(getReferralRow), [history]);

  const openDetails = async (record) => {
    setSelected(record);
    setDrawerOpen(true);

    try {
      const response = await referralAPI.getHistoryDetails(record._id);
      setSelected(getReferralRow(response.data?.data || response.data || record));
    } catch (error) {
      message.error(error.response?.data?.message || "Failed to load referral details");
    }
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
    {
      title: "Registration Date",
      dataIndex: "registrationDate",
      render: (_, record) => dateText(record.registrationDate || record.createdAt),
      sorter: true,
    },
    { title: "First Deposit", dataIndex: "firstDeposit", render: money, sorter: true },
    { title: "Required Turnover", dataIndex: "requiredTurnover", render: money },
    {
      title: "Completed Turnover",
      dataIndex: "completedTurnover",
      render: (value, record) => (
        <Space direction="vertical" size={0} className="w-full">
          <span>{money(value)}</span>
          {renderTurnoverProgress(value, record.requiredTurnover)}
        </Space>
      ),
    },
    { title: "Bonus Amount", dataIndex: "bonusAmount", render: money, sorter: true },
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
                  options={[...relationshipStatusOptions, ...bonusStatusOptions].map((value) => ({
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
                      loadHistory();
                    }}
                  />
                </Space>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Card>

      <Card title="Referral History">
        <Table
          columns={columns}
          dataSource={rows}
          rowKey="_id"
          loading={loading}
          pagination={pagination}
          scroll={{ x: 1400 }}
          onChange={(nextPagination, _filters, nextSorter) => {
            setPagination(nextPagination);
            setSorter(nextSorter || {});
          }}
        />
      </Card>

      <Drawer
        title="Referral Details"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={720}
      >
        {selected && (
          <Space direction="vertical" size="large" className="w-full">
            <Descriptions title="Referrer Information" bordered column={1} size="small">
              <Descriptions.Item label="Name">{getUserDisplay(selected.referrer)}</Descriptions.Item>
              <Descriptions.Item label="Email">{selected.referrer?.email || "N/A"}</Descriptions.Item>
              <Descriptions.Item label="Referral Code">{selected.referralCode || "N/A"}</Descriptions.Item>
            </Descriptions>
            <Descriptions title="Referral Information" bordered column={1} size="small">
              <Descriptions.Item label="User">{getUserDisplay(selected.referredUser)}</Descriptions.Item>
              <Descriptions.Item label="Registration Time">
                {dateText(selected.registrationDate || selected.createdAt)}
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                {renderReferralStatusTag(selected.bonus?.status || selected.status)}
              </Descriptions.Item>
            </Descriptions>
            <Descriptions title="Deposit Information" bordered column={1} size="small">
              <Descriptions.Item label="First Deposit">{money(selected.firstDeposit)}</Descriptions.Item>
              <Descriptions.Item label="Required Turnover">{money(selected.requiredTurnover)}</Descriptions.Item>
              <Descriptions.Item label="Completed Turnover">
                {money(selected.completedTurnover)}
                {renderTurnoverProgress(selected.completedTurnover, selected.requiredTurnover)}
              </Descriptions.Item>
            </Descriptions>
            <Descriptions title="Bonus Status" bordered column={1} size="small">
              <Descriptions.Item label="Bonus Amount">{money(selected.bonusAmount)}</Descriptions.Item>
              <Descriptions.Item label="Claim Date">{dateText(selected.bonus?.claimedAt)}</Descriptions.Item>
              <Descriptions.Item label="Completion Date">{dateText(selected.bonus?.completedAt)}</Descriptions.Item>
            </Descriptions>
          </Space>
        )}
      </Drawer>
    </Space>
  );
};

export default ReferralHistory;
