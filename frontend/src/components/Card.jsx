export default function Card({ children, className = "", ...props }) {
  return (
    <div 
      className={`bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-3xl p-6 shadow-sm ${className}`} 
      {...props}
    >
      {children}
    </div>
  );
}
