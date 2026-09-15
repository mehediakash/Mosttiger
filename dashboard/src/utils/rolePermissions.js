/**
 * Role Constants
 * Must match server-side role values exactly
 */
export const ROLES = {
  SUPER_ADMIN: "admin",
  MASTER_AGENT: "master_agent",
  AGENT: "agent",
  SUB_AGENT: "sub_agent",
  USER: "user",
};

/**
 * Permission Constants
 * Matches server-side AgentSettings model permissions
 */
export const PERMISSIONS = {
  // User Management (4)
  VIEW_USERS: "view_users",
  CREATE_USERS: "create_users",
  EDIT_USERS: "edit_users",
  RESET_USER_PASSWORD: "reset_user_password",

  // Financial Operations (5)
  ADD_BALANCE: "add_balance",
  DEDUCT_BALANCE: "deduct_balance",
  ADJUST_USER_BALANCE: "adjust_balance", // For backward compatibility
  ADJUST_BALANCE: "adjust_balance",
  APPROVE_DEPOSITS: "approve_deposits",
  APPROVE_WITHDRAWALS: "approve_withdrawals",

  // Agent Management (3)
  CREATE_SUB_AGENTS: "create_sub_agents",
  VIEW_SUB_AGENTS: "view_sub_agents",
  VIEW_AGENTS: "view_sub_agents", // Alias
  SET_SUB_AGENT_COMMISSION: "set_sub_agent_commission",
  MANAGE_AGENT_PERMISSIONS: "manage_agent_permissions",
  MANAGE_COMMISSIONS: "set_sub_agent_commission", // Alias

  // Reports & Analytics (5)
  VIEW_TRANSACTIONS: "view_transactions",
  VIEW_USER_BETS: "view_user_bets",
  VIEW_COMMISSION: "view_commission",
  VIEW_REPORTS: "view_reports",
  VIEW_ANALYTICS: "view_reports", // Alias
  CANCEL_BETS: "cancel_bets",

  // Commission (1)
  WITHDRAW_COMMISSION: "withdraw_commission",

  // Additional System Permissions
  MANAGE_GAMES: "manage_games",
  MANAGE_PROMOTIONS: "manage_promotions",
  MANAGE_CONTENT: "manage_content",
  MANAGE_SEO: "manage_content", // Alias
  MANAGE_SETTINGS: "manage_settings",
  VIEW_SYSTEM_HEALTH: "view_system_health",
  MANAGE_FRAUD_DETECTION: "manage_fraud_detection",
  MANAGE_WALLET: "adjust_balance", // Alias
  VIEW_PROVIDER_HEALTH: "manage_games", // Alias
};

/**
 * Check if user is admin (super power - has all permissions)
 */
const isAdmin = (user) => {
  if (!user || !user.role) return false;
  const role = user.role.toLowerCase();
  return role === "admin" || role === "super_admin";
};

/**
 * Check if user has a specific permission
 * Admin has ALL permissions automatically
 * Other roles: checks user.permissions array from server
 */
export const hasPermission = (user, permission) => {
  if (!user) return false;

  // Admin has super power - all permissions
  if (isAdmin(user)) return true;

  // Other roles check their permissions array
  if (!user.permissions) return false;
  return user.permissions.includes(permission);
};

/**
 * Check if user has ANY of the specified permissions
 * Admin automatically returns true
 */
export const hasAnyPermission = (user, permissions) => {
  if (!user) return false;

  // Admin has super power - all permissions
  if (isAdmin(user)) return true;

  // Other roles check their permissions array
  if (!user.permissions || !permissions?.length) return false;
  return permissions.some((permission) =>
    user.permissions.includes(permission),
  );
};

/**
 * Check if user has ALL of the specified permissions
 * Admin automatically returns true
 */
export const hasAllPermissions = (user, permissions) => {
  if (!user) return false;

  // Admin has super power - all permissions
  if (isAdmin(user)) return true;

  // Other roles check their permissions array
  if (!user.permissions || !permissions?.length) return false;
  return permissions.every((permission) =>
    user.permissions.includes(permission),
  );
};

/**
 * Get display name for role
 */
export const getRoleDisplayName = (role) => {
  const roleMap = {
    [ROLES.SUPER_ADMIN]: "Super Admin",
    admin: "Super Admin",
    super_admin: "Super Admin",
    [ROLES.MASTER_AGENT]: "Master Agent",
    master_agent: "Master Agent",
    [ROLES.SUB_AGENT]: "Sub Agent",
    sub_agent: "Sub Agent",
    [ROLES.AGENT]: "Agent",
    agent: "Agent",
    [ROLES.USER]: "User",
    user: "User",
  };
  return roleMap[role] || "Unknown Role";
};
