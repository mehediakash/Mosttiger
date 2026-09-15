import { useSelector } from "react-redux";
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getRoleDisplayName,
  ROLES,
  PERMISSIONS,
} from "../utils/rolePermissions";

/**
 * usePermissions Hook
 *
 * Provides easy access to user permissions throughout the application.
 * All permission checks are based on server-provided permissions array.
 *
 * NO HARDCODED LOGIC - Everything driven by backend response.
 */
export const usePermissions = () => {
  const { user, loading } = useSelector((state) => state.auth);

  // Extract server-provided data
  const permissions = user?.permissions || [];
  const role = user?.role;
  const agentId = user?._id || user?.id;

  // Check if user is admin (super power)
  const isAdmin =
    role === ROLES.SUPER_ADMIN || role === "admin" || role === "super_admin";

  return {
    // User data
    user,
    role,
    permissions,
    agentId,
    isLoading: loading,

    // Permission checking functions
    hasPermission: (permission) => hasPermission(user, permission),
    hasAnyPermission: (perms) => hasAnyPermission(user, perms),
    hasAllPermissions: (perms) => hasAllPermissions(user, perms),

    // Role checks
    isAdmin,
    isMasterAgent: role === ROLES.MASTER_AGENT || role === "master_agent",
    isSubAgent: role === ROLES.SUB_AGENT || role === "sub_agent",
    isAgent: role === ROLES.AGENT || role === "agent",

    // Utility
    getRoleDisplayName: () => getRoleDisplayName(role),

    // Grouped permission checks (for convenience)
    // Admin has ALL permissions automatically
    can: {
      // User Management
      viewUsers: isAdmin || hasPermission(user, PERMISSIONS.VIEW_USERS),
      createUsers: isAdmin || hasPermission(user, PERMISSIONS.CREATE_USERS),
      editUsers: isAdmin || hasPermission(user, PERMISSIONS.EDIT_USERS),
      resetPasswords:
        isAdmin || hasPermission(user, PERMISSIONS.RESET_USER_PASSWORD),

      // Financial
      addBalance: isAdmin || hasPermission(user, PERMISSIONS.ADD_BALANCE),
      deductBalance: isAdmin || hasPermission(user, PERMISSIONS.DEDUCT_BALANCE),
      adjustBalance: isAdmin || hasPermission(user, PERMISSIONS.ADJUST_BALANCE),
      approveDeposits:
        isAdmin || hasPermission(user, PERMISSIONS.APPROVE_DEPOSITS),
      approveWithdrawals:
        isAdmin || hasPermission(user, PERMISSIONS.APPROVE_WITHDRAWALS),

      // Agent Management
      createSubAgents:
        isAdmin || hasPermission(user, PERMISSIONS.CREATE_SUB_AGENTS),
      viewSubAgents:
        isAdmin || hasPermission(user, PERMISSIONS.VIEW_SUB_AGENTS),
      setCommission:
        isAdmin || hasPermission(user, PERMISSIONS.SET_SUB_AGENT_COMMISSION),

      // Reports
      viewTransactions:
        isAdmin || hasPermission(user, PERMISSIONS.VIEW_TRANSACTIONS),
      viewBets: isAdmin || hasPermission(user, PERMISSIONS.VIEW_USER_BETS),
      viewCommission:
        isAdmin || hasPermission(user, PERMISSIONS.VIEW_COMMISSION),
      viewReports: isAdmin || hasPermission(user, PERMISSIONS.VIEW_REPORTS),
      cancelBets: isAdmin || hasPermission(user, PERMISSIONS.CANCEL_BETS),

      // Commission
      withdrawCommission:
        isAdmin || hasPermission(user, PERMISSIONS.WITHDRAW_COMMISSION),

      // System
      manageGames: isAdmin || hasPermission(user, PERMISSIONS.MANAGE_GAMES),
      managePromotions:
        isAdmin || hasPermission(user, PERMISSIONS.MANAGE_PROMOTIONS),
      manageContent: isAdmin || hasPermission(user, PERMISSIONS.MANAGE_CONTENT),
    },
  };
};

export default usePermissions;
