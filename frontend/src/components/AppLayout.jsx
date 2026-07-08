import { Outlet, NavLink, Link } from "react-router-dom";
import { 
  Home, BookOpen, Library, BarChart3, User, PlayCircle 
} from "lucide-react";
import PairSwitcher from "./PairSwitcher";
import BottomNavigation from "./BottomNavigation";

const navItems = [
  { to: "/app", end: true, icon: Home, label: "Dashboard" },
  { to: "/app/decks", icon: BookOpen, label: "Decks" },
  { to: "/app/study", icon: PlayCircle, label: "Study" },
  { to: "/app/library", icon: Library, label: "Library" },
  { to: "/app/progress", icon: BarChart3, label: "Progress" },
];

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      {/* Top header */}
      <header className="sticky top-0 z-40 border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 md:px-8">
          <div className="flex items-center gap-4">
            <Link to="/app" className="flex items-center gap-2 text-2xl font-semibold tracking-tighter">
              Cortex
            </Link>
            <div className="hidden md:block">
              <PairSwitcher compact />
            </div>
          </div>

          {/* Desktop user avatar */}
          <div className="hidden items-center gap-3 md:flex">
            <Link 
              to="/app/profile" 
              className="flex items-center gap-2 rounded-full border bg-white px-3 py-1.5 text-sm hover:bg-zinc-50"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-900 text-[10px] font-medium text-white">
                U
              </div>
              <span className="font-medium">Profile</span>
            </Link>
          </div>

          {/* Mobile pair switcher (compact) */}
          <div className="md:hidden">
            <PairSwitcher compact />
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl">
        {/* Desktop Sidebar - clean card style */}
        <aside className="hidden w-72 border-r bg-white p-4 md:block">
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all ${
                      isActive 
                        ? "bg-zinc-900 text-white shadow-sm" 
                        : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                    }`
                  }
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>

          <div className="mt-auto pt-8">
            <div className="rounded-3xl border bg-zinc-50 p-4 text-xs text-zinc-500">
              Learning is a journey.
            </div>
          </div>
        </aside>

        {/* Main content area */}
        <main className="flex-1 overflow-auto pb-20 md:pb-6">
          <div className="mx-auto max-w-5xl px-4 py-6 md:px-8">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <BottomNavigation
        items={[
          { to: "/app", end: true, icon: Home, label: "Home" },
          { to: "/app/study", icon: PlayCircle, label: "Study" },
          { to: "/app/decks", icon: BookOpen, label: "Decks" },
          { to: "/app/library", icon: Library, label: "Library" },
          { to: "/app/profile", icon: User, label: "Me" },
        ]}
      />
    </div>
  );
}
