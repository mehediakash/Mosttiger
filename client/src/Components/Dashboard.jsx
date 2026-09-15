// components/Dashboard.jsx
import React from 'react';

const Dashboard = ({ children }) => {
  return (
    <div className="dashboard bg-gray-50 rounded-b-lg">
      <ul className="dashboard__champs">
        {children}
      </ul>
    </div>
  );
};

export default Dashboard;