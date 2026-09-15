import React from "react";
import dayjs from "dayjs";
import { Tag } from "antd";
import { formatCurrency, formatDate, getStatusColor } from "../../utils/helpers";

export const statusOptions = ["pending", "approved", "rejected", "suspended"];
export const paymentMethods = ["bkash", "nagad", "rocket", "bank"];
export const carryResetOptions = ["monthly", "quarterly", "never"];
export const settlementOptions = ["daily", "weekly", "monthly"];
export const withdrawApprovalOptions = ["auto", "manual"];
export const revenueStartOptions = ["affiliate_status"];

export const renderStatusTag = (status) =>
  React.createElement(
    Tag,
    { color: getStatusColor(status) },
    status ? status.toUpperCase() : "N/A",
);

export const money = (value) => formatCurrency(Number(value || 0));

export const dateText = (value) => (value ? formatDate(value) : "N/A");

export const getUserId = (record) => record?.user?._id || record?._id;

export const getAffiliate = (record) => record?.user?.affiliate || record?.affiliate || {};

export const getApplicationRows = (applications = []) =>
  applications.map((application) => ({
    ...application,
    key: application._id,
    applicant:
      application.basicInfo?.fullName ||
      application.user?.fullName ||
      application.user?.username ||
      "N/A",
    username:
      application.basicInfo?.username || application.user?.username || "N/A",
    phone: application.basicInfo?.phone || application.user?.phone || "N/A",
    country: application.basicInfo?.country || "N/A",
    promotionMethod: application.marketing?.promotionMethod || "N/A",
    estimatedMonthlyPlayers: application.marketing?.estimatedMonthlyPlayers || 0,
  }));

export const buildQueryFromFilters = (filters = {}, pagination = {}) => {
  const params = {
    page: pagination.current || 1,
    limit: pagination.pageSize || 20,
  };

  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;

    if (key === "dateRange" && Array.isArray(value)) {
      params.startDate = value[0]?.format?.("YYYY-MM-DD");
      params.endDate = value[1]?.format?.("YYYY-MM-DD");
      return;
    }

    params[key] = value;
  });

  return params;
};

export const normalizeConfigForForm = (config = {}) => ({
  revenueSharePercentage: Number(config.revenueSharePercentage || 0),
  minimumDeposit: Number(config.minimumDeposit || 0),
  requiredTurnover: Number(config.requiredTurnover || 0),
  enableNegativeCarry: Boolean(config.enableNegativeCarry),
  carryReset: config.carryReset || "monthly",
  maximumNegativeCarry: Number(config.maximumNegativeCarry || 0),
  settlementFrequency: config.settlementFrequency || "monthly",
  minimumWithdraw: Number(config.minimumWithdraw || 0),
  withdrawApproval: config.withdrawApproval || "manual",
  revenueShareStartCondition:
    config.revenueShareStartCondition || "affiliate_status",
});

export const chartMonth = (date) =>
  date ? dayjs(date).format("MMM YYYY") : "Unknown";
