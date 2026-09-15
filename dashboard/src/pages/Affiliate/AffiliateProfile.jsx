import React, { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Col,
  Descriptions,
  message,
  Row,
  Space,
  Statistic,
  Table,
  Tabs,
  Tag,
} from "antd";
import { ReloadOutlined, TeamOutlined } from "@ant-design/icons";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { affiliateAPI } from "../../services/api";
import { dateText, getAffiliate, money, renderStatusTag } from "./affiliateUtils";

const AffiliateProfile = () => {
  const { userId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [application, setApplication] = useState(state?.application || null);
  const [config, setConfig] = useState({});
  const [statistics, setStatistics] = useState({});
  const [transactions, setTransactions] = useState([]);

  const affiliate = useMemo(() => getAffiliate(application), [application]);
  const basic = application?.basicInfo || {};
  const payment = application?.payment || {};
  const marketing = application?.marketing || {};

  const loadProfile = async () => {
    setLoading(true);
    try {
      const [appsResponse, configResponse, statsResponse, transactionResponse] =
        await Promise.allSettled([
          affiliateAPI.getApplications({ status: "approved", page: 1, limit: 100 }),
          affiliateAPI.getAffiliateConfig(userId),
          affiliateAPI.refreshAffiliateStatistics(userId),
          affiliateAPI.getAffiliateTransactions(userId, { page: 1, limit: 10 }),
        ]);

      if (appsResponse.status === "fulfilled") {
        const apps = appsResponse.value.data?.data?.applications || [];
        setApplication(
          apps.find((item) => item.user?._id === userId) || state?.application || null,
        );
      }
      if (configResponse.status === "fulfilled") {
        setConfig(configResponse.value.data?.data || {});
      }
      if (statsResponse.status === "fulfilled") {
        setStatistics(statsResponse.value.data?.data || {});
      }
      if (transactionResponse.status === "fulfilled") {
        setTransactions(
          transactionResponse.value.data?.data?.transactions || [],
        );
      }
    } catch (error) {
      message.error("Failed to load affiliate profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [userId]);

  const transactionColumns = [
    { title: "Date", dataIndex: "createdAt", render: dateText },
    { title: "Type", dataIndex: "type", render: (value) => <Tag>{value}</Tag> },
    { title: "Description", dataIndex: "description" },
    { title: "Amount", dataIndex: "amount", render: money },
    { title: "Status", dataIndex: "status", render: renderStatusTag },
  ];

  return (
    <Space direction="vertical" size="large" className="w-full">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold m-0">Affiliate Profile</h2>
          <div className="text-gray-500">{affiliate.affiliateCode || "N/A"}</div>
        </div>
        <Space>
          <Button
            icon={<TeamOutlined />}
            onClick={() =>
              navigate(`/affiliate/management/${userId}/players`, {
                state: { application },
              })
            }
          >
            View Players
          </Button>
          <Button icon={<ReloadOutlined />} loading={loading} onClick={loadProfile}>
            Refresh
          </Button>
        </Space>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={6}>
          <Card>
            <Statistic title="Total Players" value={statistics.totalPlayers || 0} />
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card>
            <Statistic title="Qualified Players" value={statistics.qualifiedPlayers || 0} />
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card>
            <Statistic title="Pending Commission" value={statistics.pendingCommission || 0} formatter={money} />
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card>
            <Statistic title="Withdrawable Balance" value={statistics.withdrawableBalance || 0} formatter={money} />
          </Card>
        </Col>
      </Row>

      <Tabs
        items={[
          {
            key: "overview",
            label: "Overview",
            children: (
              <Row gutter={[16, 16]}>
                <Col xs={24} lg={12}>
                  <Card title="Affiliate Information">
                    <Descriptions bordered column={1} size="small">
                      <Descriptions.Item label="Name">{basic.fullName || application?.user?.fullName || "N/A"}</Descriptions.Item>
                      <Descriptions.Item label="Username">{basic.username || application?.user?.username || "N/A"}</Descriptions.Item>
                      <Descriptions.Item label="Phone">{basic.phone || application?.user?.phone || "N/A"}</Descriptions.Item>
                      <Descriptions.Item label="Status">{renderStatusTag(affiliate.status)}</Descriptions.Item>
                      <Descriptions.Item label="Affiliate Code">{affiliate.affiliateCode || "N/A"}</Descriptions.Item>
                      <Descriptions.Item label="Approved At">{dateText(affiliate.approvedAt)}</Descriptions.Item>
                    </Descriptions>
                  </Card>
                </Col>
                <Col xs={24} lg={12}>
                  <Card title="Wallet Summary">
                    <Descriptions bordered column={1} size="small">
                      <Descriptions.Item label="Pending Commission">{money(affiliate.wallet?.pendingCommission || statistics.pendingCommission)}</Descriptions.Item>
                      <Descriptions.Item label="Settled Commission">{money(affiliate.wallet?.settledCommission || statistics.settledCommission)}</Descriptions.Item>
                      <Descriptions.Item label="Withdrawable Balance">{money(affiliate.wallet?.withdrawableBalance || statistics.withdrawableBalance)}</Descriptions.Item>
                      <Descriptions.Item label="Lifetime Earnings">{money(affiliate.wallet?.lifetimeEarnings || statistics.totalCommission)}</Descriptions.Item>
                      <Descriptions.Item label="Lifetime Withdraw">{money(affiliate.wallet?.lifetimeWithdraw || statistics.lifetimeWithdraw)}</Descriptions.Item>
                    </Descriptions>
                  </Card>
                </Col>
                <Col xs={24} lg={12}>
                  <Card title="Payment Information">
                    <Descriptions bordered column={1} size="small">
                      <Descriptions.Item label="Method"><Tag>{payment.preferredPaymentMethod || "N/A"}</Tag></Descriptions.Item>
                      <Descriptions.Item label="Payment Number">{payment.paymentNumber || "N/A"}</Descriptions.Item>
                      <Descriptions.Item label="Bank">{payment.bankName || "N/A"}</Descriptions.Item>
                      <Descriptions.Item label="Account Name">{payment.accountName || "N/A"}</Descriptions.Item>
                    </Descriptions>
                  </Card>
                </Col>
                <Col xs={24} lg={12}>
                  <Card title="Marketing Information">
                    <Descriptions bordered column={1} size="small">
                      <Descriptions.Item label="Promotion Method">{marketing.promotionMethod || "N/A"}</Descriptions.Item>
                      <Descriptions.Item label="Traffic Source">{marketing.trafficSource || "N/A"}</Descriptions.Item>
                      <Descriptions.Item label="Estimated Players">{marketing.estimatedMonthlyPlayers || 0}</Descriptions.Item>
                      <Descriptions.Item label="Applied Date">{dateText(application?.createdAt)}</Descriptions.Item>
                    </Descriptions>
                  </Card>
                </Col>
              </Row>
            ),
          },
          {
            key: "config",
            label: "Configuration",
            children: (
              <Card>
                <Descriptions bordered column={{ xs: 1, md: 2 }} size="small">
                  <Descriptions.Item label="Revenue Share">{config.revenueSharePercentage || 0}%</Descriptions.Item>
                  <Descriptions.Item label="Minimum Deposit">{money(config.minimumDeposit)}</Descriptions.Item>
                  <Descriptions.Item label="Required Turnover">{money(config.requiredTurnover)}</Descriptions.Item>
                  <Descriptions.Item label="Negative Carry">{config.enableNegativeCarry ? "Enabled" : "Disabled"}</Descriptions.Item>
                  <Descriptions.Item label="Carry Reset">{config.carryReset || "N/A"}</Descriptions.Item>
                  <Descriptions.Item label="Maximum Carry">{money(config.maximumNegativeCarry)}</Descriptions.Item>
                  <Descriptions.Item label="Settlement">{config.settlementFrequency || "N/A"}</Descriptions.Item>
                  <Descriptions.Item label="Minimum Withdraw">{money(config.minimumWithdraw)}</Descriptions.Item>
                  <Descriptions.Item label="Withdraw Approval">{config.withdrawApproval || "N/A"}</Descriptions.Item>
                </Descriptions>
              </Card>
            ),
          },
          {
            key: "transactions",
            label: "Recent Transactions",
            children: (
              <Card>
                <Table
                  columns={transactionColumns}
                  dataSource={transactions}
                  rowKey="_id"
                  loading={loading}
                  pagination={false}
                  scroll={{ x: 900 }}
                />
              </Card>
            ),
          },
        ]}
      />
    </Space>
  );
};

export default AffiliateProfile;
