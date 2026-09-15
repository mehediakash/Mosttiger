const User = require("../models/User");
const AgentSettings = require("../models/AgentSettings");

// Recursively build complete hierarchy
async function buildCompleteHierarchy(userId, includeUsers = true) {
  try {
    const allAgents = [];
    const allUsers = [];
    const visited = new Set();

    // Recursive function to fetch all descendants
    const fetchDescendants = async (parentId) => {
      if (visited.has(parentId.toString())) return;
      visited.add(parentId.toString());

      // Find all entities referred by this parent
      const query = { referredBy: parentId };

      if (includeUsers) {
        // Get all types including users
        const children = await User.find(query)
          .select(
            "fullName email phone role referenceCode wallet createdAt lastLogin isActive referredBy",
          )
          .lean();

        for (const child of children) {
          if (child.role === "user") {
            allUsers.push(child);
          } else {
            // It's an agent
            const settings = await AgentSettings.findOne({
              agent: child._id,
            }).lean();
            child.settings = settings;
            allAgents.push(child);

            // Recursively fetch this agent's descendants
            await fetchDescendants(child._id);
          }
        }
      } else {
        // Only get agents (not regular users)
        query.role = { $in: ["master_agent", "agent", "sub_agent"] };

        const agents = await User.find(query)
          .select(
            "fullName email phone role referenceCode wallet createdAt lastLogin isActive referredBy",
          )
          .lean();

        for (const agent of agents) {
          const settings = await AgentSettings.findOne({
            agent: agent._id,
          }).lean();
          agent.settings = settings;
          allAgents.push(agent);

          // Recursively fetch this agent's descendants
          await fetchDescendants(agent._id);
        }
      }
    };

    // Start recursive fetch from the given user
    await fetchDescendants(userId);

    return {
      agents: allAgents,
      users: allUsers,
      total: {
        agents: allAgents.length,
        users: allUsers.length,
      },
    };
  } catch (error) {
    console.error("Build hierarchy error:", error);
    throw error;
  }
}

// Get complete downline hierarchy recursively
exports.getCompleteHierarchy = async (req, res) => {
  try {
    const userId = req.user.id;
    const { includeUsers = true } = req.query;

    const hierarchy = await buildCompleteHierarchy(
      userId,
      includeUsers === "true" || includeUsers === true,
    );

    res.status(200).json({
      success: true,
      data: hierarchy,
    });
  } catch (error) {
    console.error("Get complete hierarchy error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching hierarchy",
    });
  }
};
