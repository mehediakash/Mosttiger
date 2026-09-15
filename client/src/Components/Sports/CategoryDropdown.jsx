// components/CategoryDropdown.jsx
export default function CategoryDropdown({ options = [] }) {
  return (
    <div className="relative inline-block">
      <button className="bg-white/10 text-white px-3 py-2 rounded-md text-sm">
        Categories ▼
      </button>

      <div className="absolute mt-2 bg-[#183d5d] text-white rounded-md shadow-lg w-48 z-50">
        {options.map(opt => (
          <div key={opt} className="px-3 py-2 hover:bg-white/10 cursor-pointer">
            {opt}
          </div>
        ))}
      </div>
    </div>
  );
}
