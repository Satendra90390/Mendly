"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { API_BASE } from "@/lib/config";

interface AccountStats {
  member_since: string;
  total_chats: number;
  saved_items: number;
}

export default function AccountPage() {
  const { user, authFetch, logout } = useAuth();

  const [name, setName] = useState(user?.name || "");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState<AccountStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (user?.name) setName(user.name);
  }, [user?.name]);

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
        if (data.name) {
          const stored = localStorage.getItem("mendly_user");
          if (stored) {
            const parsed = JSON.parse(stored);
            parsed.name = data.name;
            localStorage.setItem("mendly_user", JSON.stringify(parsed));
          }
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
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 p-4 md:p-8">
      {/* Header */}
      <div className="max-w-3xl mx-auto mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center">
            <i className="fa-solid fa-user-gear text-teal-400 text-xl"></i>
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">Account</h1>
            <p className="text-gray-400 text-sm">Manage your profile and preferences</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto space-y-6">
        {/* Profile Card */}
        <div className="rounded-xl bg-gray-800/40 backdrop-blur-md border border-gray-700/30 p-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-2xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center flex-shrink-0">
              {user?.profile_photo ? (
                <img
                  src={user.profile_photo}
                  alt={user.name}
                  className="w-full h-full rounded-2xl object-cover"
                />
              ) : (
                <span className="text-2xl font-bold text-teal-300">
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
                    className="w-full sm:w-64 px-4 py-2 rounded-lg bg-gray-700/50 border border-teal-500/40 text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                    autoFocus
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSaveName}
                      disabled={saving}
                      className="px-4 py-2 rounded-lg bg-teal-500/20 border border-teal-500/30 text-teal-300 text-sm font-medium hover:bg-teal-500/30 transition-all disabled:opacity-50"
                    >
                      {saving ? (
                        <i className="fa-solid fa-spinner fa-spin"></i>
                      ) : (
                        <i className="fa-solid fa-check"></i>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setName(user?.name || "");
                        setEditing(false);
                      }}
                      className="px-4 py-2 rounded-lg bg-gray-700/40 border border-gray-600/30 text-gray-400 text-sm font-medium hover:text-white transition-all"
                    >
                      <i className="fa-solid fa-xmark"></i>
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <h2 className="text-white font-bold text-xl">{user?.name || "User"}</h2>
                  <p className="text-gray-400 text-sm mt-0.5">{user?.email}</p>
                  <button
                    onClick={() => setEditing(true)}
                    className="mt-3 flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-700/40 border border-gray-600/30 text-gray-400 text-sm font-medium hover:text-white hover:bg-gray-700/60 transition-all"
                  >
                    <i className="fa-solid fa-pen text-[11px]"></i>
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
            <div
              key={stat.label}
              className="rounded-xl bg-gray-800/40 backdrop-blur-md border border-gray-700/30 p-5 flex flex-col gap-3"
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ background: `${stat.color}18` }}
              >
                <i className={stat.icon} style={{ color: stat.color }} />
              </div>
              {statsLoading ? (
                <div
                  className="h-6 w-16 rounded-md animate-pulse"
                  style={{ background: "rgba(255,255,255,0.05)" }}
                />
              ) : (
                <span className="text-xl font-bold text-white">{stat.value}</span>
              )}
              <p className="text-xs text-gray-500">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Danger Zone */}
        <div className="rounded-xl bg-gray-800/40 backdrop-blur-md border border-red-500/20 p-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <i className="fa-solid fa-triangle-exclamation text-red-400 text-sm"></i>
            </div>
            <div className="flex-1">
              <h3 className="text-white font-semibold text-sm">Danger Zone</h3>
              <p className="text-gray-400 text-xs mt-1 mb-4">
                Permanently delete your account and all associated data. This action cannot be undone.
              </p>

              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium hover:bg-red-500/20 hover:border-red-500/30 transition-all"
                >
                  <i className="fa-solid fa-trash-can text-[11px]"></i>
                  <span>Delete Account</span>
                </button>
              ) : (
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <p className="text-red-300 text-sm font-medium">
                    Are you sure? This cannot be undone.
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleDeleteAccount}
                      disabled={deleting}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-sm font-medium hover:bg-red-500/30 transition-all disabled:opacity-50"
                    >
                      {deleting ? (
                        <i className="fa-solid fa-spinner fa-spin"></i>
                      ) : (
                        <i className="fa-solid fa-trash-can text-[11px]"></i>
                      )}
                      <span>Yes, Delete</span>
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-4 py-2 rounded-lg bg-gray-700/40 border border-gray-600/30 text-gray-400 text-sm font-medium hover:text-white transition-all"
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
