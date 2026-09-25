import React, { useState, useEffect } from "react";
import {
  Card,
  Row,
  Col,
  Switch,
  Button,
  Tag,
  Alert,
  Modal,
  Spin,
  message,
  Typography,
} from "antd";
import {
  BankOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ThunderboltOutlined,
  SafetyCertificateOutlined,
  ReloadOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import { paymentGatewayRoutingAPI } from "../../services/api";

const { Title, Text } = Typography;

const GATEWAY_META = {
  PAYMENT24X7: {
    key: "PAYMENT24X7",
    backendKey: "payment24x7",
    name: "PAYMENT24X7",
    tagline: "Automated Checkout Deposit + Automated Payout API",
    features: [
      "Automated Checkout Redirect (bKash, Nagad, Rocket)",
      "Cryptographically Signed Webhook Callbacks",
      "Automated Direct Payout Disbursement",
    ],
  },
  UDDOKTAPAY: {
    key: "UDDOKTAPAY",
    backendKey: "uddoktapay",
    name: "UDDOKTAPAY",
    tagline: "Hosted Checkout Gateway + Admin-Managed Payout",
    features: [
      "Multi-method Hosted Checkout (bKash, Nagad, Rocket)",
      "Instant Server-Side Invoice Verification",
      "Manual Admin Approval & Disbursement for Withdrawals",
    ],
  },
};

const PaymentGatewayRouting = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeGateway, setActiveGateway] = useState("PAYMENT24X7");
  const [gatewayData, setGatewayData] = useState(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const res = await paymentGatewayRoutingAPI.getRoutingConfig();
      const data = res?.data || {};
      const active =
        data.activeGateway ||
        (data.raw?.activeGateway
          ? String(data.raw.activeGateway).toUpperCase()
          : "PAYMENT24X7");

      setActiveGateway(active);
      setGatewayData(data);
    } catch (err) {
      console.error("Failed to load payment gateway config:", err);
      message.error(
        err?.response?.data?.message ||
          "Failed to load payment gateway routing configuration.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (targetKey, checked) => {
    const currentActive = activeGateway;
    const otherKey = targetKey === "PAYMENT24X7" ? "UDDOKTAPAY" : "PAYMENT24X7";

    // If trying to turn OFF the active gateway directly
    if (!checked && targetKey === currentActive) {
      message.warning(
        `Only one gateway can be active at a time. To switch from ${targetKey}, turn ON ${otherKey}.`,
      );
      return;
    }

    // If turning ON the inactive gateway
    if (checked && targetKey !== currentActive) {
      Modal.confirm({
        title: (
          <span className="text-white font-bold text-lg">
            Switch payment gateway?
          </span>
        ),
        icon: <ExclamationCircleOutlined className="text-amber-400" />,
        content: (
          <div className="text-slate-300 space-y-3 pt-2">
            <div className="bg-[#050912] p-3 rounded-lg border border-[#16314D] text-center font-bold text-base text-primary">
              {currentActive} → {targetKey}
            </div>
            <p className="text-sm">
              New deposits and withdrawals will use <strong>{targetKey}</strong>
              .
            </p>
            <p className="text-xs text-slate-400">
              • Historical pending transactions will continue to process
              callbacks safely using their original gateway.
            </p>
          </div>
        ),
        okText: "Confirm",
        cancelText: "Cancel",
        okButtonProps: {
          className:
            "bg-primary hover:bg-[#48DDFF] text-black font-bold border-none",
        },
        onOk: async () => {
          try {
            setSaving(true);
            const res = await paymentGatewayRoutingAPI.switchGateway(targetKey);
            const data = res?.data || {};
            const nextActive =
              data.activeGateway ||
              (data.raw?.activeGateway
                ? String(data.raw.activeGateway).toUpperCase()
                : targetKey);

            setActiveGateway(nextActive);
            setGatewayData(data);
            message.success("Payment gateway switched successfully.");
          } catch (err) {
            console.error("Failed to switch payment gateway:", err);
            message.error(
              err?.response?.data?.message ||
                "Failed to switch payment gateway. Please try again.",
            );
          } finally {
            setSaving(false);
          }
        },
      });
    }
  };

  const gatewaysList = [GATEWAY_META.PAYMENT24X7, GATEWAY_META.UDDOKTAPAY];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#1e3a52] pb-5">
        <div>
          <Title
            level={3}
            className="!text-white !mb-1 flex items-center gap-3"
          >
            <BankOutlined className="text-primary" />
            Payment Gateway Management
          </Title>
          <Text className="text-slate-400 text-sm">
            Control which payment gateway is active for customer deposits and
            withdrawals.
          </Text>
        </div>

        <Button
          icon={<ReloadOutlined />}
          onClick={loadConfig}
          loading={loading}
          className="self-start sm:self-auto border-[#1e3a52] bg-[#0d1e2e] text-slate-200 hover:text-primary hover:border-primary"
        >
          Refresh
        </Button>
      </div>

      {/* Overview / Active Banner */}
      <Alert
        message={
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="font-bold text-base text-white mr-2">
                Current Active Gateway:
              </span>
              <Tag
                color="cyan"
                className="text-sm font-black px-3 py-1 rounded-full border-cyan-400"
              >
                ● {activeGateway || "NONE"}
              </Tag>
            </div>
            <span className="text-xs text-slate-300">
              Only <strong>ONE</strong> gateway can be active at a time. Turning
              ON one automatically turns OFF the other.
            </span>
          </div>
        }
        type="info"
        showIcon
        icon={<ThunderboltOutlined className="text-primary text-xl" />}
        className="!bg-[#0d1e2e] !border-[#1e3a52] text-slate-200 rounded-xl"
      />

      {loading && !gatewayData ? (
        <div className="flex justify-center py-20">
          <Spin size="large" tip="Loading payment gateway configuration..." />
        </div>
      ) : (
        <Row gutter={[24, 24]}>
          {gatewaysList.map((gw) => {
            const isActive = activeGateway === gw.key;

            return (
              <Col xs={24} md={12} key={gw.key}>
                <Card
                  className={`h-full border transition-all duration-300 rounded-2xl shadow-xl ${
                    isActive
                      ? "border-primary bg-gradient-to-b from-[#0e273f] to-[#0b1522] shadow-[0_0_25px_rgba(24,200,255,0.15)]"
                      : "border-[#1e3a52] bg-[#0d1e2e] hover:border-slate-500"
                  }`}
                  styles={{ body: { padding: "24px" } }}
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-2xl font-black text-white tracking-wide">
                          {gw.name}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">{gw.tagline}</p>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <Tag
                        icon={
                          isActive ? (
                            <CheckCircleOutlined />
                          ) : (
                            <CloseCircleOutlined />
                          )
                        }
                        color={isActive ? "green" : "default"}
                        className="font-bold text-xs px-2.5 py-1 rounded-full uppercase"
                      >
                        {isActive ? "ACTIVE" : "INACTIVE"}
                      </Tag>
                    </div>
                  </div>

                  {/* Switch Row */}
                  <div className="bg-[#050912]/80 rounded-xl p-4 border border-[#16314D] mb-5 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold text-white">
                        Gateway Status
                      </div>
                      <div className="text-xs text-slate-400">
                        {isActive
                          ? "Currently routing all user deposits & withdrawals"
                          : "Disabled (Turn ON to activate)"}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`text-sm font-bold ${isActive ? "text-primary" : "text-slate-500"}`}
                      >
                        {isActive ? "ON" : "OFF"}
                      </span>
                      <Switch
                        checked={isActive}
                        onChange={(checked) => handleToggle(gw.key, checked)}
                        loading={saving}
                        checkedChildren="ON"
                        unCheckedChildren="OFF"
                        className={isActive ? "!bg-primary" : ""}
                      />
                    </div>
                  </div>

                  {/* Capabilities */}
                  <div className="space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Gateway Capabilities:
                    </span>
                    <ul className="space-y-1.5 text-xs text-slate-300">
                      {gw.features.map((feat, idx) => (
                        <li key={idx} className="flex items-center gap-2">
                          <SafetyCertificateOutlined className="text-primary shrink-0" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}

      {/* Safety & Edge Case Information Box */}
      <Card
        className="border border-[#1e3a52] bg-[#0d1e2e] rounded-2xl"
        styles={{ body: { padding: "20px" } }}
      >
        <div className="flex items-start gap-3">
          <ExclamationCircleOutlined className="text-primary text-lg mt-0.5" />
          <div className="space-y-1 text-xs text-slate-300 leading-relaxed">
            <span className="font-bold text-sm text-white block">
              Business Rules & Protection:
            </span>
            <p>
              • <strong>Mutual Exclusivity:</strong> Only ONE gateway can be
              active at a time. Turning ON PAYMENT24X7 automatically turns OFF
              UDDOKTAPAY, and vice versa.
            </p>
            <p>
              • <strong>Deposit Routing:</strong> When UDDOKTAPAY is active,
              customer deposit provider selection is hidden and users are routed
              directly to UddoktaPay's multi-method checkout. When PAYMENT24X7
              is active, provider selection is displayed.
            </p>
            <p>
              • <strong>Withdrawal Routing:</strong> When PAYMENT24X7 is active,
              automated payouts are processed. When UDDOKTAPAY is active,
              withdrawals are queued for admin review and disbursement.
            </p>
            <p>
              • <strong>Callback Safety:</strong> Historical pending
              transactions always verify and complete through their original
              gateway callback handlers.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default PaymentGatewayRouting;
