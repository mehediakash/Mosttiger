export default function Button({ children, onClick, type = "button", className = "", disabled = false }) {
return (
<button
type={type}
onClick={onClick}
disabled={disabled}
className={`px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
>
{children}
</button>
);
}