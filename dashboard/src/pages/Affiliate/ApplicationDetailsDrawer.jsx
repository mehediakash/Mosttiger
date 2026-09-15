import React from "react";
import { Descriptions, Drawer, Space, Tag, Typography } from "antd";
import { dateText, renderStatusTag } from "./affiliateUtils";

const { Link, Text } = Typography;

const ApplicationDetailsDrawer = ({ open, application, onClose }) => {
  const basic = application?.basicInfo || {};
  const payment = application?.payment || {};
  const marketing = application?.marketing || {};
  const social = application?.socialLinks || {};

  return (
    <Drawer
      title="Affiliate Application Details"
      open={open}
      onClose={onClose}
      width={720}
    >
      {application && (
        <Space direction="vertical" size="large" className="w-full">
          <Descriptions title="Basic Information" bordered column={1} size="small">
            <Descriptions.Item label="Full Name">{basic.fullName || "N/A"}</Descriptions.Item>
            <Descriptions.Item label="Username">{basic.username || "N/A"}</Descriptions.Item>
            <Descriptions.Item label="Email">{basic.email || "N/A"}</Descriptions.Item>
            <Descriptions.Item label="Phone">{basic.phone || "N/A"}</Descriptions.Item>
            <Descriptions.Item label="Country">{basic.country || "N/A"}</Descriptions.Item>
          </Descriptions>

          <Descriptions title="Payment Information" bordered column={1} size="small">
            <Descriptions.Item label="Method">
              <Tag>{payment.preferredPaymentMethod?.toUpperCase() || "N/A"}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Payment Number">{payment.paymentNumber || "N/A"}</Descriptions.Item>
            <Descriptions.Item label="Bank">{payment.bankName || "N/A"}</Descriptions.Item>
            <Descriptions.Item label="Account Name">{payment.accountName || "N/A"}</Descriptions.Item>
            <Descriptions.Item label="Account Number">{payment.accountNumber || "N/A"}</Descriptions.Item>
          </Descriptions>

          <Descriptions title="Marketing Information" bordered column={1} size="small">
            <Descriptions.Item label="Promotion Method">{marketing.promotionMethod || "N/A"}</Descriptions.Item>
            <Descriptions.Item label="Traffic Source">{marketing.trafficSource || "N/A"}</Descriptions.Item>
            <Descriptions.Item label="Estimated Monthly Players">{marketing.estimatedMonthlyPlayers || 0}</Descriptions.Item>
            <Descriptions.Item label="Previous Experience">{marketing.previousExperience || "N/A"}</Descriptions.Item>
            <Descriptions.Item label="Previous Betting Site">{marketing.previousBettingSite || "N/A"}</Descriptions.Item>
          </Descriptions>

          <Descriptions title="Social Links" bordered column={1} size="small">
            {["facebook", "telegram", "website", "youtube"].map((key) => (
              <Descriptions.Item key={key} label={key.toUpperCase()}>
                {social[key] ? <Link href={social[key]} target="_blank">{social[key]}</Link> : "N/A"}
              </Descriptions.Item>
            ))}
          </Descriptions>

          <Descriptions title="Review" bordered column={1} size="small">
            <Descriptions.Item label="Status">{renderStatusTag(application.status)}</Descriptions.Item>
            <Descriptions.Item label="Application Date">{dateText(application.createdAt)}</Descriptions.Item>
            <Descriptions.Item label="Reviewed At">{dateText(application.reviewedAt)}</Descriptions.Item>
            <Descriptions.Item label="Notes">
              <Text>{application.adminNote || application.rejectionReason || "N/A"}</Text>
            </Descriptions.Item>
          </Descriptions>
        </Space>
      )}
    </Drawer>
  );
};

export default ApplicationDetailsDrawer;
