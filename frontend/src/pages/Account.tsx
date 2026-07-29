import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { API_BASE } from "@/lib/config";

interface AccountStats {
  member_since: string;
  total_chats: number;
  saved_items: number;
}

function StatIcon({ icon, color }: { icon: string; color: string }) {
  const cls = "w-4 h-4";
  switch (icon) {
    case "fa-solid fa-calendar-check":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
          <polyline points="9 16 11 18 15 14" />
        </svg>
      );
    case "fa-solid fa-comments":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      );
    case "fa-solid fa-bookmark":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="19 21 12 17 5 21 5 3 19 3 19 21" />
        </svg>
      );
    default:
      return null;
  }
}

export default function AccountPage() {
  const { user, token, authFetch, logout, login } = useAuth();

  const [name, setName] = useState(user?.name || "");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState<AccountStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await authFetch(`${API_BASE}/user/stats`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch {
      // use defaults
    } finally {
      setStatsLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchStats();
  }, [fetchStats]);

  const handleSaveName = async () => {
    if (!name.trim() || name.trim() === user?.name) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      const res = await authFetch(`${API_BASE}/user/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.name && token && user) {
          login(token, { ...user, name: data.name });
        }
      }
    } catch {
      // keep current name
    } finally {
      setSaving(false);
      setEditing(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const res = await authFetch(`${API_BASE}/user/profile`, {
        method: "DELETE",
      });
      if (res.ok) {
        logout();
      }
    } catch {
      // stay on page
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const getInitials = (n: string) => {
    return n
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatMemberSince = (dateStr?: string) => {
    if (!dateStr) return "Unknown";
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="page-wrap p-4 md:p-8">
      <div className="max-w-3xl mx-auto mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "hsl(173 80% 36% / 0.2)", border: "1px solid hsl(173 80% 36% / 0.3)" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold" style={{ color: "hsl(var(--foreground))" }}>Account</h1>
            <p className="text-sm text-muted">Manage your profile and preferences</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto space-y-6">
        {/* Profile Card */}
        <div className="rounded-xl p-6" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: "hsl(173 80% 36% / 0.2)", border: "1px solid hsl(173 80% 36% / 0.3)" }}>
              {user?.profile_photo ? (
                <img
                  src={user.profile_photo}
                  alt={user.name}
                  className="w-full h-full rounded-2xl object-cover"
                />
              ) : (
                <span className="text-2xl font-bold" style={{ color: "hsl(var(--primary))" }}>
                  {getInitials(user?.name || "U")}
                </span>
              )}
            </div>

            {/* Profile Info */}
            <div className="flex-1 text-center sm:text-left">
              {editing ? (
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveName();
                      if (e.key === "Escape") {
                        setName(user?.name || "");
                        setEditing(false);
                      }
                    }}
                    className="w-full sm:w-64 px-4 py-2 rounded-lg text-sm outline-none"
                    style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--primary))", color: "hsl(var(--foreground))" }}
                    autoFocus
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSaveName}
                      disabled={saving}
                      className="px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                      style={{ background: "hsl(173 80% 36% / 0.2)", border: "1px solid hsl(173 80% 36% / 0.3)", color: "hsl(var(--primary))" }}
                    >
                      {saving ? (
                        <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setName(user?.name || "");
                        setEditing(false);
                      }}
                      className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                      style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", color: "hsl(var(--muted-foreground))" }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <h2 className="font-bold text-xl" style={{ color: "hsl(var(--foreground))" }}>{user?.name || "User"}</h2>
                  <p className="text-sm mt-0.5 text-muted">{user?.email}</p>
                  <button
                    onClick={() => setEditing(true)}
                    className="mt-3 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                    style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", color: "hsl(var(--muted-foreground))" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "hsl(var(--muted))"; e.currentTarget.style.color = "hsl(var(--foreground))"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "hsl(var(--card))"; e.currentTarget.style.color = "hsl(var(--muted-foreground))"; }}
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                    </svg>
                    <span>Edit Name</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Account Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              label: "Member Since",
              value: statsLoading ? null : formatMemberSince(stats?.member_since),
              icon: "fa-solid fa-calendar-check",
              color: "#14B8A6",
            },
            {
              label: "Total Chats",
              value: statsLoading ? null : stats?.total_chats ?? 0,
              icon: "fa-solid fa-comments",
              color: "#8B5CF6",
            },
            {
              label: "Saved Items",
              value: statsLoading ? null : stats?.saved_items ?? 0,
              icon: "fa-solid fa-bookmark",
              color: "#EC4899",
            },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl p-5 flex flex-col gap-3" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${stat.color}18` }}>
                <StatIcon icon={stat.icon} color={stat.color} />
              </div>
              {statsLoading ? (
                <div className="h-6 w-16 rounded-md animate-pulse" style={{ background: "hsl(var(--muted))" }} />
              ) : (
                <span className="text-xl font-bold" style={{ color: "hsl(var(--foreground))" }}>{stat.value}</span>
              )}
              <p className="text-xs text-dim">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Danger Zone */}
        <div className="rounded-xl p-6" style={{ background: "hsl(var(--card))", border: "1px solid hsl(0 84% 60% / 0.2)" }}>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: "hsl(0 84% 60% / 0.1)", border: "1px solid hsl(0 84% 60% / 0.2)" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-sm" style={{ color: "hsl(var(--foreground))" }}>Danger Zone</h3>
              <p className="text-xs mt-1 mb-4 text-muted">
                Permanently delete your account and all associated data. This action cannot be undone.
              </p>

              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                  style={{ background: "hsl(0 84% 60% / 0.1)", border: "1px solid hsl(0 84% 60% / 0.2)", color: "#EF4444" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "hsl(0 84% 60% / 0.2)"; e.currentTarget.style.borderColor = "hsl(0 84% 60% / 0.3)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "hsl(0 84% 60% / 0.1)"; e.currentTarget.style.borderColor = "hsl(0 84% 60% / 0.2)"; }}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                  <span>Delete Account</span>
                </button>
              ) : (
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <p className="text-sm font-medium" style={{ color: "#FCA5A5" }}>
                    Are you sure? This cannot be undone.
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleDeleteAccount}
                      disabled={deleting}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                      style={{ background: "hsl(0 84% 60% / 0.2)", border: "1px solid hsl(0 84% 60% / 0.3)", color: "#FCA5A5" }}
                    >
                      {deleting ? (
                        <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                        </svg>
                      ) : (
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      )}
                      <span>Yes, Delete</span>
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                      style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", color: "hsl(var(--muted-foreground))" }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = "hsl(var(--foreground))"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = "hsl(var(--muted-foreground))"; }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}