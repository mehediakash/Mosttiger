import React, { useEffect, useMemo, useState } from "react";
import { Button, Card, DatePicker, Form, message, Select, Space, Table, Tag } from "antd";
import { PlayCircleOutlined, ReloadOutlined } from "@ant-design/icons";
import { affiliateAPI } from "../../services/api";
import { dateText, getApplicationRows, getUserId, money, renderStatusTag } from "./affiliateUtils";

const { RangePicker } = DatePicker;

const AffiliateSettlement = () => {
  const [loading, setLoading] = useState(false);
  const [affiliates, setAffiliates] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [filters, setFilters] = useState({});

  const loadAffiliates = async () => {
    const response = await affiliateAPI.getApplications({
      status: "approved",
      page: 1,
      limit: 100,
    });
    setAffiliates(getApplicationRows(response.data?.data?.applications || []));
    return response.data?.data?.applications || [];
  };

  const loadSettlements = async () => {
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
            limit: 50,
            type: "settlement",
          }),
        ),
      );

      const nextSettlements = responses.flatMap((result) =>
        result.status === "fulfilled"
          ? result.value.data?.data?.transactions || []
          : [],
      );
      setSettlements(nextSettlements);
    } catch (error) {
      message.error("Failed to load affiliate settlements");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettlements();
  }, [filters.affiliateId]);

  const rows = useMemo(() => {
    if (!filters.dateRange?.length) return settlements;
    const [start, end] = filters.dateRange;
    return settlements.filter((row) => {
      const created = new Date(row.createdAt).getTime();
      return created >= start.startOf("day").valueOf() && created <= end.endOf("day").valueOf();
    });
  }, [settlements, filters.dateRange]);

  const runDueSettlements = async () => {
    setLoading(true);
    try {
      await affiliateAPI.runDueSettlements();
      message.success("Due settlements completed");
      loadSettlements();
    } catch (error) {
      message.error(error.response?.data?.message || "Failed to run settlements");
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { title: "Settlement Date", dataIndex: "createdAt", render: dateText },
    {
      title: "Settlement Type",
      dataIndex: "metadata",
      render: (metadata) => <Tag>{metadata?.periodStart ? "PERIOD" : "MANUAL"}</Tag>,
    },
    { title: "Commission", dataIndex: "amount", render: money },
    {
      title: "Negative Carry",
      dataIndex: "metadata",
      render: (metadata) => money(metadata?.negativeCarryOut || metadata?.negativeCarryApplied || 0),
    },
    {
      title: "Carry Reset",
      dataIndex: "metadata",
      render: (metadata) => metadata?.carryReset || "N/A",
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
          <Form.Item name="dateRange">
            <RangePicker />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                Filter
              </Button>
              <Button icon={<ReloadOutlined />} onClick={loadSettlements}>
                Refresh
              </Button>
              <Button
                icon={<PlayCircleOutlined />}
                onClick={runDueSettlements}
                loading={loading}
              >
                Run Due
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      <Card title="Affiliate Settlement History">
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

export default AffiliateSettlement;
