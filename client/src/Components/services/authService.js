import api from '../api/axios';


export const launchGame = (gameId, body) => api.post(`/api/games/launch/${gameId}`, body);


// You can add higher-level functions if needed


// FILE: src/components/ui/Button.jsx
export default function Button({ children, className = '', ...props }) {
return (
<button
{...props}
className={`px-4 py-2 rounded-2xl font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 ${className}`}
>
{children}
</button>
);
}