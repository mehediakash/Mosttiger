import React, { useEffect, useMemo, useState } from "react";
import { Alert, Card, Form, Input, Select, Space, Table } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { useLocation, useParams } from "react-router-dom";
import { affiliateAPI } from "../../services/api";
import { dateText, money, renderStatusTag } from "./affiliateUtils";

const AffiliatePlayers = () => {
  const { userId } = useParams();
  const { state } = useLocation();
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [filters, setFilters] = useState({});

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const response = await affiliateAPI.getAffiliateTransactions(userId, {
          page: 1,
          limit: 100,
          type: "commission",
        });
        setTransactions(response.data?.data?.transactions || []);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userId]);

  const rows = useMemo(() => {
    const byPlayer = new Map();
    transactions.forEach((transaction) => {
      const playerId = transaction.player?._id || transaction.player || "unknown";
      const existing = byPlayer.get(playerId) || {
        _id: playerId,
        username: transaction.player?.username || "N/A",
        registrationDate: null,
        firstDeposit: 0,
        totalDeposit: 0,
        turnover: 0,
        qualified: true,
        netRevenue: 0,
        commissionGenerated: 0,
        status: "qualified",
      };
      existing.netRevenue += Number(transaction.metadata?.grossRevenue || 0);
      existing.commissionGenerated += Number(transaction.amount || 0);
      byPlayer.set(playerId, existing);
    });

    const search = (filters.search || "").toLowerCase();
    return Array.from(byPlayer.values()).filter((row) => {
      const matchesSearch = !search || row.username.toLowerCase().includes(search);
      const matchesQualified =
        filters.qualified === undefined ||
        String(row.qualified) === String(filters.qualified);
      return matchesSearch && matchesQualified;
    });
  }, [transactions, filters]);

  const columns = [
    { title: "Username", dataIndex: "username" },
    { title: "Registration Date", dataIndex: "registrationDate", render: dateText },
    { title: "First Deposit", dataIndex: "firstDeposit", render: money },
    { title: "Total Deposit", dataIndex: "totalDeposit", render: money },
    { title: "Turnover", dataIndex: "turnover", render: money },
    {
      title: "Qualified",
      dataIndex: "qualified",
      render: (value) => renderStatusTag(value ? "approved" : "pending"),
    },
    { title: "Net Revenue", dataIndex: "netRevenue", render: money },
    {
      title: "Commission Generated",
      dataIndex: "commissionGenerated",
      render: money,
    },
    { title: "Status", dataIndex: "status", render: renderStatusTag },
  ];

  return (
    <Space direction="vertical" size="large" className="w-full">
      <Card>
        <div className="font-medium">
          Players for {state?.application?.basicInfo?.fullName || "Affiliate"}
        </div>
        <div className="text-gray-500">
          This view uses traceable commission transactions returned by the affiliate backend.
        </div>
      </Card>

      <Alert
        type="info"
        showIcon
        message="Player source"
        description="The current admin backend exposes affiliate transaction history, not a direct admin player-ledger endpoint. Rows are built only from returned commission transactions, so affiliates without commission history will appear empty."
      />

      <Card>
        <Form layout="inline" onFinish={setFilters} className="mb-4">
          <Form.Item name="search">
            <Input prefix={<SearchOutlined />} placeholder="Search username" />
          </Form.Item>
          <Form.Item name="qualified">
            <Select
              allowClear
              placeholder="Qualified"
              style={{ width: 160 }}
              options={[
                { value: true, label: "Qualified" },
                { value: false, label: "Not Qualified" },
              ]}
            />
          </Form.Item>
        </Form>
        <Table
          columns={columns}
          dataSource={rows}
          rowKey="_id"
          loading={loading}
          scroll={{ x: 1200 }}
        />
      </Card>
    </Space>
  );
};

export default AffiliatePlayers;
