import React, { useEffect, useMemo, useState } from "react";
import { Button, Card, DatePicker, Form, message, Select, Space, Table, Tag } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { affiliateAPI } from "../../services/api";
import { dateText, getApplicationRows, getUserId, money, renderStatusTag } from "./affiliateUtils";

const { RangePicker } = DatePicker;

const transactionTypes = [
  "commission",
  "settlement",
  "withdraw_request",
  "withdraw_approved",
  "withdraw_rejected",
  "adjustment",
  "negative_carry",
];

const AffiliateTransactions = () => {
  const [loading, setLoading] = useState(false);
  const [affiliates, setAffiliates] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [filters, setFilters] = useState({});

  const loadAffiliates = async () => {
    const response = await affiliateAPI.getApplications({
      status: "approved",
      page: 1,
      limit: 100,
    });
    const applications = response.data?.data?.applications || [];
    setAffiliates(getApplicationRows(applications));
    return applications;
  };

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const apps = await loadAffiliates();
      const selected = filters.affiliateId
        ? apps.filter((app) => getUserId(app) === filters.affiliateId)
        : apps;
      const responses = await Promise.allSettled(
        selected.map((app) =>
          affiliateAPI.getAffiliateTransactions(getUserId(app), {
            page: 1,
            limit: 100,
            type: filters.type,
          }),
        ),
      );
      setTransactions(
        responses.flatMap((result) =>
          result.status === "fulfilled"
            ? result.value.data?.data?.transactions || []
            : [],
        ),
      );
    } catch (error) {
      message.error("Failed to load affiliate transactions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [filters.affiliateId, filters.type]);

  const rows = useMemo(() => {
    if (!filters.dateRange?.length) return transactions;
    const [start, end] = filters.dateRange;
    return transactions.filter((row) => {
      const created = new Date(row.createdAt).getTime();
      return created >= start.startOf("day").valueOf() && created <= end.endOf("day").valueOf();
    });
  }, [transactions, filters.dateRange]);

  const columns = [
    { title: "Date", dataIndex: "createdAt", render: dateText },
    { title: "Type", dataIndex: "type", render: (value) => <Tag>{value}</Tag> },
    { title: "Description", dataIndex: "description" },
    { title: "Amount", dataIndex: "amount", render: money },
    {
      title: "Balance",
      dataIndex: "balanceAfter",
      render: (value) => money(value?.withdrawableBalance || 0),
    },
    { title: "Status", dataIndex: "status", render: renderStatusTag },
  ];

  return (
    <Space direction="vertical" size="large" className="w-full">
      <Card>
        <Form layout="inline" onFinish={setFilters}>
          <Form.Item name="affiliateId">
            <Select
              allowClear
              showSearch
              placeholder="Affiliate"
              style={{ width: 260 }}
              optionFilterProp="label"
              options={affiliates.map((affiliate) => ({
                value: getUserId(affiliate),
                label: `${affiliate.applicant} (${affiliate.affiliate?.affiliateCode || "N/A"})`,
              }))}
            />
          </Form.Item>
          <Form.Item name="type">
            <Select
              allowClear
              placeholder="Type"
              style={{ width: 220 }}
              options={transactionTypes.map((value) => ({
                value,
                label: value.replaceAll("_", " ").toUpperCase(),
              }))}
            />
          </Form.Item>
          <Form.Item name="dateRange">
            <RangePicker />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                Filter
              </Button>
              <Button icon={<ReloadOutlined />} onClick={loadTransactions}>
                Refresh
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      <Card title="Affiliate Transaction History">
        <Table
          columns={columns}
          dataSource={rows}
          rowKey="_id"
          loading={loading}
          scroll={{ x: 1000 }}
        />
      </Card>
    </Space>
  );
};

export default AffiliateTransactions;
