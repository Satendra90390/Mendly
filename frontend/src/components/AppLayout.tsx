import { useState, useRef, useEffect } from "react";
import { Outlet, useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/components/theme-provider";
import MobileNav from "@/components/mobile-nav";
import Logo from "@/components/Logo";

function ChartIcon() { return <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>; }
function RobotIcon() { return <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6v3.75m0 3v.75m-6-3.75H9m1.5-3h.75m0 0v3m0 0h-.75M12 3a9 9 0 00-9 9v2.25a9 9 0 0018 0V12a9 9 0 00-9-9z" /></svg>; }
function PillsIcon() { return <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>; }
function HospitalIcon() { return <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m-9 0h18M3 6.75h18M4.5 3h15M6 3v3M18 3v3" /></svg>; }
function BottleIcon() { return <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19 14.5M3 21h18" /></svg>; }
function AlertIcon() { return <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>; }

const NAV_LINKS = [
  { label: "Dashboard", href: "/dashboard", icon: ChartIcon },
  { label: "Elix", href: "/chatbot", icon: RobotIcon },
  { label: "Medicines", href: "/medicines", icon: PillsIcon },
  { label: "Hospitals", href: "/hospitals", icon: HospitalIcon },
  { label: "Pharmacies", href: "/pharmacies", icon: BottleIcon },
  { label: "Emergency", href: "/emergency", icon: AlertIcon },
];

function SunIcon() { return <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" /></svg>; }
function MoonIcon() { return <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" /></svg>; }

export default function AppLayout() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!user) return null;

  const userInitial = user.name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || "U";
  const avatarBg = user.avatar_color || "hsl(var(--primary))";

  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border glass" style={{ borderRadius: 0 }}>
        <div className="relative">
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-teal-400/60 to-transparent" />
          <div className="max-w-7xl mx-auto flex items-center justify-between h-16 px-5 lg:px-8">
            <Link to="/dashboard">
              <Logo />
            </Link>
            <div className="hidden lg:flex items-center gap-1">
              {NAV_LINKS.map((link) => {
                const Icon = link.icon;
                const isActive = location.pathname.startsWith(link.href);
                return (
                  <Link key={link.href} to={link.href}
                    className={`nav-link ${isActive ? "active" : ""}`}
                    style={{ color: isActive ? undefined : "hsl(var(--muted-foreground))" }}>
                    <Icon /> {link.label}
                  </Link>
                );
              })}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={toggle} className="w-10 h-10 rounded-full flex items-center justify-center transition-colors hover:bg-muted" style={{ color: "hsl(var(--muted-foreground))" }}>
                {theme === "dark" ? <SunIcon /> : <MoonIcon />}
              </button>
              <div className="relative" ref={dropdownRef}>
                <button onClick={() => setDropdownOpen(!dropdownOpen)} className="flex items-center gap-2 p-1.5 rounded-full transition-colors hover:bg-muted">
                  {user.profile_photo ? (
                    <img src={user.profile_photo} alt="" className="w-9 h-9 rounded-full object-cover" />
                  ) : (
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: avatarBg }}>{userInitial}</div>
                  )}
                  <svg className="w-4 h-4 hidden sm:block transition-transform" style={{ color: "hsl(var(--muted-foreground))", transform: dropdownOpen ? "rotate(180deg)" : undefined }}
                    fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>
                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 rounded-xl overflow-hidden py-1 animate-in shadow-lg border border-border" style={{ background: "hsl(var(--card))" }}>
                    <div className="px-5 py-4 border-b border-border">
                      <p className="text-sm font-semibold truncate text-foreground">{user.name}</p>
                      <p className="text-xs truncate mt-0.5 text-muted">{user.email}</p>
                    </div>
                    <div className="py-1.5">
                      {[
                        { label: "Account", href: "/account", icon: "M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" },
                        { label: "Saved Items", href: "/saved", icon: "M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" },
                        { label: "Conditions", href: "/conditions", icon: "M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" },
                      ].map((item) => (
                        <Link key={item.href} to={item.href} onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-3 px-5 py-3 text-sm transition-colors hover:bg-muted hover:text-foreground"
                          style={{ color: "hsl(var(--muted-foreground))" }}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d={item.icon} /></svg>
                          {item.label}
                        </Link>
                      ))}
                    </div>
                    <div className="border-t border-border py-1.5">
                      <button onClick={() => { setDropdownOpen(false); logout(); navigate("/"); }}
                        className="flex items-center gap-3 w-full px-5 py-3 text-sm transition-colors hover:bg-destructive/10"
                        style={{ color: "hsl(var(--destructive))" }}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" /></svg>
                        Log out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="pt-20 pb-24 lg:pb-0 min-h-screen">
        <Outlet />
      </main>

      <div className="lg:hidden"><MobileNav /></div>
    </div>
  );
}
