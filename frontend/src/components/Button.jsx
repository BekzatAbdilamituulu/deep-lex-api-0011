export default function Button({ 
  children, 
  variant = "default", 
  size = "md", 
  className = "", 
  ...props 
}) {
  const base = "inline-flex items-center justify-center font-semibold rounded-2xl transition-all active:scale-[0.985] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed";

  const variants = {
    default: "bg-zinc-900 hover:bg-black text-white focus-visible:ring-zinc-900",
    primary: "bg-blue-600 hover:bg-blue-700 text-white focus-visible:ring-blue-600",
    secondary: "border border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-900",
    outline: "border border-zinc-300 hover:bg-zinc-50",
  };

  const sizes = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3",
    lg: "px-8 py-4 text-lg",
  };

  return (
    <button 
      className={`${base} ${variants[variant] || variants.default} ${sizes[size] || sizes.md} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
