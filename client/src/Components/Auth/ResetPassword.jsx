import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { resetPassword } from '../store/authSlice';
import Button from '../ui/Button';


export default function ResetPassword() {
const dispatch = useDispatch();
const { status, error } = useSelector((s) => s.auth);
const [form, setForm] = useState({ userId: '', otp: '', newPassword: '', confirmPassword: '' });


const onSubmit = async (e) => {
e.preventDefault();
if (form.newPassword !== form.confirmPassword) return alert('Passwords do not match');
try {
await dispatch(resetPassword(form)).unwrap();
alert('Password reset successful');
} catch (err) { console.error(err); }
};


return (
<div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#00121f] to-[#000814] p-6">
<div className="w-full max-w-md bg-white/5 rounded-3xl p-6">
<h3 className="text-white font-bold text-xl">Reset password</h3>
<form onSubmit={onSubmit} className="mt-4 space-y-3">
<input name="userId" value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })} placeholder="User ID (from email)" className="w-full p-3 rounded-xl bg-white/5 text-white" />
<input name="otp" value={form.otp} onChange={(e) => setForm({ ...form, otp: e.target.value })} placeholder="OTP" className="w-full p-3 rounded-xl bg-white/5 text-white" />
<input name="newPassword" value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} type="password" placeholder="New password" className="w-full p-3 rounded-xl bg-white/5 text-white" />
<input name="confirmPassword" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} type="password" placeholder="Confirm password" className="w-full p-3 rounded-xl bg-white/5 text-white" />


<Button type="submit" className="w-full bg-gradient-to-r from-[#ff6a00] to-[#ff2a68]">{status === 'loading' ? 'Resetting...' : 'Reset password'}</Button>
{error && <div className="text-sm text-red-400">{JSON.stringify(error)}</div>}
</form>
</div>
</div>
);
}