import React from "react";
import { Progress, Tag } from "antd";
import { formatCurrency, formatDate, getStatusColor } from "../../utils/helpers";

export const relationshipStatusOptions = [
  "waiting_deposit",
  "waiting_turnover",
  "qualified",
  "bonus_created",
  "cancelled",
];

export const bonusStatusOptions = [
  "pending",
  "qualified",
  "pending_claim",
  "claimed",
  "turnover_active",
  "completed",
  "cancelled",
];

export const referralStatusOptions = ["active", "inactive"];

const statusColorMap = {
  waiting_deposit: "gold",
  waiting_turnover: "blue",
  qualified: "green",
  bonus_created: "cyan",
  pending_claim: "orange",
  claimed: "purple",
  turnover_active: "processing",
  completed: "green",
  cancelled: "red",
  active: "green",
  inactive: "default",
};

export const labelize = (value) =>
  value ? String(value).replace(/_/g, " ").toUpperCase() : "N/A";

export const renderReferralStatusTag = (status) =>
  React.createElement(
    Tag,
    { color: statusColorMap[status] || getStatusColor(status) },
    labelize(status),
  );

export const money = (value) => formatCurrency(Number(value || 0));

export const dateText = (value) => (value ? formatDate(value) : "N/A");

export const getApiData = (response) => response?.data?.data || response?.data || {};

export const getListPayload = (response, keys = []) => {
  const data = getApiData(response);
  const rows =
    keys.map((key) => data?.[key]).find((value) => Array.isArray(value)) ||
    (Array.isArray(data) ? data : []);

  return {
    rows,
    pagination: data?.pagination || {
      total: data?.total || rows.length,
      page: data?.page,
      limit: data?.limit,
    },
  };
};

export const buildQueryFromFilters = (filters = {}, pagination = {}, sorter = {}) => {
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

  if (sorter?.field && sorter?.order) {
    params.sortBy = sorter.field;
    params.sortOrder = sorter.order === "ascend" ? "asc" : "desc";
  }

  return params;
};

export const getUserDisplay = (user) =>
  user?.username || user?.fullName || user?.name || user?.email || "N/A";

export const getReferralRow = (record = {}) => ({
  ...record,
  key: record._id,
  referrer: record.referrer || record.referrerUser || record.user || {},
  referredUser: record.referredUser || record.referralUser || record.player || {},
  firstDeposit:
    record.firstDeposit?.amount ??
    record.deposit?.amount ??
    record.firstDepositAmount ??
    record.firstDeposit,
  requiredTurnover:
    record.turnover?.required ??
    record.requiredTurnover ??
    record.bonus?.requiredTurnover ??
    0,
  completedTurnover:
    record.turnover?.completed ??
    record.completedTurnover ??
    record.bonus?.completedTurnover ??
    0,
  bonusAmount: record.bonus?.amount ?? record.bonusAmount ?? 0,
});

export const renderTurnoverProgress = (completed = 0, required = 0) => {
  const percent = required > 0 ? Math.min(Math.round((completed / required) * 100), 100) : 0;
  return React.createElement(Progress, {
    percent,
    size: "small",
    status: percent >= 100 ? "success" : "active",
  });
};

export const chartMonth = (value) => {
  if (!value) return "Unknown";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
};
