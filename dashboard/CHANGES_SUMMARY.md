# Hierarchy-Based Data Access Implementation

## Summary

Fixed the Master Agent dashboard to show only downline data according to the server workflow. Implemented strict hierarchy-based filtering where agents can ONLY see users, transactions, and data from their own downline.

## Changes Made

### 1. Updated UserManagement.jsx

**File**: `dashboard/src/pages/Management/UserManagement.jsx`

**Changes**:

- Added `usePermissions` hook import
- Replaced `hasPermission` calls with `can.*` properties from hook
- Updated `loadUsers()` to call different API endpoints based on role:
  ```javascript
  const response = isAdmin
    ? await userAPI.getUsers(params) // All users
    : await userAPI.getDownlineUsers(params); // Only downline
  ```

**Impact**: Master Agents and Agents now see only users in their hierarchy chain, not all platform users.

---

### 2. Updated TransactionManagement.jsx

**File**: `dashboard/src/pages/Management/TransactionManagement.jsx`

**Changes**:

- Added `usePermissions` hook import
- Replaced `hasPermission` calls with `can.*` properties
- Updated `loadPendingTransactions()` to use hierarchy-scoped endpoint:
  ```javascript
  const response = isAdmin
    ? await paymentAPI.getPendingTransactions({ type })
    : await paymentAPI.getDownlinePendingTransactions({ type });
  ```

**Impact**: Agents now see only pending transactions from their downline users.

---

### 3. Updated API Service (services/api.js)

**File**: `dashboard/src/services/api.js`

**Changes**:

#### User Endpoints

```javascript
export const userAPI = {
  // Admin endpoint - ALL users
  getUsers: (params) => axiosInstance.get("/api/admin/users", { params }),

  // Agent endpoint - ONLY downline (hierarchy-scoped)
  getDownlineUsers: (params) =>
    axiosInstance.get("/api/agents/downline", { params }),
};
```

#### Payment Endpoints

```javascript
export const paymentAPI = {
  // Admin endpoints - ALL transactions
  getPendingTransactions: (params) =>
    axiosInstance.get("/api/admin/transactions/pending", { params }),

  // Agent endpoints - ONLY downline transactions (hierarchy-scoped)
  getDownlinePendingTransactions: (params) =>
    axiosInstance.get("/api/agent-transactions/pending", { params }),

  approveDeposit: (depositId, data) =>
    axiosInstance.put(
      `/api/agent-transactions/deposits/${depositId}/approve`,
      data,
    ),

  approveWithdrawal: (withdrawalId, data) =>
    axiosInstance.put(
      `/api/agent-transactions/withdrawals/${withdrawalId}/approve`,
      data,
    ),
};
```

**Impact**: Clear separation between admin (all data) and agent (hierarchy-scoped) endpoints.

---

### 4. Created Documentation

**File**: `dashboard/HIERARCHY_SYSTEM.md`

**Contents**:

- Complete hierarchy structure explanation
- Database model documentation
- API endpoint reference
- Server-side filtering logic
- Frontend implementation guide
- Testing scenarios
- Common issues and solutions
- Best practices

---

## Verification

### Server-Side (Already Correct)

The server already had the correct implementation:

1. **agentDashboardController.js** - Uses `getDownlineQuery()` for all stats
2. **agentController.js** - `/api/agents/downline` returns hierarchy-filtered users
3. **transactionApprovalController.js** - Filters transactions by downline user IDs
4. **agentManagementController.js** - Has `getDownlineQuery()` method

### Frontend (Now Fixed)

1. **UserManagement** - ✅ Calls correct endpoint based on role
2. **AgentManagement** - ✅ Already using correct endpoints (from previous fix)
3. **TransactionManagement** - ✅ Now calls hierarchy-scoped endpoints
4. **Dashboard Components** - ✅ Already using `/api/agent-dashboard/overview` which is hierarchy-scoped

---

## How It Works

### Master Agent Login Flow

1. **Login**: JWT token includes role and permissions
2. **Dashboard**: Calls `/api/agent-dashboard/overview`
   - Server uses `getDownlineQuery(agentId, 'master_agent')`
   - Returns stats only for users where:
     ```javascript
     {
       $or: [
         { "hierarchy.masterAgent": agentId },
         { "hierarchy.agent": agentId },
         { "hierarchy.subAgent": agentId },
       ];
     }
     ```

3. **User Management**: Calls `/api/agents/downline`
   - Returns only users in hierarchy chain
   - Cannot see users created by other master agents

4. **Transaction Management**: Calls `/api/agent-transactions/pending`
   - Gets downline user IDs first
   - Filters transactions where `user IN downlineIds`

### Data Isolation Example

```
Platform has:
- Master Agent A with 100 users
- Master Agent B with 50 users

Master Agent A logs in:
✅ Sees their 100 users
❌ Cannot see Master Agent B's 50 users
✅ Sees transactions from their 100 users only
✅ Dashboard shows stats from their hierarchy only
```

---

## Testing Instructions

### Test Master Agent Access

1. **Login as Master Agent**

   ```
   Check dashboard stats match downline count
   ```

2. **Navigate to User Management**

   ```
   Verify user list shows only downline users
   Try searching for a user from different hierarchy (should not appear)
   ```

3. **Navigate to Transaction Management**

   ```
   Verify pending transactions are from downline users only
   Check transaction history is scoped correctly
   ```

4. **Navigate to Agent Management**
   ```
   Verify only sub-agents created by this master agent appear
   Cannot see other master agents' sub-agents
   ```

### Test Agent Access

1. **Login as Agent**

   ```
   Dashboard shows only their downline stats (not master agent's full downline)
   ```

2. **User Management**
   ```
   Sees only users they created or their sub-agents created
   Cannot see sibling agents' users
   ```

---

## Key Principles

1. **Admin = Super Power**: Admin bypasses all permission checks and sees all data
2. **Agents = Downline Only**: Agents can ONLY access data in their hierarchy
3. **Server Authority**: All filtering happens server-side, client just calls correct endpoint
4. **Permission Checks**: Even if UI shows a button, server validates permissions
5. **Consistent Queries**: All controllers use `getDownlineQuery()` for consistency

---

## Files Changed

### Frontend

- ✅ `dashboard/src/pages/Management/UserManagement.jsx`
- ✅ `dashboard/src/pages/Management/TransactionManagement.jsx`
- ✅ `dashboard/src/services/api.js`
- ✅ `dashboard/HIERARCHY_SYSTEM.md` (new documentation)
- ✅ `dashboard/CHANGES_SUMMARY.md` (this file)

### Backend

- No changes needed (already correct)

---

## Next Steps (Optional Improvements)

1. **Add Loading States**: Show skeleton loaders while fetching hierarchy data
2. **Add Hierarchy Breadcrumbs**: Show agent → sub-agent → user path in UI
3. **Add Hierarchy Tree View**: Visual representation of downline structure
4. **Add Commission Calculator**: Show real-time commission breakdown
5. **Add Bulk Actions**: Allow agents to perform bulk operations on downline
6. **Add Export Feature**: Export downline data to CSV/Excel
7. **Add Notifications**: Notify agents when downline users take actions

---

## Support

For issues or questions:

1. Check `HIERARCHY_SYSTEM.md` for detailed documentation
2. Verify API endpoint being called matches user role
3. Check server logs for query being executed
4. Ensure JWT token includes correct role and permissions
5. Test with different role accounts to isolate issue
