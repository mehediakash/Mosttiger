import React, { useState, useEffect, useMemo } from "react";
import {
  Table,
  Card,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  message,
  Popconfirm,
  Row,
  Col,
  Statistic,
  Tooltip,
  Tabs,
  Descriptions,
  DatePicker,
  InputNumber,
  Image,
} from "antd";
import {
  TransactionOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  EyeOutlined,
  SearchOutlined,
  ReloadOutlined,
  DollarOutlined,
  ExclamationCircleOutlined,
  HistoryOutlined,
} from "@ant-design/icons";
import { useDispatch, useSelector } from "react-redux";
import { paymentAPI } from "../../services/api";
import {
  formatCurrency,
  formatDate,
  getStatusColor,
} from "../../utils/helpers";
import usePermissions from "../../hooks/usePermissions";
import { PERMISSIONS } from "../../utils/rolePermissions";

const { Option } = Select;
const { RangePicker } = DatePicker;
const { TabPane } = Tabs;

const STATUS_FILTERS = [
  { value: "pending_withdrawal", label: "Pending Withdraw" },
  { value: "pending", label: "Pending" },
  { value: "paid", label: "Paid" },
  { value: "failed", label: "Failed" },
  { value: "expired", label: "Expired" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const SERVER_STATUS_FILTERS = [
  "pending",
  "approved",
  "rejected",
  "completed",
  "cancelled",
  "failed",
];

const PROVIDER_FILTERS = [
  { value: "uddoktapay", label: "UddoktaPay" },
  { value: "payment24x7", label: "Payment24x7" },
];

const getPaymentProvider = (tx) => {
  if (tx?.provider === "payment24x7" || tx?.paymentMethod === "payment24x7") {
    return "Payment24x7";
  }

  return "UddoktaPay";
};

const getMerchantReference = (tx) =>
  tx?.propayDetails?.gatewayResponse?.merchant_reference || tx?.referenceId || "";

const getGatewayReference = (tx) =>
  tx?.propayDetails?.orderNo ||
  tx?.propayDetails?.gatewayResponse?.reference ||
  tx?.transactionId ||
  "";

const getGatewayStatus = (tx) =>
  tx?.propayDetails?.gatewayResponse?.callbackResponse?.status ||
  tx?.propayDetails?.gatewayStatus ||
  tx?.propayDetails?.transactionStatus ||
  tx?.status ||
  "";

const getCallbackResult = (tx) =>
  tx?.propayDetails?.gatewayResponse?.callbackResponse?.event ||
  tx?.propayDetails?.gatewayResponse?.lastStatusResponse?.status ||
  "N/A";

const isPayment24x7Record = (tx) => getPaymentProvider(tx) === "Payment24x7";

const TransactionManagement = () => {
  const dispatch = useDispatch();
  const { user: currentUser } = useSelector((state) => state.auth);
  const { can, isAdmin } = usePermissions();
  const [transactions, setTransactions] = useState([]);
  const [pendingTransactions, setPendingTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [actionType, setActionType] = useState("");
  const [activeTab, setActiveTab] = useState("pending");
  const [filters, setFilters] = useState({});
  const [transactionType, setTransactionType] = useState("deposit"); // Default to deposit
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [providerFilter, setProviderFilter] = useState("");
  const [dateRange, setDateRange] = useState(null);
  const [form] = Form.useForm();

  const canApproveDeposit = can.approveDeposits;
  const canApproveWithdrawal = can.approveWithdrawals;

  useEffect(() => {
    loadPendingTransactions();
    if (activeTab === "all") {
      loadAllTransactions();
    }
  }, [
    activeTab,
    filters,
    transactionType,
    statusFilter,
    providerFilter,
    dateRange,
    searchTerm,
  ]);

  // Ensure pendingTransactions is always an array
  useEffect(() => {
    if (!Array.isArray(pendingTransactions)) {
      setPendingTransactions([]);
    }
  }, [pendingTransactions]);

  // Ensure transactions is always an array
  useEffect(() => {
    if (!Array.isArray(transactions)) {
      setTransactions([]);
    }
  }, [transactions]);

  const filteredPendingTransactions = useMemo(() => {
    if (!searchTerm) return pendingTransactions;

    const term = searchTerm.toLowerCase();

    return pendingTransactions.filter((tx) => {
      const paymentTxId = tx?.paymentDetails?.transactionId || "";
      const referenceId = tx?.referenceId || "";
      const merchantReference = getMerchantReference(tx);
      const gatewayReference = getGatewayReference(tx);
      const gatewayStatus = getGatewayStatus(tx);
      const paymentProvider = getPaymentProvider(tx);
      const userName = tx?.user?.fullName || "";
      const userEmail = tx?.user?.email || "";
      const userPhone = tx?.user?.phone || "";
      const paymentMethod = tx?.paymentMethod || "";
      const status = tx?.status || "";
      const type = tx?.type || transactionType || "";

      return (
        paymentTxId.toLowerCase().includes(term) ||
        referenceId.toLowerCase().includes(term) ||
        merchantReference.toLowerCase().includes(term) ||
        gatewayReference.toLowerCase().includes(term) ||
        gatewayStatus.toLowerCase().includes(term) ||
        paymentProvider.toLowerCase().includes(term) ||
        userName.toLowerCase().includes(term) ||
        userEmail.toLowerCase().includes(term) ||
        userPhone.toLowerCase().includes(term) ||
        paymentMethod.toLowerCase().includes(term) ||
        status.toLowerCase().includes(term) ||
        type.toLowerCase().includes(term)
      );
    });
  }, [pendingTransactions, searchTerm, transactionType]);

  const filteredAllTransactions = useMemo(() => {
    let data = transactions;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      data = data.filter((tx) => {
        const fields = [
          tx?.user?.fullName,
          tx?.user?.username,
          tx?.user?.email,
          tx?.user?.phone,
          tx?.referenceId,
          tx?.paymentDetails?.transactionId,
          tx?.transactionId,
          getMerchantReference(tx),
          getGatewayReference(tx),
          getGatewayStatus(tx),
          getPaymentProvider(tx),
        ];

        return fields.some((value) =>
          String(value || "").toLowerCase().includes(term),
        );
      });
    }

    if (!statusFilter) return data;
    const target = statusFilter.toLowerCase();

    if (target === "pending_withdrawal") {
      return data.filter(
        (tx) =>
          (tx?.type || "").toLowerCase() === "withdrawal" &&
          (tx?.status || "").toLowerCase() === "pending",
      );
    }

    if (target === "paid") {
      return data.filter((tx) => {
        const localStatus = (tx?.status || "").toLowerCase();
        const gatewayStatus = getGatewayStatus(tx).toLowerCase();
        return (
          (tx?.type || "").toLowerCase() === "deposit" &&
          (gatewayStatus === "paid" ||
            localStatus === "completed" ||
            localStatus === "approved")
        );
      });
    }

    if (target === "expired") {
      return data.filter((tx) => {
        const gatewayStatus = getGatewayStatus(tx).toLowerCase();
        const failureReason =
          tx?.propayDetails?.gatewayResponse?.lastStatusResponse?.failure_reason ||
          tx?.rejectionReason ||
          "";
        return (
          gatewayStatus === "expired" ||
          String(failureReason).toLowerCase().includes("expired")
        );
      });
    }

    return data.filter(
      (tx) =>
        (tx?.status || "").toLowerCase() === target ||
        getGatewayStatus(tx).toLowerCase() === target,
    );
  }, [transactions, searchTerm, statusFilter]);

  const loadPendingTransactions = async () => {
    try {
      const dateParams = dateRange
        ? {
            startDate: dateRange[0]?.toISOString(),
            endDate: dateRange[1]?.toISOString(),
          }
        : {};
      const params = {
        type: transactionType,
        ...(providerFilter ? { provider: providerFilter } : {}),
        ...(searchTerm ? { search: searchTerm } : {}),
        ...dateParams,
      };

      // Admin sees all pending transactions, agents see only their downline
      const response = isAdmin
        ? await paymentAPI.getPendingTransactions(params)
        : await paymentAPI.getDownlinePendingTransactions({
            type: transactionType,
          });

      console.log("Pending transactions API response:", response); // Debug log
      const transactionsData = response.data?.data?.transactions || [];

      // Add type field to each transaction since the API doesn't include it
      const transactionsWithType = transactionsData.map((transaction) => ({
        ...transaction,
        type: transactionType,
      }));

      setPendingTransactions(transactionsWithType);
    } catch (error) {
      console.error("Failed to load pending transactions:", error);
      message.error("Failed to load pending transactions");
      setPendingTransactions([]); // Ensure pendingTransactions is always an array
    }
  };

  const loadAllTransactions = async () => {
    setLoading(true);
    try {
      const dateParams = dateRange
        ? {
            startDate: dateRange[0]?.toISOString(),
            endDate: dateRange[1]?.toISOString(),
          }
        : {};
      const params = {
        page: 1,
        limit: 100,
        scope: "all", // ask server for all records when admin
        ...(providerFilter ? { provider: providerFilter } : {}),
        ...(searchTerm ? { search: searchTerm } : {}),
        ...dateParams,
        ...(SERVER_STATUS_FILTERS.includes(statusFilter)
          ? { status: statusFilter }
          : {}),
      };

      const [depositRes, withdrawalRes] = await Promise.all([
        paymentAPI.getDepositHistory(params),
        paymentAPI.getWithdrawalHistory(params),
      ]);

      const depositsData = depositRes?.data?.data;
      const withdrawalsData = withdrawalRes?.data?.data;

      const deposits = Array.isArray(depositsData)
        ? depositsData
        : Array.isArray(depositsData?.deposits)
          ? depositsData.deposits
          : Array.isArray(depositRes?.data?.deposits)
            ? depositRes.data.deposits
            : [];

      const withdrawals = Array.isArray(withdrawalsData)
        ? withdrawalsData
        : Array.isArray(withdrawalsData?.withdrawals)
          ? withdrawalsData.withdrawals
          : Array.isArray(withdrawalRes?.data?.withdrawals)
            ? withdrawalRes.data.withdrawals
            : [];

      const normalized = [
        ...deposits.map((d) => ({ ...d, type: "deposit" })),
        ...withdrawals.map((w) => ({ ...w, type: "withdrawal" })),
      ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      setTransactions(normalized);
    } catch (error) {
      console.error("Failed to load transactions:", error);
      message.error("Failed to load transactions");
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (values) => {
    try {
      await paymentAPI.approveTransaction(
        selectedTransaction.type,
        selectedTransaction._id,
        values,
      );
      message.success("Transaction approved successfully");
      setActionModalVisible(false);
      form.resetFields();
      loadPendingTransactions();
      if (activeTab === "all") loadAllTransactions();
    } catch (error) {
      message.error("Failed to approve transaction");
    }
  };

  const handleReject = async (values) => {
    try {
      await paymentAPI.rejectTransaction(
        selectedTransaction.type,
        selectedTransaction._id,
        values,
      );
      message.success("Transaction rejected successfully");
      setActionModalVisible(false);
      form.resetFields();
      loadPendingTransactions();
      if (activeTab === "all") loadAllTransactions();
    } catch (error) {
      message.error("Failed to reject transaction");
    }
  };

  const handleAction = (transaction, type) => {
    setSelectedTransaction(transaction);
    setActionType(type);
    setActionModalVisible(true);
  };

  const getTransactionColumns = (isPending = false) => [
    {
      title: "Transaction ID",
      dataIndex: ["paymentDetails", "transactionId"],
      key: "transactionId",
      render: (id) => (
        <span className="font-mono text-blue-600">{id || "N/A"}</span>
      ),
    },
    {
      title: "User",
      dataIndex: "user",
      key: "user",
      render: (user) => user?.fullName || "N/A",
    },
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
      render: (type) => (
        <Tag color={type === "deposit" ? "green" : "blue"}>
          {(type || transactionType || "UNKNOWN").toUpperCase()}
        </Tag>
      ),
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      render: (amount) => formatCurrency(amount),
    },
    {
      title: "Payment Method",
      dataIndex: "paymentMethod",
      key: "paymentMethod",
      render: (method) => (method || "N/A").toUpperCase(),
    },
    {
      title: "Provider",
      key: "paymentProvider",
      render: (_, record) => getPaymentProvider(record),
    },
    {
      title: "Merchant Ref",
      key: "merchantReference",
      render: (_, record) => (
        <span className="font-mono text-blue-600">
          {getMerchantReference(record) || "N/A"}
        </span>
      ),
    },
    {
      title: "Gateway Ref",
      key: "gatewayReference",
      render: (_, record) => (
        <span className="font-mono text-blue-600">
          {getGatewayReference(record) || "N/A"}
        </span>
      ),
    },
    {
      title: "Payment Status",
      key: "gatewayStatus",
      render: (_, record) => {
        const status = getGatewayStatus(record);
        return (
          <Tag color={getStatusColor(status)}>
            {(status || "N/A").toUpperCase()}
          </Tag>
        );
      },
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => (
        <Tag color={getStatusColor(status)}>
          {(status || "UNKNOWN").toUpperCase()}
        </Tag>
      ),
    },
    {
      title: "Created",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date) => formatDate(date),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="View Details">
            <Button
              type="text"
              icon={<EyeOutlined />}
              size="small"
              onClick={() => {
                setSelectedTransaction(record);
                setViewModalVisible(true);
              }}
            />
          </Tooltip>

          {isPending && !isPayment24x7Record(record) && (
            <>
              {(record.type === "deposit" && canApproveDeposit) ||
              (record.type === "withdrawal" && canApproveWithdrawal) ? (
                <>
                  <Tooltip title="Approve">
                    <Button
                      type="text"
                      icon={<CheckCircleOutlined />}
                      size="small"
                      style={{ color: "#52c41a" }}
                      onClick={() => handleAction(record, "approve")}
                    />
                  </Tooltip>

                  <Tooltip title="Reject">
                    <Button
                      type="text"
                      icon={<CloseCircleOutlined />}
                      size="small"
                      danger
                      onClick={() => handleAction(record, "reject")}
                    />
                  </Tooltip>
                </>
              ) : null}
            </>
          )}
        </Space>
      ),
    },
  ];

  const stats = {
    pendingDeposits:
      pendingTransactions?.filter((t) => t.type === "deposit").length || 0,
    pendingWithdrawals:
      pendingTransactions?.filter((t) => t.type === "withdrawal").length || 0,
    totalPending: pendingTransactions?.length || 0,
    totalAmount:
      pendingTransactions?.reduce((sum, t) => sum + t.amount, 0) || 0,
  };

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Pending Deposits"
              value={stats.pendingDeposits}
              prefix={<TransactionOutlined />}
              valueStyle={{ color: "#cf1322" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Pending Withdrawals"
              value={stats.pendingWithdrawals}
              prefix={<TransactionOutlined />}
              valueStyle={{ color: "#cf1322" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Total Pending"
              value={stats.totalPending}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: "#faad14" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Total Amount"
              value={stats.totalAmount}
              prefix={<DollarOutlined />}
              valueStyle={{ color: "#3f8600" }}
              formatter={(value) => formatCurrency(value)}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab="Pending Approval" key="pending">
            <div className="mb-4 flex justify-between items-center">
              <div className="flex space-x-2">
                <Input
                  placeholder="Search username, merchant ref, gateway ref..."
                  prefix={<SearchOutlined />}
                  style={{ width: 300 }}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Select
                  placeholder="Filter by type"
                  style={{ width: 150 }}
                  allowClear
                  value={transactionType}
                  onChange={(value) => {
                    // Use effect hook to reload after state updates to avoid stale type
                    setTransactionType(value || "deposit");
                  }}
                >
                  <Option value="deposit">Deposit</Option>
                  <Option value="withdrawal">Withdrawal</Option>
                </Select>
                <Select
                  placeholder="Provider"
                  style={{ width: 150 }}
                  allowClear
                  value={providerFilter || undefined}
                  onChange={(value) => setProviderFilter(value || "")}
                >
                  {PROVIDER_FILTERS.map((provider) => (
                    <Option key={provider.value} value={provider.value}>
                      {provider.label}
                    </Option>
                  ))}
                </Select>
                <RangePicker
                  value={dateRange || null}
                  onChange={(value) => setDateRange(value)}
                />
              </div>
              <Button
                icon={<ReloadOutlined />}
                onClick={loadPendingTransactions}
              >
                Refresh
              </Button>
            </div>

            <Table
              columns={getTransactionColumns(true)}
              dataSource={filteredPendingTransactions}
              loading={loading}
              scroll={{ x: 800 }}
              rowKey="_id"
            />
          </TabPane>

          <TabPane tab="All Transactions" key="all">
            <div className="mb-4 flex justify-between items-center">
              <div className="flex space-x-2">
                <Input
                  placeholder="Search username, merchant ref, gateway ref..."
                  prefix={<SearchOutlined />}
                  style={{ width: 300 }}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Select
                  placeholder="Filter by status"
                  style={{ width: 150 }}
                  allowClear
                  value={statusFilter || undefined}
                  onChange={(value) => setStatusFilter(value || "")}
                >
                  {STATUS_FILTERS.map((status) => (
                    <Option key={status.value} value={status.value}>
                      {status.label}
                    </Option>
                  ))}
                </Select>
                <Select
                  placeholder="Provider"
                  style={{ width: 150 }}
                  allowClear
                  value={providerFilter || undefined}
                  onChange={(value) => setProviderFilter(value || "")}
                >
                  {PROVIDER_FILTERS.map((provider) => (
                    <Option key={provider.value} value={provider.value}>
                      {provider.label}
                    </Option>
                  ))}
                </Select>
                <RangePicker
                  value={dateRange || null}
                  onChange={(value) => setDateRange(value)}
                />
              </div>
              <Button icon={<ReloadOutlined />} onClick={loadAllTransactions}>
                Refresh
              </Button>
            </div>

            <Table
              columns={getTransactionColumns()}
              dataSource={filteredAllTransactions}
              loading={loading}
              scroll={{ x: 800 }}
              rowKey="_id"
              pagination={{ pageSize: 20 }}
            />
          </TabPane>
        </Tabs>
      </Card>

      {/* View Transaction Modal */}
      <Modal
        title="Transaction Details"
        open={viewModalVisible}
        onCancel={() => setViewModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setViewModalVisible(false)}>
            Close
          </Button>,
        ]}
        width={800}
      >
        {selectedTransaction && (
          <div className="space-y-4">
            <Descriptions column={2} bordered>
              <Descriptions.Item label="Reference ID" span={2}>
                <span className="font-mono font-semibold text-blue-600">
                  {selectedTransaction.referenceId || "N/A"}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="Type">
                <Tag
                  color={
                    selectedTransaction.type === "deposit" ? "green" : "blue"
                  }
                >
                  {(
                    selectedTransaction.type ||
                    transactionType ||
                    "UNKNOWN"
                  ).toUpperCase()}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={getStatusColor(selectedTransaction.status)}>
                  {(selectedTransaction.status || "UNKNOWN").toUpperCase()}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="User">
                {selectedTransaction.user?.fullName || "N/A"}
              </Descriptions.Item>
              <Descriptions.Item label="Email/Phone">
                {selectedTransaction.user?.email ||
                  selectedTransaction.user?.phone ||
                  "N/A"}
              </Descriptions.Item>
              <Descriptions.Item label="Amount">
                <span className="text-lg font-semibold text-green-600">
                  {formatCurrency(selectedTransaction.amount)}
                </span>
              </Descriptions.Item>
              {selectedTransaction.netAmount && (
                <Descriptions.Item label="Net Amount">
                  <span className="text-lg font-semibold">
                    {formatCurrency(selectedTransaction.netAmount)}
                  </span>
                </Descriptions.Item>
              )}
              {selectedTransaction.processingFee && (
                <Descriptions.Item label="Processing Fee">
                  {formatCurrency(selectedTransaction.processingFee)}
                </Descriptions.Item>
              )}
              <Descriptions.Item
                label="Payment Method"
                span={selectedTransaction.netAmount ? 1 : 2}
              >
                {(selectedTransaction.paymentMethod || "N/A").toUpperCase()}
              </Descriptions.Item>
              <Descriptions.Item label="Payment Provider">
                {getPaymentProvider(selectedTransaction)}
              </Descriptions.Item>
              <Descriptions.Item label="Merchant Reference">
                <span className="font-mono">
                  {getMerchantReference(selectedTransaction) || "N/A"}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="Gateway Reference">
                <span className="font-mono">
                  {getGatewayReference(selectedTransaction) || "N/A"}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="Payment Status">
                <Tag color={getStatusColor(getGatewayStatus(selectedTransaction))}>
                  {(getGatewayStatus(selectedTransaction) || "N/A").toUpperCase()}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Callback Result">
                {getCallbackResult(selectedTransaction)}
              </Descriptions.Item>
            </Descriptions>

            {/* Payment Details Section */}
            {selectedTransaction.paymentDetails && (
              <Card title="Payment Details" size="small">
                <div className="space-y-4">
                  {selectedTransaction.paymentDetails.transactionId && (
                    <Descriptions column={1} bordered size="small">
                      <Descriptions.Item label="User Transaction ID">
                        <span className="font-mono">
                          {selectedTransaction.paymentDetails.transactionId}
                        </span>
                      </Descriptions.Item>
                    </Descriptions>
                  )}

                  <Descriptions column={2} bordered size="small">
                    {selectedTransaction.paymentDetails.fromNumber && (
                      <Descriptions.Item label="From Number">
                        {selectedTransaction.paymentDetails.fromNumber}
                      </Descriptions.Item>
                    )}
                    {selectedTransaction.paymentDetails.toNumber && (
                      <Descriptions.Item label="To Number">
                        {selectedTransaction.paymentDetails.toNumber}
                      </Descriptions.Item>
                    )}
                    {selectedTransaction.paymentDetails.accountName && (
                      <Descriptions.Item label="Account Name">
                        {selectedTransaction.paymentDetails.accountName}
                      </Descriptions.Item>
                    )}
                    {selectedTransaction.paymentDetails.bankName && (
                      <Descriptions.Item label="Bank Name">
                        {selectedTransaction.paymentDetails.bankName}
                      </Descriptions.Item>
                    )}
                    {selectedTransaction.paymentDetails.branchName && (
                      <Descriptions.Item label="Branch Name">
                        {selectedTransaction.paymentDetails.branchName}
                      </Descriptions.Item>
                    )}
                  </Descriptions>

                  {selectedTransaction.paymentDetails.proofImage && (
                    <div>
                      <div style={{ marginBottom: "10px" }}>
                        <strong>Payment Proof Screenshot</strong>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "center",
                          padding: "10px 0",
                        }}
                      >
                        <Image
                          width={400}
                          height={300}
                          src={`http://localhost:5000${selectedTransaction.paymentDetails.proofImage}`}
                          alt="Payment Proof Screenshot"
                          style={{
                            maxWidth: "100%",
                            objectFit: "contain",
                            cursor: "pointer",
                            border: "2px solid #1890ff",
                            borderRadius: "4px",
                            padding: "5px",
                          }}
                          preview={{
                            mask: "👁️ Click to enlarge",
                          }}
                          onError={(e) => {
                            console.error(
                              "Image failed to load:",
                              `http://localhost:5000${selectedTransaction.paymentDetails.proofImage}`,
                            );
                            e.target.src =
                              'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23f0f0f0" width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999" font-size="18" font-family="Arial"%3EImage Not Found%3C/text%3E%3C/svg%3E';
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Timestamps */}
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="Created At">
                {formatDate(selectedTransaction.createdAt)}
              </Descriptions.Item>
              {selectedTransaction.approvedAt && (
                <Descriptions.Item label="Approved At">
                  {formatDate(selectedTransaction.approvedAt)}
                </Descriptions.Item>
              )}
              {selectedTransaction.processedAt && (
                <Descriptions.Item label="Processed At">
                  {formatDate(selectedTransaction.processedAt)}
                </Descriptions.Item>
              )}
              {selectedTransaction.propayDetails?.completedAt && (
                <Descriptions.Item label="Paid At">
                  {formatDate(selectedTransaction.propayDetails.completedAt)}
                </Descriptions.Item>
              )}
              {selectedTransaction.propayDetails?.lastStatusCheckedAt && (
                <Descriptions.Item label="Last Callback/Status">
                  {formatDate(selectedTransaction.propayDetails.lastStatusCheckedAt)}
                </Descriptions.Item>
              )}
              {selectedTransaction.updatedAt && (
                <Descriptions.Item label="Updated At">
                  {formatDate(selectedTransaction.updatedAt)}
                </Descriptions.Item>
              )}
            </Descriptions>

            {/* Admin Notes and Rejection Reason */}
            {(selectedTransaction.adminNote ||
              selectedTransaction.rejectionReason) && (
              <Descriptions column={1} bordered size="small">
                {selectedTransaction.adminNote && (
                  <Descriptions.Item label="Admin Note">
                    {selectedTransaction.adminNote}
                  </Descriptions.Item>
                )}
                {selectedTransaction.rejectionReason && (
                  <Descriptions.Item label="Rejection Reason">
                    <span className="text-red-600">
                      {selectedTransaction.rejectionReason}
                    </span>
                  </Descriptions.Item>
                )}
              </Descriptions>
            )}
          </div>
        )}
      </Modal>

      {/* Action Modal */}
      <Modal
        title={`${actionType === "approve" ? "Approve" : "Reject"} Transaction`}
        open={actionModalVisible}
        onCancel={() => {
          setActionModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={actionType === "approve" ? handleApprove : handleReject}
        >
          {actionType === "approve" ? (
            <Form.Item name="adminNote" label="Admin Note (Optional)">
              <Input.TextArea
                placeholder="Enter any notes for this approval"
                rows={3}
              />
            </Form.Item>
          ) : (
            <>
              <Form.Item
                name="rejectionReason"
                label="Rejection Reason"
                rules={[
                  { required: true, message: "Please enter rejection reason" },
                ]}
              >
                <Input.TextArea
                  placeholder="Enter reason for rejection"
                  rows={3}
                />
              </Form.Item>
              <Form.Item name="adminNote" label="Admin Note (Optional)">
                <Input.TextArea
                  placeholder="Enter any additional notes"
                  rows={2}
                />
              </Form.Item>
            </>
          )}

          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                danger={actionType === "reject"}
              >
                {actionType === "approve" ? "Approve" : "Reject"} Transaction
              </Button>
              <Button
                onClick={() => {
                  setActionModalVisible(false);
                  form.resetFields();
                }}
              >
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TransactionManagement;
