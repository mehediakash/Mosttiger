// components/LiveToggle.jsx
export default function LiveToggle({ active }) {
  return (
    <label className="flex items-center gap-2 text-sm text-white">
      <input type="checkbox" defaultChecked={active} className="w-4 h-4" />
      <span>With live streams</span>
    </label>
  );
}
