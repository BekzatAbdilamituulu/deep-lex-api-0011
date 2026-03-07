export default function Button({
  children,
  variant = "primary",
  type = "button",
  className = "",
  ...props
}) {
  const base =
    "inline-flex min-h-11 items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60";

  const variants = {
    primary: "bg-black text-white hover:bg-neutral-800",
    secondary: "border border-gray-300 bg-white text-black hover:bg-gray-50",
    danger: "bg-red-600 text-white hover:bg-red-700",
  };

  return (
    <button
      type={type}
      className={`${base} ${variants[variant] || variants.primary} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}
