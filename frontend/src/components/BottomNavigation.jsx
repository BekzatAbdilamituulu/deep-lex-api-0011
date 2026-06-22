import { NavLink } from "react-router-dom";

export default function BottomNavigation({ items = [], className = "" }) {
  return (
    <nav
      className={[
        "fixed inset-x-0 bottom-0 z-50 border-t bg-white/95 pb-safe backdrop-blur md:hidden",
        className,
      ].join(" ")}
    >
      <div className="mx-auto grid max-w-md grid-cols-5 gap-1 px-2 pb-2 pt-1.5">
        {items.map((item, index) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={index}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-1.5 text-[10px] font-medium transition-all ${
                  isActive
                    ? "text-zinc-900"
                    : "text-zinc-500 hover:text-zinc-700"
                }`
              }
            >
              {Icon && <Icon className="h-5 w-5" />}
              <span className="leading-none">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
