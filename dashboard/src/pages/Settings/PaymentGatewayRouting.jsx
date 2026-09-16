import React, { useState, useEffect } from "react";
import {
  Card,
  Row,
  Col,
  Switch,
  Button,
  Tag,
  Space,
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
  SwapOutlined,
  SafetyCertificateOutlined,
  ReloadOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import { paymentGatewayRoutingAPI } from "../../services/api";

const { Title, Text, Paragraph } = Typography;

const GATEWAY_DETAILS = {
  uddoktapay: {
    name: "UDDOKTAPAY",
    tagline: "Automated Checkout Deposit + Admin Managed Payout",
    badgeColor: "#18C8FF",
    features: [
      "Automated Checkout Redirect (bKash, Nagad, Rocket)",
      "Instant Server-Side Invoice Verification",
      "Manual Admin Approval for Withdrawals",
    ],
  },
  payment24x7: {
    name: "PAYMENT24X7",
    tagline: "Automated Checkout Deposit + Automated Payout",
    badgeColor: "#52c41a",
    features: [
      "Automated Checkout Redirect (bKash, Nagad, Rocket)",
      "Cryptographically Signed Webhook Callbacks",
      "Automated Direct Payout Disbursement",
    ],
  },
};

const PaymentGatewayRouting = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [routingConfig, setRoutingConfig] = useState(null);

  useEffect(() => {
    loadRoutingConfig();
  }, []);

  const loadRoutingConfig = async () => {
    try {
      setLoading(true);
      const res = await paymentGatewayRoutingAPI.getRoutingConfig();
      const data = res?.data?.data || res?.data;
      setRoutingConfig(data);
    } catch (err) {
      console.error("Failed to load payment gateway routing config:", err);
      message.error(
        err?.response?.data?.message ||
          "Failed to load payment gateway routing configuration.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleToggleEnabled = async (gatewayKey, nextEnabled) => {
    if (!routingConfig) return;

    const currentGateways = routingConfig.gateways || {};
    const otherKey = gatewayKey === "uddoktapay" ? "payment24x7" : "uddoktapay";
    const otherEnabled = Boolean(currentGateways[otherKey]?.enabled);

    // Rule: Cannot disable both
    if (!nextEnabled && !otherEnabled) {
      message.warning(
        "Cannot disable both gateways. At least one payment gateway must remain enabled.",
      );
      return;
    }

    // Rule: Cannot disable the active gateway
    if (!nextEnabled && routingConfig.activeGateway === gatewayKey) {
      message.warning(
        `Cannot disable '${gatewayKey.toUpperCase()}' because it is currently the active gateway. Switch the active gateway first.`,
      );
      return;
    }

    const payload = {
      activeGateway: routingConfig.activeGateway,
      gateways: {
        ...currentGateways,
        [gatewayKey]: {
          ...(currentGateways[gatewayKey] || {}),
          enabled: nextEnabled,
        },
      },
    };

    try {
      setSaving(true);
      const res = await paymentGatewayRoutingAPI.updateRoutingConfig(payload);
      const updated = res?.data?.data || res?.data;
      setRoutingConfig(updated);
      message.success(
        `${GATEWAY_DETAILS[gatewayKey]?.name || gatewayKey.toUpperCase()} has been ${nextEnabled ? "enabled" : "disabled"}.`,
      );
    } catch (err) {
      console.error("Failed to update gateway status:", err);
      message.error(
        err?.response?.data?.message ||
          "Failed to update gateway status. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSetActiveGateway = (targetGatewayKey) => {
    if (!routingConfig) return;

    if (routingConfig.activeGateway === targetGatewayKey) {
      message.info(
        `${GATEWAY_DETAILS[targetGatewayKey]?.name} is already the active gateway.`,
      );
      return;
    }

    const targetGateway = routingConfig.gateways?.[targetGatewayKey];
    const isTargetEnabled = Boolean(targetGateway?.enabled);
    const targetName =
      GATEWAY_DETAILS[targetGatewayKey]?.name || targetGatewayKey.toUpperCase();

    Modal.confirm({
      title: (
        <span className="text-white font-bold">
          Switch Active Payment Gateway?
        </span>
      ),
      icon: <ExclamationCircleOutlined className="text-amber-400" />,
      content: (
        <div className="text-slate-300 space-y-2 pt-2">
          <p>
            You are about to switch the live active payment gateway to:
            <strong className="text-primary ml-1">{targetName}</strong>.
          </p>
          {!isTargetEnabled && (
            <p className="text-amber-400 font-semibold">
              Note: {targetName} is currently disabled and will be automatically
              enabled when set as active.
            </p>
          )}
          <p className="text-xs text-slate-400">
            • All NEW deposits and withdrawals will immediately route through{" "}
            {targetName}.
            <br />• Existing pending transactions will safely retain their
            original gateway.
          </p>
        </div>
      ),
      okText: `Yes, Switch to ${targetName}`,
      okButtonProps: {
        className:
          "bg-primary hover:bg-[#48DDFF] text-black font-bold border-none",
      },
      cancelText: "Cancel",
      onOk: async () => {
        const payload = {
          activeGateway: targetGatewayKey,
          gateways: {
            ...routingConfig.gateways,
            [targetGatewayKey]: {
              ...(routingConfig.gateways?.[targetGatewayKey] || {}),
              enabled: true, // Ensure it is enabled
            },
          },
        };

        try {
          setSaving(true);
          const res =
            await paymentGatewayRoutingAPI.updateRoutingConfig(payload);
          const updated = res?.data?.data || res?.data;
          setRoutingConfig(updated);
          message.success(`Active payment gateway switched to ${targetName}!`);
        } catch (err) {
          console.error("Failed to switch active gateway:", err);
          message.error(
            err?.response?.data?.message ||
              "Failed to switch active gateway. Please try again.",
          );
        } finally {
          setSaving(false);
        }
      },
    });
  };

  const activeKey = routingConfig?.activeGateway || "payment24x7";
  const activeDetails = GATEWAY_DETAILS[activeKey] || {
    name: activeKey.toUpperCase(),
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#1e3a52] pb-5">
        <div>
          <Title
            level={3}
            className="!text-white !mb-1 flex items-center gap-3"
          >
            <BankOutlined className="text-primary" />
            Payment Gateway & Routing Management
          </Title>
          <Text className="text-slate-400 text-sm">
            Control which payment gateway routes live deposits and withdrawals.
          </Text>
        </div>

        <Button
          icon={<ReloadOutlined />}
          onClick={loadRoutingConfig}
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
                Active Gateway Source of Truth:
              </span>
              <Tag
                color="cyan"
                className="text-sm font-black px-3 py-1 rounded-full border-cyan-400"
              >
                ● {activeDetails.name}
              </Tag>
            </div>
            <span className="text-xs text-slate-300">
              New transactions route to{" "}
              <strong className="text-primary">{activeDetails.name}</strong>.
              Historical callbacks route by original transaction gateway.
            </span>
          </div>
        }
        type="info"
        showIcon
        icon={<ThunderboltOutlined className="text-primary text-xl" />}
        className="!bg-[#0d1e2e] !border-[#1e3a52] text-slate-200 rounded-xl"
      />

      {loading && !routingConfig ? (
        <div className="flex justify-center py-20">
          <Spin size="large" tip="Loading payment routing configuration..." />
        </div>
      ) : (
        <Row gutter={[24, 24]}>
          {["uddoktapay", "payment24x7"].map((key) => {
            const meta = GATEWAY_DETAILS[key];
            const gatewayConfig = routingConfig?.gateways?.[key] || {};
            const isEnabled = Boolean(gatewayConfig.enabled);
            const isActive = routingConfig?.activeGateway === key;

            return (
              <Col xs={24} md={12} key={key}>
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
                        <span className="text-xl font-black text-white tracking-wide">
                          {meta.name}
                        </span>
                        {isActive && (
                          <Tag
                            color="success"
                            className="font-bold uppercase tracking-wider text-xs px-2.5 py-0.5 rounded-full"
                          >
                            Active Gateway
                          </Tag>
                        )}
                      </div>
                      <p className="text-xs text-slate-400">{meta.tagline}</p>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs text-slate-400">
                        Gateway Status
                      </span>
                      <Tag
                        icon={
                          isEnabled ? (
                            <CheckCircleOutlined />
                          ) : (
                            <CloseCircleOutlined />
                          )
                        }
                        color={isEnabled ? "green" : "default"}
                        className="font-semibold text-xs px-2.5 py-0.5 rounded-full"
                      >
                        {isEnabled ? "ENABLED (ON)" : "DISABLED (OFF)"}
                      </Tag>
                    </div>
                  </div>

                  {/* Switch and status row */}
                  <div className="bg-[#050912]/60 rounded-xl p-4 border border-[#16314D] mb-5 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold text-white">
                        Gateway Enable / Disable
                      </div>
                      <div className="text-xs text-slate-400">
                        {isEnabled
                          ? "Gateway is allowed to be set active"
                          : "Gateway is blocked from processing new payments"}
                      </div>
                    </div>

                    <Switch
                      checked={isEnabled}
                      onChange={(checked) => handleToggleEnabled(key, checked)}
                      loading={saving}
                      checkedChildren="ON"
                      unCheckedChildren="OFF"
                      className={isEnabled ? "!bg-primary" : ""}
                    />
                  </div>

                  {/* Features List */}
                  <div className="mb-6 space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Gateway Capabilities:
                    </span>
                    <ul className="space-y-1.5 text-xs text-slate-300">
                      {meta.features.map((feat, idx) => (
                        <li key={idx} className="flex items-center gap-2">
                          <SafetyCertificateOutlined className="text-primary shrink-0" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Action Button */}
                  <div className="pt-2">
                    {isActive ? (
                      <Button
                        type="primary"
                        block
                        size="large"
                        disabled
                        className="!bg-emerald-600/20 !border-emerald-500/50 !text-emerald-400 font-bold rounded-xl"
                        icon={<CheckCircleOutlined />}
                      >
                        Currently Active Gateway
                      </Button>
                    ) : (
                      <Button
                        type="primary"
                        block
                        size="large"
                        icon={<SwapOutlined />}
                        loading={saving}
                        onClick={() => handleSetActiveGateway(key)}
                        className="bg-primary hover:bg-[#48DDFF] !text-black font-black border-none rounded-xl shadow-[0_0_15px_rgba(24,200,255,0.25)] transition-all"
                      >
                        {isEnabled
                          ? `Set ${meta.name} as Active`
                          : `Enable & Set ${meta.name} as Active`}
                      </Button>
                    )}
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
              Business Logic & Routing Protection Rules:
            </span>
            <p>
              • <strong>Deposit Routing:</strong> When a user initiates a
              deposit, the system creates the payment request using the
              currently Active Gateway ({activeDetails.name}).
            </p>
            <p>
              • <strong>Withdrawal Routing:</strong> When a user submits a
              withdrawal, it is routed to the Active Gateway (Payment24x7
              handles automated API payout; UddoktaPay queues for manual admin
              disbursement).
            </p>
            <p>
              • <strong>Historical Transactions:</strong> Switching the active
              gateway does not alter existing transactions. Past deposits and
              withdrawals always verify and complete through their original
              gateway callback handlers.
            </p>
            <p>
              • <strong>Failsafe:</strong> The system enforces that the active
              gateway must always remain enabled, and at least one gateway must
              be available at all times.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default PaymentGatewayRouting;
