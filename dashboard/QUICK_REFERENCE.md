# Quick Reference Guide - Hierarchy System

## TL;DR

**Admin** = Sees everything  
**Master Agent** = Sees only their downline (agents + players they created)  
**Agent** = Sees only players they created  
**Player** = Sees only their own data

---

## API Endpoints Quick Reference

### For Admin (All Data)

```javascript
GET / api / admin / users; // All users
GET / api / admin / dashboard; // All stats
GET / api / admin / transactions / pending; // All transactions
POST / api / admin / agents; // Create any agent
```

### For Agents (Downline Only)

```javascript
GET / api / agents / downline; // Own downline users
GET / api / agent - dashboard / overview; // Own downline stats
GET / api / agent - transactions / pending; // Own downline transactions
GET / api / agent - management / sub - agents; // Own sub-agents
POST / api / agent - management / sub - agents; // Create sub-agent
```

---

## Frontend Usage Patterns

### Check User Role

```javascript
const { isAdmin, role, can } = usePermissions();
```

### Load Data Based on Role

```javascript
// ✅ CORRECT
const loadUsers = async () => {
  const response = isAdmin
    ? await userAPI.getUsers(params)
    : await userAPI.getDownlineUsers(params);
};

// ❌ WRONG - Everyone uses admin endpoint
const loadUsers = async () => {
  const response = await userAPI.getUsers(params);
};
```

### Check Permissions

```javascript
// ✅ CORRECT - Use hook
const { can } = usePermissions();
if (can.viewUsers) {
  /* show users */
}

// ❌ WRONG - Direct check
if (hasPermission(user, PERMISSIONS.VIEW_USERS)) {
  /* show users */
}
```

---

## Server Query Patterns

### Get Downline Users

```javascript
const query = {
  $or: [
    { "hierarchy.masterAgent": agentId },
    { "hierarchy.agent": agentId },
    { "hierarchy.subAgent": agentId },
  ],
};
const users = await User.find(query);
```

### Get Downline Transactions

```javascript
// Step 1: Get downline user IDs
const downlineUsers = await User.find(downlineQuery).select("_id");
const downlineIds = downlineUsers.map((user) => user._id);

// Step 2: Filter transactions
const transactions = await Transaction.find({
  user: { $in: downlineIds },
  status: "pending",
});
```

---

## Permission Check Pattern

### Frontend (UI Control)

```javascript
{
  can.createUsers && <Button onClick={handleCreate}>Create User</Button>;
}
```

### Backend (Security)

```javascript
const agentSettings = await AgentSettings.findOne({ agent: req.user.id });
if (!agentSettings.permissions.createUsers) {
  return res.status(403).json({ message: "Permission denied" });
}
```

---

## Common Mistakes

### ❌ Mistake 1: Using Admin Endpoint for Agents

```javascript
// Wrong
const response = await userAPI.getUsers();

// Correct
const response = isAdmin
  ? await userAPI.getUsers()
  : await userAPI.getDownlineUsers();
```

### ❌ Mistake 2: Client-Side Only Permission Check

```javascript
// Wrong - Can be bypassed
if (can.editUser) {
  await userAPI.updateUser(userId, data);
}

// Correct - Server validates too
// Frontend check + Backend validation
if (can.editUser) {
  await userAPI.updateUser(userId, data); // Server checks permission
}
```

### ❌ Mistake 3: Forgetting Hierarchy Filter

```javascript
// Wrong - Gets all users
const users = await User.find({ status: "active" });

// Correct - Gets downline only
const query = {
  ...getDownlineQuery(agentId, role),
  status: "active",
};
const users = await User.find(query);
```

---

## Testing Quick Commands

### Test as Master Agent

```bash
# Login
POST /api/auth/login
{ email: "master@test.com", password: "password" }

# Check dashboard (should show downline only)
GET /api/agent-dashboard/overview

# Check users (should be filtered)
GET /api/agents/downline
```

### Test as Agent

```bash
# Login
POST /api/auth/login
{ email: "agent@test.com", password: "password" }

# Check users (should show only own players)
GET /api/agents/downline
```

---

## File Locations

**Frontend**:

- Permissions Hook: `dashboard/src/hooks/usePermissions.js`
- API Service: `dashboard/src/services/api.js`
- User Management: `dashboard/src/pages/Management/UserManagement.jsx`
- Agent Management: `dashboard/src/pages/Management/AgentManagement.jsx`
- Transaction Management: `dashboard/src/pages/Management/TransactionManagement.jsx`

**Backend**:

- User Model: `server/models/User.js`
- Agent Settings: `server/models/AgentSettings.js`
- Agent Dashboard: `server/controllers/agentDashboardController.js`
- Agent Management: `server/controllers/agentManagementController.js`
- Transaction Approval: `server/controllers/transactionApprovalController.js`

---

## Hierarchy Structure in Database

```javascript
// User Document
{
  _id: ObjectId("..."),
  fullName: "John Doe",
  email: "john@example.com",
  role: "user",
  hierarchy: {
    masterAgent: ObjectId("master-agent-id"),
    agent: ObjectId("agent-id"),
    subAgent: ObjectId("sub-agent-id") // or null
  }
}

// AgentSettings Document
{
  _id: ObjectId("..."),
  agent: ObjectId("agent-id"),
  permissions: {
    viewUsers: true,
    createUsers: true,
    editUsers: false,
    blockUsers: false,
    approveDeposits: true,
    approveWithdrawals: false,
    adjustUserBalance: false,
    managePromoCodes: false,
    createSubAgents: true,
    manageSubAgents: true,
    viewCommissions: true,
    requestWithdrawal: true,
    viewReports: true,
    manageCMS: false,
    viewFinancialReports: true
  },
  commission: {
    lossRate: 5,      // 5% of player losses
    turnoverRate: 0.5, // 0.5% of turnover
    profitShare: 10    // 10% of downline profits
  }
}
```

---

## Hierarchy Flow Example

```
Admin creates Master Agent A
    ↓
Master Agent A creates Agent X
    ↓ (Agent X's users have hierarchy.masterAgent = A, hierarchy.agent = X)
Agent X creates Player 1
    ↓
Player 1 bets $100 and loses
    ↓
Agent X earns: $100 * 0.5% = $0.50 (turnover) + $100 * 5% = $5 (loss) = $5.50
Master Agent A earns: $5.50 * 10% = $0.55 (profit share)
```

---

## Security Checklist

✅ All sensitive endpoints require `protect` middleware (JWT verification)
✅ Agent endpoints require `authorize('master_agent', 'agent', 'sub_agent')`
✅ Admin endpoints require `authorize('admin', 'super_admin')`
✅ Queries always include hierarchy filter for agents
✅ Permissions checked both frontend and backend
✅ User hierarchy validated before operations
✅ Commission calculations respect hierarchy

---

## When to Update This System

**Add New Management Page**:

1. Create separate admin and agent endpoints
2. Use `isAdmin` to call correct endpoint
3. Import and use `usePermissions` hook
4. Add permission checks for actions

**Add New Permission**:

1. Add to `PERMISSIONS` in `rolePermissions.js`
2. Add to `AgentSettings.permissions` schema
3. Add to `usePermissions` hook's `can` object
4. Add checkbox to `CreateAgentModal`
5. Validate in backend controller

**Add New Role**:

1. Add to `ROLES` constant
2. Update `getDownlineQuery` logic
3. Update `authorize` middleware
4. Add to dashboard router
5. Create dashboard component if needed

---

## Support Resources

1. **Full Documentation**: `HIERARCHY_SYSTEM.md`
2. **Changes Made**: `CHANGES_SUMMARY.md`
3. **Test Checklist**: `TEST_CHECKLIST.md`
4. **This Guide**: `QUICK_REFERENCE.md`

---

## Emergency Fixes

### Master Agent Sees All Users (Wrong!)

👉 Check they're calling `/api/agents/downline` not `/api/admin/users`

### Permission Button Not Showing

👉 Check `can.*` property name matches permission key

### Server Returns Wrong Data

👉 Verify controller uses `getDownlineQuery()` method

### Admin Can't Access Feature

👉 Check if `isAdmin` bypass is in permission function
