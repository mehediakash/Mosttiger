import React from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";

export default function HeaderTop() {
  const { user } = useSelector((state) => state.auth);

  return (
    <header className="bg-[#1a2c38] text-white py-3 px-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <div className="w-10 h-10 bg-primary from-orange-500 to-pink-500 rounded-lg flex items-center justify-center font-bold text-xl">
            G
          </div>
          <span className="text-xl font-bold">Gaming Sports</span>
        </Link>

        {/* Center Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          <Link to="/sports" className="hover:text-orange-400 transition">
            Sports
          </Link>
          <Link
            to="/live"
            className="hover:text-orange-400 transition flex items-center gap-1"
          >
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
            Live
          </Link>
          <Link to="/upcoming" className="hover:text-orange-400 transition">
            Upcoming
          </Link>
          <Link to="/results" className="hover:text-orange-400 transition">
            Results
          </Link>
        </nav>

        {/* Right Side */}
        <div className="flex items-center gap-4">
          {user ? (
            <>
              <div className="hidden md:flex items-center gap-2 bg-white/10 px-4 py-2 rounded-lg">
                <span className="text-sm text-gray-300">Balance:</span>
                <span className="font-bold text-orange-400">৳0.00</span>
              </div>
              <Link to="/profile" className="hover:text-orange-400 transition">
                {user.fullName || user.email}
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="px-4 py-2 hover:bg-white/10 rounded-lg transition"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 bg-gradient-to-r from-orange-500 to-pink-500 rounded-lg font-semibold hover:opacity-90 transition"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
