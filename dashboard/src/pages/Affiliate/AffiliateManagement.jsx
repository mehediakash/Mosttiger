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
  Space,
  Statistic,
  Table,
  Tooltip,
} from "antd";
import {
  EditOutlined,
  EyeOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  SearchOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { affiliateAPI } from "../../services/api";
import {
  dateText,
  getAffiliate,
  getApplicationRows,
  getUserId,
  money,
  renderStatusTag,
} from "./affiliateUtils";
import AffiliateConfigModal from "./AffiliateConfigModal";

const AffiliateManagement = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [applications, setApplications] = useState([]);
  const [filters, setFilters] = useState({});
  const [selectedAffiliate, setSelectedAffiliate] = useState(null);
  const [configOpen, setConfigOpen] = useState(false);
  const [currentConfig, setCurrentConfig] = useState({});

  const loadAffiliates = async () => {
    setLoading(true);
    try {
      const response = await affiliateAPI.getApplications({
        status: "approved",
        page: 1,
        limit: 100,
      });
      setApplications(response.data?.data?.applications || []);
    } catch (error) {
      message.error("Failed to load affiliates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAffiliates();
  }, []);

  const rows = useMemo(() => {
    const search = (filters.search || "").toLowerCase();
    return getApplicationRows(applications)
      .map((application) => {
        const affiliate = getAffiliate(application);
        return {
          ...application,
          affiliate,
          affiliateCode: affiliate.affiliateCode || "N/A",
          status: affiliate.status || application.status,
          revenueSharePercentage: affiliate.config?.revenueSharePercentage || 0,
          qualifiedPlayers: affiliate.statistics?.qualifiedPlayers || 0,
          totalPlayers: affiliate.statistics?.totalPlayers || 0,
          pendingCommission:
            affiliate.wallet?.pendingCommission ||
            affiliate.statistics?.pendingCommission ||
            0,
          withdrawableBalance:
            affiliate.wallet?.withdrawableBalance ||
            affiliate.statistics?.withdrawableBalance ||
            0,
          lifetimeCommission:
            affiliate.wallet?.lifetimeEarnings ||
            affiliate.statistics?.totalCommission ||
            0,
        };
      })
      .filter((row) => {
        if (!search) return true;
        return (
          row.affiliateCode.toLowerCase().includes(search) ||
          row.applicant.toLowerCase().includes(search) ||
          row.username.toLowerCase().includes(search)
        );
      });
  }, [applications, filters]);

  const summary = rows.reduce(
    (acc, row) => ({
      totalPlayers: acc.totalPlayers + row.totalPlayers,
      qualifiedPlayers: acc.qualifiedPlayers + row.qualifiedPlayers,
      pendingCommission: acc.pendingCommission + row.pendingCommission,
      withdrawableBalance: acc.withdrawableBalance + row.withdrawableBalance,
    }),
    {
      totalPlayers: 0,
      qualifiedPlayers: 0,
      pendingCommission: 0,
      withdrawableBalance: 0,
    },
  );

  const openConfig = async (record) => {
    const userId = getUserId(record);
    setSelectedAffiliate(record);
    setActionLoading(true);
    try {
      const response = await affiliateAPI.getAffiliateConfig(userId);
      setCurrentConfig(response.data?.data || record.affiliate?.config || {});
      setConfigOpen(true);
    } catch (error) {
      message.error("Failed to load affiliate config");
    } finally {
      setActionLoading(false);
    }
  };

  const updateConfig = async (values) => {
    if (!selectedAffiliate) return;
    setActionLoading(true);
    try {
      await affiliateAPI.updateAffiliateConfig(getUserId(selectedAffiliate), values);
      message.success("Affiliate config updated");
      setConfigOpen(false);
      loadAffiliates();
    } catch (error) {
      message.error(error.response?.data?.message || "Failed to update config");
    } finally {
      setActionLoading(false);
    }
  };

  const updateStatus = (record, status) => {
    Modal.confirm({
      title: `${status === "approved" ? "Resume" : "Suspend"} affiliate?`,
      onOk: async () => {
        if (status === "approved") {
          await affiliateAPI.updateAffiliateStatus(getUserId(record), {
            status: "approved",
          });
        } else {
          await affiliateAPI.suspendAffiliate(getUserId(record), {
            reason: "Updated from affiliate management",
          });
        }
        message.success("Affiliate status updated");
        loadAffiliates();
      },
    });
  };

  const columns = [
    { title: "Affiliate Code", dataIndex: "affiliateCode", fixed: "left" },
    { title: "Affiliate Name", dataIndex: "applicant" },
    { title: "Status", dataIndex: "status", render: renderStatusTag },
    {
      title: "Revenue Share %",
      dataIndex: "revenueSharePercentage",
      render: (value) => `${value}%`,
      sorter: (a, b) => a.revenueSharePercentage - b.revenueSharePercentage,
    },
    { title: "Qualified Players", dataIndex: "qualifiedPlayers" },
    { title: "Total Players", dataIndex: "totalPlayers" },
    {
      title: "Pending Commission",
      dataIndex: "pendingCommission",
      render: money,
    },
    {
      title: "Withdrawable Balance",
      dataIndex: "withdrawableBalance",
      render: money,
    },
    {
      title: "Lifetime Commission",
      dataIndex: "lifetimeCommission",
      render: money,
    },
    { title: "Created Date", dataIndex: "createdAt", render: dateText },
    {
      title: "Actions",
      key: "actions",
      fixed: "right",
      render: (_, record) => (
        <Space>
          <Tooltip title="View">
            <Button
              icon={<EyeOutlined />}
              onClick={() =>
                navigate(`/affiliate/management/${getUserId(record)}`, {
                  state: { application: record },
                })
              }
            />
          </Tooltip>
          <Tooltip title="Edit Config">
            <Button icon={<EditOutlined />} onClick={() => openConfig(record)} />
          </Tooltip>
          <Tooltip title="View Players">
            <Button
              icon={<TeamOutlined />}
              onClick={() =>
                navigate(`/affiliate/management/${getUserId(record)}/players`, {
                  state: { application: record },
                })
              }
            />
          </Tooltip>
          {record.status === "suspended" ? (
            <Tooltip title="Resume">
              <Button
                icon={<PlayCircleOutlined />}
                onClick={() => updateStatus(record, "approved")}
              />
            </Tooltip>
          ) : (
            <Tooltip title="Suspend">
              <Button
                icon={<PauseCircleOutlined />}
                danger
                onClick={() => updateStatus(record, "suspended")}
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Space direction="vertical" size="large" className="w-full">
      <Row gutter={[16, 16]}>
        <Col xs={24} md={6}>
          <Card>
            <Statistic title="Affiliates" value={rows.length} prefix={<UserOutlined />} />
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card>
            <Statistic title="Qualified Players" value={summary.qualifiedPlayers} />
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card>
            <Statistic title="Pending Commission" value={summary.pendingCommission} formatter={money} />
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card>
            <Statistic title="Withdrawable" value={summary.withdrawableBalance} formatter={money} />
          </Card>
        </Col>
      </Row>

      <Card>
        <Form
          form={form}
          layout="inline"
          onFinish={setFilters}
          className="mb-4"
        >
          <Form.Item name="search">
            <Input prefix={<SearchOutlined />} placeholder="Code, name, username" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>
                Search
              </Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => {
                  form.resetFields();
                  setFilters({});
                  loadAffiliates();
                }}
              >
                Refresh
              </Button>
            </Space>
          </Form.Item>
        </Form>

        <Table
          columns={columns}
          dataSource={rows}
          rowKey="_id"
          loading={loading}
          scroll={{ x: 1600 }}
          pagination={{ pageSize: 20 }}
        />
      </Card>

      <AffiliateConfigModal
        open={configOpen}
        title="Edit Affiliate Config"
        initialConfig={currentConfig}
        loading={actionLoading}
        onCancel={() => setConfigOpen(false)}
        onSubmit={updateConfig}
      />
    </Space>
  );
};

export default AffiliateManagement;
