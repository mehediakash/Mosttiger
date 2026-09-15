import React, { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import turnoverService from "../services/turnoverService";

const TurnoverDashboard = () => {
  const [stats, setStats] = useState({
    totalTurnover: 0,
    todayTurnover: 0,
    weeklyTurnover: 0,
    monthlyTurnover: 0,
  });

  const [topUsers, setTopUsers] = useState([]);
  const [topAgents, setTopAgents] = useState([]);
  const [filterType, setFilterType] = useState("today");
  const [loading, setLoading] = useState(true);
  const [filteredData, setFilteredData] = useState({});

  useEffect(() => {
    fetchDashboardData();
  }, [filterType]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch platform stats using service - safely handles no agent hierarchy
      const statsData = await turnoverService.getPlatformStats();
      setStats(
        statsData ?? {
          totalTurnover: 0,
          todayTurnover: 0,
          weeklyTurnover: 0,
          monthlyTurnover: 0,
        },
      );

      // Fetch top users using service - safely handles empty results
      const usersData = await turnoverService.getTopUsersByTurnover(10);
      setTopUsers(usersData?.topUsers ?? []);

      // Fetch top agents using service - safely handles users without agents
      const agentsData = await turnoverService.getTopAgentsByTeamTurnover(10);
      setTopAgents(agentsData?.topAgents ?? []);

      // Fetch filtered data using service with current filterType
      const filteredDataResult = await turnoverService.getFilteredData(
        filterType,
        null,
        null,
        1,
        100,
      );
      setFilteredData(filteredDataResult ?? { data: [], stats: {} });
    } catch (error) {
      console.error("Error fetching turnover data:", error);
      // Set default values on error
      setStats({
        totalTurnover: 0,
        todayTurnover: 0,
        weeklyTurnover: 0,
        monthlyTurnover: 0,
      });
      setTopUsers([]);
      setTopAgents([]);
      setFilteredData({ data: [] });
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = async (newFilterType) => {
    setFilterType(newFilterType);
    try {
      const filteredDataResult = await turnoverService.getFilteredData(
        newFilterType,
        null,
        null,
        1,
        100,
      );
      setFilteredData(filteredDataResult || { data: [] });
    } catch (error) {
      console.error("Error fetching filtered data:", error);
      setFilteredData({ data: [] });
    }
  };

  const formatCurrency = (value) => {
    return (
      "৳" +
      (value || 0).toLocaleString("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })
    );
  };

  const COLORS = [
    "var(--color-primary)",
    "#1E40AF",
    "#10B981",
    "#F59E0B",
    "#8B5CF6",
    "#EC4899",
  ];

  const StatCard = ({ title, value, icon, color }) => (
    <div
      className={`bg-primary ${color} rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow border border-opacity-20 border-white`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-100 text-sm font-medium mb-2">{title}</p>
          <p className="text-3xl font-bold">{formatCurrency(value)}</p>
        </div>
        <div className="text-5xl opacity-20">{icon}</div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="mt-4 text-gray-400">Loading Turnover Data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 text-white min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-orange-400 bg-clip-text text-transparent">
            Turnover Analytics
          </h1>
          <p className="text-gray-400">
            Track total betting amounts across your platform
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Platform Turnover"
            value={stats.totalTurnover}
            icon="💰"
            color="from-blue-600 to-blue-800"
          />
          <StatCard
            title="Today's Turnover"
            value={stats.todayTurnover}
            icon="📊"
            color="from-green-600 to-green-800"
          />
          <StatCard
            title="Weekly Turnover"
            value={stats.weeklyTurnover}
            icon="📈"
            color="from-purple-600 to-purple-800"
          />
          <StatCard
            title="Monthly Turnover"
            value={stats.monthlyTurnover}
            icon="📅"
            color="from-orange-600 to-orange-800"
          />
        </div>

        {/* Filter Buttons */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8 border border-gray-700">
          <h2 className="text-xl font-bold mb-4 flex items-center">
            <span className="w-1 h-6 primary mr-3 rounded"></span>
            Filter Turnover Data
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {["today", "yesterday", "last7days", "last30days"].map((filter) => (
              <button
                key={filter}
                onClick={() => handleFilterChange(filter)}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  filterType === filter
                    ? "primary text-black"
                    : "bg-gray-700 hover:bg-gray-600 text-white"
                }`}
              >
                {filter === "today"
                  ? "Today"
                  : filter === "yesterday"
                    ? "Yesterday"
                    : filter === "last7days"
                      ? "Last 7 Days"
                      : "Last 30 Days"}
              </button>
            ))}
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Top Users Chart */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-bold mb-6 flex items-center">
              <span className="w-1 h-6 bg-green-500 mr-3 rounded"></span>
              Top Users by Turnover
            </h2>
            {topUsers.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topUsers.slice(0, 5)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="userName" stroke="#999" />
                  <YAxis stroke="#999" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1F2937",
                      border: "1px solid #444",
                      borderRadius: "8px",
                    }}
                    formatter={(value) => formatCurrency(value)}
                  />
                  <Bar
                    dataKey="totalTurnover"
                    fill="var(--color-primary)"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-400 text-center py-8">
                No data available
              </p>
            )}
          </div>

          {/* Top Agents Chart */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-bold mb-6 flex items-center">
              <span className="w-1 h-6 bg-blue-500 mr-3 rounded"></span>
              Top Agents by Team Turnover
            </h2>
            {topAgents.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topAgents.slice(0, 5)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="agentName" stroke="#999" />
                  <YAxis stroke="#999" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1F2937",
                      border: "1px solid #444",
                      borderRadius: "8px",
                    }}
                    formatter={(value) => formatCurrency(value)}
                  />
                  <Bar
                    dataKey="totalTeamTurnover"
                    fill="#1E40AF"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-400 text-center py-8">
                No data available
              </p>
            )}
          </div>
        </div>

        {/* Top Users Table */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-8">
          <h2 className="text-xl font-bold mb-6 flex items-center">
            <span className="w-1 h-6 primary mr-3 rounded"></span>
            Top 10 Active Users
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-4 px-4 font-semibold text-primary">
                    User Email
                  </th>
                  <th className="text-left py-4 px-4 font-semibold text-primary">
                    Total Turnover
                  </th>
                  <th className="text-left py-4 px-4 font-semibold text-primary">
                    Bet Count
                  </th>
                  <th className="text-left py-4 px-4 font-semibold text-primary">
                    Last Bet
                  </th>
                </tr>
              </thead>
              <tbody>
                {topUsers.slice(0, 10).map((user, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-gray-700 hover:bg-gray-700/50 transition"
                  >
                    <td className="py-4 px-4">{user.userEmail || "N/A"}</td>
                    {console.log(user)}
                    <td className="py-4 px-4 font-bold text-green-400">
                      {formatCurrency(user.totalTurnover)}
                    </td>
                    <td className="py-4 px-4">{user.betCount}</td>
                    <td className="py-4 px-4 text-sm text-gray-400">
                      {new Date(user.lastBetDate).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Agents Table */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-xl font-bold mb-6 flex items-center">
            <span className="w-1 h-6 bg-blue-500 mr-3 rounded"></span>
            Top 10 Agents by Team Turnover
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-4 px-4 font-semibold text-primary">
                    Agent Name
                  </th>
                  <th className="text-left py-4 px-4 font-semibold text-primary">
                    Team Turnover
                  </th>
                  <th className="text-left py-4 px-4 font-semibold text-primary">
                    Bet Count
                  </th>
                  <th className="text-left py-4 px-4 font-semibold text-primary">
                    Active Users
                  </th>
                  <th className="text-left py-4 px-4 font-semibold text-primary">
                    Last Bet
                  </th>
                </tr>
              </thead>
              <tbody>
                {topAgents.slice(0, 10).map((agent, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-gray-700 hover:bg-gray-700/50 transition"
                  >
                    <td className="py-4 px-4">{agent.agentName || "N/A"}</td>
                    <td className="py-4 px-4 font-bold text-blue-400">
                      {formatCurrency(agent.totalTeamTurnover)}
                    </td>
                    <td className="py-4 px-4">{agent.betCount}</td>
                    <td className="py-4 px-4">{agent.uniqueUserCount}</td>
                    <td className="py-4 px-4 text-sm text-gray-400">
                      {new Date(agent.lastBetDate).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Filtered Data Summary */}
        {filteredData.stats && (
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mt-8">
            <h2 className="text-xl font-bold mb-6 flex items-center">
              <span className="w-1 h-6 bg-purple-500 mr-3 rounded"></span>
              {filterType === "today"
                ? "Today's"
                : filterType === "yesterday"
                  ? "Yesterday's"
                  : filterType === "last7days"
                    ? "Last 7 Days"
                    : "Last 30 Days"}{" "}
              Summary
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-900 rounded-lg p-4">
                <p className="text-gray-400 text-sm mb-2">Total Turnover</p>
                <p className="text-2xl font-bold text-primary">
                  {formatCurrency(filteredData.stats.totalTurnover)}
                </p>
              </div>
              <div className="bg-gray-900 rounded-lg p-4">
                <p className="text-gray-400 text-sm mb-2">Total Bets</p>
                <p className="text-2xl font-bold text-green-400">
                  {(filteredData.stats.totalBets || 0).toLocaleString()}
                </p>
              </div>
              <div className="bg-gray-900 rounded-lg p-4">
                <p className="text-gray-400 text-sm mb-2">Average Bet Amount</p>
                <p className="text-2xl font-bold text-blue-400">
                  {formatCurrency(filteredData.stats.avgBetAmount)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TurnoverDashboard;
