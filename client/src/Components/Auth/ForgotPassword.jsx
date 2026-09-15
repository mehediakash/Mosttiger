import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { forgotPassword } from '../store/authSlice';
import Button from '../ui/Button';


export default function ForgotPassword() {
const dispatch = useDispatch();
const { status, error } = useSelector((s) => s.auth);
const [email, setEmail] = useState('');
const onSubmit = async (e) => {
e.preventDefault();
try {
await dispatch(forgotPassword({ email })).unwrap();
alert('Check your email for OTP');
} catch (err) { console.error(err); }
};


return (
<div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#071033] to-[#031026] p-6">
<div className="w-full max-w-md bg-white/5 rounded-3xl p-6">
<h3 className="text-white font-bold text-xl">Forgot password</h3>
<p className="text-gray-300 text-sm">Enter the email to receive OTP</p>
<form onSubmit={onSubmit} className="mt-4">
<input value={email} onChange={(e) => setEmail(e.target.value)} required type="email" placeholder="you@mail.com" className="w-full p-3 rounded-xl bg-white/5 text-white" />
<Button className="mt-4 w-full bg-indigo-600" type="submit">{status === 'loading' ? 'Sending...' : 'Send OTP'}</Button>
{error && <div className="text-sm text-red-400 mt-2">{JSON.stringify(error)}</div>}
</form>
</div>
</div>
);
}