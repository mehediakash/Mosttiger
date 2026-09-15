// components/OddsChangeIndicator.jsx
export default function OddsChangeIndicator({ children, up, down }) {
  return (
    <div
      className={`
        px-2 py-1 rounded-md 
        ${up ? "bg-green-600" : ""}
        ${down ? "bg-red-600" : ""}
      `}
    >
      {children}
    </div>
  );
}
