export default function Card({ children, className = "" }) {
  return (
    <div
      className={`rounded-xl border border-stone-200 bg-white p-6 shadow-sm ${className}`.trim()}
    >
      {children}
    </div>
  );
}
