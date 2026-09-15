import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { verifyOtp, clearTempUserId } from '../store/authSlice';
import Button from '../ui/Button';

export default function VerifyOtp() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { state } = useLocation();

  const [userId, setUserId] = useState(state?.userId || '');
  const [otp, setOtp] = useState('');
  const [purpose, setPurpose] = useState(state?.purpose || 'signup');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!userId || !otp) return setError('User ID and OTP are required');
    setLoading(true);
    setError(null);
    try {
      const payload = { userId, otp, purpose };
      const res = await dispatch(verifyOtp(payload)).unwrap();
      // Clear temporary user id from redux and localStorage
      try { dispatch(clearTempUserId()); } catch (e) {}
      try { localStorage.removeItem('betting_app_temp_user_v1'); } catch (e) {}
      // Server returns { success: true, message: 'OTP verified successfully' }
      // Redirect to login on success.
      navigate('/login');
    } catch (err) {
      setError(err?.message || JSON.stringify(err) || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#021024] to-[#00121f] p-6">
      <div className="w-full max-w-md bg-white/5 backdrop-blur-md rounded-3xl p-6 shadow-xl border border-white/5">
        <h2 className="text-2xl font-extrabold text-white mb-4">Verify OTP</h2>
        <p className="text-sm text-gray-300 mb-4">Enter the OTP sent to your email to complete verification.</p>

        <form onSubmit={onSubmit} className="space-y-4">
          {/* <div>
            <label className="block text-sm text-white/80 mb-2">User ID</label>
            <input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="User ID (from registration response)" className="w-full p-3 rounded-xl bg-white/5 text-white" />
          </div> */}

          <div>
            <label className="block text-sm text-white/80 mb-2">OTP</label>
            <input value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="123456" className="w-full p-3 rounded-xl bg-white/5 text-white" />
          </div>

          {/* <div>
            <label className="block text-sm text-white/80 mb-2">Purpose</label>
            <select value={purpose} onChange={(e) => setPurpose("signup")} className="w-full p-3 rounded-xl bg-white/5 text-white">
              <option value="signup">Signup</option>
              <option value="email_verification">Email verification</option>
              <option value="reset">Password reset</option>
            </select>
          </div> */}

          {error && <div className="text-sm text-red-400">{String(error)}</div>}

          <div className="flex gap-3">
            <Button type="submit" className="flex-1 bg-gradient-to-r from-[#00a86b] to-[#00d4ff]" disabled={loading}>{loading ? 'Verifying...' : 'Verify OTP'}</Button>
            <Link to="/login" className="px-4 py-3 bg-white/10 rounded-xl text-white">Login</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
