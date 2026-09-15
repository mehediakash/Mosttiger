# Master Agent Data Access Test Checklist

## Pre-Test Setup

### Create Test Hierarchy

```
Admin Account
    ↓
Master Agent A (test@masteragent.com)
    ↓
    ├─ Agent A1
    │   └─ Player A1-1
    │   └─ Player A1-2
    ↓
    ├─ Agent A2
    │   └─ Player A2-1
    ↓
Master Agent B (test@masteragentb.com)
    ↓
    ├─ Agent B1
    │   └─ Player B1-1
```

---

## Test 1: Master Agent A Login

### ✅ Dashboard Page

- [ ] Total users count = 4 (Agent A1 + Agent A2 + Player A1-1 + Player A1-2 + Player A2-1)
- [ ] Active users shows only downline active users
- [ ] Total sub-agents = 2 (Agent A1 + Agent A2)
- [ ] Revenue stats from downline only
- [ ] Commission stats from downline only
- [ ] Recent activity shows downline transactions only

**Expected**: NO data from Master Agent B's hierarchy

---

### ✅ User Management Page

- [ ] User list shows 5 users (2 agents + 3 players)
- [ ] Search for Master Agent B's player → NO RESULTS
- [ ] Filter by role "agent" → Shows Agent A1 and Agent A2
- [ ] Filter by status "active" → Shows only active downline users
- [ ] Click user details → Shows user created by Agent A1 or Agent A2
- [ ] Total count matches dashboard count

**Expected**: Cannot see any users from Master Agent B's hierarchy

---

### ✅ Transaction Management Page

**Pending Transactions Tab**:

- [ ] Shows only pending transactions from downline users (Player A1-1, A1-2, A2-1)
- [ ] No transactions from Master Agent B's players
- [ ] Can approve/reject downline transactions
- [ ] Transaction user names match downline users

**All Transactions Tab**:

- [ ] History shows only downline transactions
- [ ] Date filter works correctly
- [ ] Status filter works correctly
- [ ] Search by username finds only downline users

**Expected**: Zero transactions from Master Agent B's hierarchy

---

### ✅ Agent Management Page

- [ ] Shows 2 agents (Agent A1, Agent A2)
- [ ] Does NOT show Master Agent B or their agents
- [ ] Click "Create Agent" button → Opens modal
- [ ] Create new sub-agent → Successfully created under Master Agent A
- [ ] New sub-agent appears in list
- [ ] Can view agent stats (commission, users, etc.)

**Expected**: Only sees agents they created, not other master agents' sub-agents

---

### ✅ Commission & Reports

- [ ] Commission report shows earnings from downline only
- [ ] Downline breakdown shows Agent A1 and Agent A2
- [ ] Player contribution from A1-1, A1-2, A2-1 only
- [ ] Total commission matches downline activity

**Expected**: No commission data from Master Agent B's activity

---

## Test 2: Master Agent B Login

### ✅ Dashboard Page

- [ ] Total users = 2 (Agent B1 + Player B1-1)
- [ ] Total sub-agents = 1 (Agent B1)
- [ ] Stats different from Master Agent A's dashboard
- [ ] NO data from Master Agent A's hierarchy

---

### ✅ User Management

- [ ] Shows 2 users (Agent B1 + Player B1-1)
- [ ] Search for Master Agent A's player → NO RESULTS
- [ ] Cannot see any of Master Agent A's users

**Expected**: Complete data isolation from Master Agent A

---

## Test 3: Agent A1 Login

### ✅ Dashboard

- [ ] Shows only their direct users (Player A1-1, Player A1-2)
- [ ] Total users = 2
- [ ] Does NOT show Agent A2's player
- [ ] Does NOT show Master Agent A in stats

---

### ✅ User Management

- [ ] Shows 2 players (A1-1, A1-2)
- [ ] Cannot see Agent A2's players
- [ ] Cannot see Master Agent A
- [ ] Can create new players

---

### ✅ Transaction Management

- [ ] Shows transactions from Player A1-1 and A1-2 only
- [ ] Cannot see Agent A2's player transactions
- [ ] Can approve/reject own downline transactions (if permission granted)

---

## Test 4: Admin Login

### ✅ All Pages

- [ ] Dashboard shows ENTIRE platform stats
- [ ] User Management shows ALL users (Master A, Master B, all agents, all players)
- [ ] Transaction Management shows ALL transactions
- [ ] Agent Management shows ALL agents across hierarchies
- [ ] Reports show platform-wide data

**Expected**: Admin sees EVERYTHING, no restrictions

---

## Test 5: Cross-Hierarchy Access Attempts

### ✅ Direct API Calls (Use Browser DevTools)

**While logged in as Master Agent A, try**:

```javascript
// Attempt to access Master Agent B's user
GET /api/admin/users
// Expected: 403 Forbidden (not admin)

// Attempt to approve Master Agent B's transaction
PUT /api/admin/transactions/deposit/{B1-1-transaction-id}/approve
// Expected: 403 Forbidden (not admin)

// Correct endpoint should work
GET /api/agents/downline
// Expected: 200 OK with only Master Agent A's downline
```

---

## Test 6: Permission Restrictions

### ✅ Master Agent WITHOUT approveDeposits Permission

- [ ] Login as Master Agent A
- [ ] Revoke approveDeposits permission in database
- [ ] Navigate to Transaction Management
- [ ] "Approve" button should be DISABLED or HIDDEN
- [ ] Attempt to approve via API → 403 Forbidden

---

### ✅ Agent WITHOUT createSubAgents Permission

- [ ] Login as Agent A1
- [ ] Check permissions don't include createSubAgents
- [ ] Navigate to Agent Management
- [ ] "Create Agent" button should be HIDDEN
- [ ] Attempt to create via API → 403 Forbidden

---

## Test 7: UI Permission Checks

### ✅ Admin User

- [ ] All menu items visible
- [ ] All action buttons enabled
- [ ] No permission warnings

---

### ✅ Master Agent (with limited permissions)

- [ ] Menu items match granted permissions
- [ ] Disabled features show permission message
- [ ] Cannot access restricted routes

---

### ✅ Agent (with minimal permissions)

- [ ] Very limited menu
- [ ] Can only view own data
- [ ] Most action buttons hidden

---

## Test 8: Performance & Data Accuracy

### ✅ Large Hierarchy

Create hierarchy:

```
Master Agent A
    ├─ 10 Agents
    │   └─ 100 Players each = 1000 players total
```

- [ ] Dashboard loads within 3 seconds
- [ ] User count = 1010 (10 agents + 1000 players)
- [ ] Pagination works correctly in User Management
- [ ] Search is responsive
- [ ] Stats calculations are accurate

---

## Test 9: Edge Cases

### ✅ Orphaned Users

- [ ] User with no hierarchy set → Not visible to any agent
- [ ] User with incomplete hierarchy → Visible to partial chain
- [ ] Deleted agent's users → Still visible to master agent

---

### ✅ Role Changes

- [ ] Master Agent demoted to Agent → Sees less data
- [ ] Agent promoted to Master Agent → Sees more data
- [ ] Permission updates reflect immediately after re-login

---

### ✅ Multiple Sessions

- [ ] Master Agent A logged in on 2 browsers
- [ ] Both sessions see same data
- [ ] Updates in one browser reflect in other (after refresh)

---

## Expected Results Summary

| Role               | Sees                            | Cannot See                                  |
| ------------------ | ------------------------------- | ------------------------------------------- |
| **Admin**          | Everything                      | Nothing (full access)                       |
| **Master Agent A** | Own downline (agents + players) | Master Agent B's hierarchy, platform totals |
| **Agent A1**       | Own players (A1-1, A1-2)        | Agent A2's players, Master Agent stats      |
| **Player A1-1**    | Own data only                   | Any other user data                         |

---

## Failure Scenarios (Should NOT Happen)

❌ Master Agent A sees Master Agent B's users
❌ Agent A1 sees Agent A2's players  
❌ Agent can access admin endpoints
❌ User can see another user's data
❌ Deleted agent's hierarchy leaks to other agents
❌ Permission bypass via API manipulation

---

## API Response Validation

### ✅ Master Agent A calls `/api/agents/downline`

**Response should include**:

```json
{
  "success": true,
  "data": {
    "users": [
      { "_id": "agent-a1-id", "fullName": "Agent A1", "role": "agent" },
      { "_id": "agent-a2-id", "fullName": "Agent A2", "role": "agent" },
      { "_id": "player-a1-1-id", "fullName": "Player A1-1", "role": "user" },
      { "_id": "player-a1-2-id", "fullName": "Player A1-2", "role": "user" },
      { "_id": "player-a2-1-id", "fullName": "Player A2-1", "role": "user" }
    ],
    "total": 5
  }
}
```

**Should NOT include**:

- Master Agent B
- Agent B1
- Player B1-1

---

## Browser Console Checks

### ✅ No Console Errors

- [ ] No 403 Forbidden errors for allowed actions
- [ ] No undefined/null user errors
- [ ] No permission check failures
- [ ] Redux state has correct user object

---

### ✅ Network Tab

- [ ] API calls go to correct endpoints
- [ ] JWT token included in headers
- [ ] Response data matches expected structure
- [ ] No unnecessary duplicate requests

---

## Database Validation

### ✅ Check User Documents

```javascript
// Master Agent A's downline users should have:
{
  hierarchy: {
    masterAgent: ObjectId("master-agent-a-id"),
    agent: ObjectId("agent-a1-id"), // or agent-a2-id
    subAgent: null // or sub-agent-id if applicable
  }
}

// Master Agent B's users should have:
{
  hierarchy: {
    masterAgent: ObjectId("master-agent-b-id"),
    agent: ObjectId("agent-b1-id"),
    subAgent: null
  }
}
```

---

## Final Checklist

- [ ] All test cases passed
- [ ] No data leakage between hierarchies
- [ ] Admin has full access
- [ ] Agents see only downline
- [ ] Permissions enforced correctly
- [ ] UI reflects permission state
- [ ] API responses are correct
- [ ] Performance is acceptable
- [ ] No console errors
- [ ] Documentation is clear

---

## Sign-Off

**Tested By**: ******\_\_\_******  
**Date**: ******\_\_\_******  
**Result**: ☐ PASS ☐ FAIL  
**Notes**: **********************\_\_\_**********************
