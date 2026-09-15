// components/MarketButton.jsx
export default function MarketButton({ value, disabled }) {
  return (
    <button
      disabled={disabled}
      className={`px-3 py-2 rounded text-sm min-w-[60px] ${
        disabled
          ? "bg-gray-300 text-gray-500"
          : "bg-white text-black hover:bg-yellow-300"
      }`}
    >
      {value}
    </button>
  );
}
