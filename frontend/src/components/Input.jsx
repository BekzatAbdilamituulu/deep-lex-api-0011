export default function Input({ className = "", ...props }) {
  return (
    <input
      className={[
        "w-full min-h-11 rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-black outline-none",
        "placeholder:text-zinc-400 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900",
        className,
      ].join(" ")}
      {...props}
    />
  );
}
