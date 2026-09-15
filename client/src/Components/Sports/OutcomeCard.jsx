// components/OutcomeCard.jsx
export default function OutcomeCard({ label, odd }) {
  return (
    <div className="border border-white/20 rounded-md p-2 text-center text-white">
      <p className="text-xs opacity-70">{label}</p>
      <p className="text-sm font-semibold">{odd}</p>
    </div>
  );
}
