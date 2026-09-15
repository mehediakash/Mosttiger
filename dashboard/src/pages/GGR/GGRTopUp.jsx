import React, { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Result,
  Row,
  Skeleton,
  Space,
  Statistic,
  Typography,
} from "antd";
import {
  DollarOutlined,
  ReloadOutlined,
  ShoppingCartOutlined,
} from "@ant-design/icons";
import { ggrTopUpAPI } from "../../services/api";
import { formatCurrency, formatDate, formatNumber } from "../../utils/helpers";

const TELEGRAM_URL = "https://t.me/gamebetxofficial";

const normalizeGGR = (response) => response?.data?.data || null;

const GGRTopUp = () => {
  const [ggr, setGgr] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadGGR = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await ggrTopUpAPI.getLatest();
      setGgr(normalizeGGR(response));
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load GGR information");
      setGgr(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGGR();
  }, []);

  const openBuyGGR = () => {
    window.open(TELEGRAM_URL, "_blank", "noopener,noreferrer");
  };

  if (loading && !ggr) {
    return (
      <Space direction="vertical" size="large" className="w-full">
        <Card>
          <Skeleton active paragraph={{ rows: 4 }} />
        </Card>
        <Card>
          <Skeleton active paragraph={{ rows: 6 }} />
        </Card>
      </Space>
    );
  }

  if (error && !ggr) {
    return (
      <Result
        status="warning"
        title="Unable to load GGR information"
        subTitle={error}
        extra={
          <Button type="primary" icon={<ReloadOutlined />} onClick={loadGGR}>
            Retry
          </Button>
        }
      />
    );
  }

  if (!ggr) {
    return (
      <Card>
        <Empty description="No GGR information found">
          <Button type="primary" icon={<ReloadOutlined />} onClick={loadGGR}>
            Refresh
          </Button>
        </Empty>
      </Card>
    );
  }

  return (
    <Space direction="vertical" size="large" className="w-full">
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Current GGR Balance"
              value={ggr.totalGGR}
              formatter={formatCurrency}
              prefix={<DollarOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Bets"
              value={ggr.totalBets}
              formatter={formatNumber}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Player Loss"
              value={ggr.totalPlayerLoss}
              formatter={formatCurrency}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Player Win"
              value={ggr.totalPlayerWin}
              formatter={formatCurrency}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title="GGR Status"
        extra={
          <Button icon={<ReloadOutlined />} onClick={loadGGR} loading={loading}>
            Refresh
          </Button>
        }
      >
        <Row gutter={[24, 24]} align="middle">
          <Col xs={24} lg={10}>
            <Statistic
              title="Current GGR Balance"
              value={ggr.totalGGR}
              formatter={formatCurrency}
              valueStyle={{
                color: Number(ggr.totalGGR || 0) > 0 ? "#16a34a" : "#dc2626",
              }}
            />
            <Typography.Text type="secondary">
              Last Updated: {ggr.updatedAt ? formatDate(ggr.updatedAt) : "N/A"}
            </Typography.Text>
          </Col>
          <Col xs={24} lg={14}>
            <Space direction="vertical" size="large" className="w-full">
              <Alert
                type={Number(ggr.totalGGR || 0) > 0 ? "info" : "warning"}
                showIcon
                message="GGR Balance Information"
                description="GGR Balance is used to keep your betting platform active. If your balance reaches zero or below, game launching may stop until additional GGR is added."
              />
              <Button
                type="primary"
                size="large"
                icon={<ShoppingCartOutlined />}
                onClick={openBuyGGR}
                block
              >
                BUY GGR
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>
    </Space>
  );
};

export default GGRTopUp;
