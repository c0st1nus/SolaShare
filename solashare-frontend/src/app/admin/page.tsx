"use client";

import {
  ArrowUpRight,
  BadgeCheck,
  CheckCircle2,
  ClipboardList,
  RefreshCw,
  ShieldCheck,
  Snowflake,
  Trash2,
  UserPlus,
  Users,
  X,
  XCircle,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { WalletBindButton } from "@/components/wallet/WalletBindButton";
import { adminApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { ENERGY_META, formatDate } from "@/lib/utils";
import type {
  AdminAssetItem,
  AdminUserItem,
  AuditLog,
  IssuerAssetReviewIssue,
  KycRequestItem,
  UserRole,
  VerificationOutcome,
} from "@/types";

type ActivePanel = "assets" | "users" | "kyc" | "audit";

type KycDialogState = {
  request: KycRequestItem;
  outcome: Exclude<VerificationOutcome, "approved">;
  comment: string;
} | null;

type AssetReviewDialogState = {
  asset: AdminAssetItem;
  outcome: Exclude<VerificationOutcome, "approved">;
  reason: string;
  issues: IssuerAssetReviewIssue[];
} | null;

export default function AdminPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [panel, setPanel] = useState<ActivePanel>("assets");
  const [assets, setAssets] = useState<AdminAssetItem[]>([]);
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [roleDrafts, setRoleDrafts] = useState<Record<string, UserRole>>({});
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [kycRequests, setKycRequests] = useState<KycRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [dialogImage, setDialogImage] = useState<{
    src: string;
    alt: string;
  } | null>(null);
  const [kycDialog, setKycDialog] = useState<KycDialogState>(null);
  const [assetReviewDialog, setAssetReviewDialog] = useState<AssetReviewDialogState>(null);
  const [userSearchInput, setUserSearchInput] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [newUser, setNewUser] = useState({
    display_name: "",
    email: "",
    password: "",
    role: "investor" as UserRole,
  });

  const loadAdminData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [assetsRes, usersRes, logsRes, kycRes] = await Promise.all([
        adminApi.assets({ limit: 100 }),
        adminApi.users({ limit: 100, search: userSearch || undefined }),
        adminApi.auditLogs({ limit: 20 }),
        adminApi.kycRequests({ limit: 20 }),
      ]);

      setAssets(assetsRes.items);
      setUsers(usersRes.items);
      setLogs(logsRes.items);
      setKycRequests(kycRes.items);
      setRoleDrafts(Object.fromEntries(usersRes.items.map((item) => [item.id, item.role])));
    } catch (err) {
      setAssets([]);
      setUsers([]);
      setLogs([]);
      setKycRequests([]);
      setError(err instanceof Error ? err.message : "Failed to load admin data.");
    } finally {
      setLoading(false);
    }
  }, [userSearch]);

  useEffect(() => {
    if (!user || user.role !== "admin") {
      setLoading(false);
      return;
    }

    void loadAdminData();
  }, [loadAdminData, user]);

  async function doAssetAction(
    assetId: string,
    type: "verify" | "freeze" | "close",
    label: string,
  ) {
    setAction(`${type}-${assetId}`);
    setMsg("");

    try {
      let res: { resulting_status: string };

      if (type === "verify") {
        res = await adminApi.verify(assetId, "approved", "Admin approval");
      } else if (type === "freeze") {
        res = await adminApi.freeze(assetId);
      } else {
        res = await adminApi.close(assetId);
      }

      setMsg(`Asset ${assetId} → ${res.resulting_status}`);
      setAssets((prev) =>
        prev.map((a) =>
          a.id === assetId ? { ...a, status: res.resulting_status as AdminAssetItem["status"] } : a,
        ),
      );
    } catch (err) {
      setMsg(err instanceof Error ? err.message : `${label} failed for ${assetId}.`);
    } finally {
      setAction(null);
    }
  }

  async function submitAssetReviewDialog() {
    if (!assetReviewDialog) {
      return;
    }

    const { asset, outcome, reason, issues } = assetReviewDialog;
    setAction(`verify-${asset.id}-${outcome}`);
    setMsg("");

    try {
      const res = await adminApi.verify(
        asset.id,
        outcome,
        reason.trim() || undefined,
        issues.filter((issue) => issue.note.trim().length > 0),
      );

      setMsg(`Asset ${asset.title} → ${res.resulting_status}`);
      setAssets((prev) =>
        prev.map((item) =>
          item.id === asset.id
            ? { ...item, status: res.resulting_status as AdminAssetItem["status"] }
            : item,
        ),
      );
      setAssetReviewDialog(null);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : `Review failed for ${asset.title}.`);
    } finally {
      setAction(null);
    }
  }

  async function approveKyc(request: KycRequestItem) {
    setAction(`kyc-${request.verification_request_id}-approved`);
    setMsg("");

    try {
      const res = await adminApi.reviewKyc(request.user_id, "approved");
      setMsg(`KYC for ${request.display_name} → ${res.kyc_status}`);
      setKycRequests((prev) =>
        prev.filter((item) => item.verification_request_id !== request.verification_request_id),
      );
    } catch (err) {
      setMsg(
        err instanceof Error ? err.message : `Failed to review KYC for ${request.display_name}.`,
      );
    } finally {
      setAction(null);
    }
  }

  async function submitKycDialog() {
    if (!kycDialog) {
      return;
    }

    const { request, outcome, comment } = kycDialog;
    setAction(`kyc-${request.verification_request_id}-${outcome}`);
    setMsg("");

    try {
      const res = await adminApi.reviewKyc(request.user_id, outcome, comment.trim() || undefined);
      setMsg(`KYC for ${request.display_name} → ${res.kyc_status}`);
      setKycRequests((prev) =>
        prev.filter((item) => item.verification_request_id !== request.verification_request_id),
      );
      setKycDialog(null);
    } catch (err) {
      setMsg(
        err instanceof Error ? err.message : `Failed to review KYC for ${request.display_name}.`,
      );
    } finally {
      setAction(null);
    }
  }

  async function createUserAccount(e: React.FormEvent) {
    e.preventDefault();
    setAction("user-create");
    setMsg("");

    try {
      await adminApi.createUser(newUser);
      setNewUser({
        display_name: "",
        email: "",
        password: "",
        role: "investor",
      });
      setMsg("User created.");
      await loadAdminData();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Failed to create user.");
    } finally {
      setAction(null);
    }
  }

  async function updateUserRole(userItem: AdminUserItem) {
    const nextRole = roleDrafts[userItem.id];

    if (!nextRole || nextRole === userItem.role) {
      return;
    }

    setAction(`role-${userItem.id}`);
    setMsg("");

    try {
      await adminApi.updateUserRole(
        userItem.id,
        nextRole,
        `Admin updated role from ${userItem.role} to ${nextRole}`,
      );
      setUsers((prev) =>
        prev.map((item) => (item.id === userItem.id ? { ...item, role: nextRole } : item)),
      );
      setMsg(`${userItem.display_name} → ${nextRole}`);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Failed to update user role.");
      setRoleDrafts((prev) => ({ ...prev, [userItem.id]: userItem.role }));
    } finally {
      setAction(null);
    }
  }

  async function deleteUserAccount(userItem: AdminUserItem) {
    if (!window.confirm(`Delete ${userItem.display_name}? This cannot be undone.`)) {
      return;
    }

    setAction(`delete-${userItem.id}`);
    setMsg("");

    try {
      await adminApi.deleteUser(userItem.id);
      setUsers((prev) => prev.filter((item) => item.id !== userItem.id));
      setMsg(`${userItem.display_name} deleted.`);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Failed to delete user.");
    } finally {
      setAction(null);
    }
  }

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-24 text-center animate-fade-in">
        <div
          className="w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-6"
          style={{ background: "#9945FF20" }}
        >
          <ShieldCheck className="w-8 h-8 text-[#9945FF]" />
        </div>
        <h1 className="text-3xl font-black mb-3" style={{ color: "var(--text)" }}>
          Admin Panel
        </h1>
        <p className="text-sm mb-8" style={{ color: "var(--text-muted)" }}>
          Sign in as admin to manage the platform.
        </p>
        <Link href="/login" className="btn-sol px-8">
          Go to Login
        </Link>
      </div>
    );
  }

  if (user.role !== "admin") {
    return (
      <div
        className="max-w-xl mx-auto px-6 py-24 text-center"
        style={{ color: "var(--text-muted)" }}
      >
        Access restricted to admins.
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="max-w-[1440px] mx-auto px-8 py-10 animate-pulse">
        <div className="card h-24" />
      </div>
    );
  }

  const pending = assets.filter((a) => a.status === "pending_review");

  return (
    <>
      <div className="max-w-[1440px] mx-auto px-8 py-10 animate-fade-in space-y-8">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: "#9945FF15" }}
            >
              <ShieldCheck className="w-5 h-5 text-[#9945FF]" />
            </div>
            <div>
              <p className="label-xs">Platform Management</p>
              <h1 className="text-3xl font-black" style={{ color: "var(--text)" }}>
                Admin Panel
              </h1>
            </div>
          </div>
          <div className="hidden lg:block">
            <WalletBindButton />
          </div>
        </div>

        <div className="lg:hidden">
          <div className="card p-4">
            <WalletBindButton />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            {
              label: "Total Assets",
              val: assets.length,
              color: "text-[var(--text)]",
            },
            {
              label: "Users",
              val: users.length,
              color: "text-[#00693e]",
            },
            {
              label: "Pending Review",
              val: pending.length,
              color: "text-[#9945FF]",
            },
            {
              label: "KYC Queue",
              val: kycRequests.length,
              color: "text-[var(--accent-green-ui)]",
            },
          ].map((s) => (
            <div key={s.label} className="card p-5 text-center">
              <p className={`text-3xl font-black ${s.color}`}>{s.val}</p>
              <p className="label-xs mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-2 flex-wrap">
          {[
            {
              key: "assets" as const,
              label: "Assets",
              icon: <CheckCircle2 className="w-4 h-4" />,
            },
            {
              key: "users" as const,
              label: "Users",
              icon: <Users className="w-4 h-4" />,
            },
            {
              key: "kyc" as const,
              label: "KYC",
              icon: <BadgeCheck className="w-4 h-4" />,
            },
            {
              key: "audit" as const,
              label: "Audit Logs",
              icon: <ClipboardList className="w-4 h-4" />,
            },
          ].map((t) => (
            <button
              type="button"
              key={t.key}
              onClick={() => setPanel(t.key)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold transition-all border ${
                panel === t.key
                  ? "bg-[#9945FF]/10 border-[#9945FF]/20 text-[#9945FF]"
                  : "border-[var(--border)]"
              }`}
              style={panel === t.key ? {} : { color: "var(--text-muted)" }}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {msg && (
          <div
            className="rounded-2xl px-5 py-3 text-sm font-medium text-[#9945FF]"
            style={{ background: "#9945FF10" }}
          >
            {msg}
          </div>
        )}

        {error && !msg && (
          <div
            className="rounded-2xl px-5 py-3 text-sm font-medium text-red-400"
            style={{ background: "rgba(248,113,113,0.1)" }}
          >
            {error}
          </div>
        )}

        {panel === "assets" && (
          <div className="space-y-3">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={`asset-skeleton-${i}`} className="card h-20 animate-pulse" />
                ))
              : assets.map((a) => {
                  const energy = ENERGY_META[a.energy_type];

                  return (
                    <div key={a.id} className="card p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-xl">{energy.emoji}</span>
                          <div className="min-w-0">
                            <p
                              className="font-black text-sm truncate"
                              style={{ color: "var(--text)" }}
                            >
                              {a.title}
                            </p>
                            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                              {a.issuer_display_name} · {a.location_city ?? "City pending"},{" "}
                              {a.location_country}
                            </p>
                            <p className="text-xs" style={{ color: "var(--text-faint)" }}>
                              {a.id}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 flex-wrap">
                          <StatusBadge status={a.status} />

                          <Link
                            href={`/assets/${a.id}`}
                            className="p-1.5 rounded-xl transition-colors hover:bg-[#9945FF]/5"
                            style={{ color: "var(--text-muted)" }}
                          >
                            <ArrowUpRight className="w-4 h-4" />
                          </Link>

                          {a.status === "pending_review" && (
                            <>
                              <button
                                type="button"
                                onClick={() => doAssetAction(a.id, "verify", "Approve")}
                                disabled={action === `verify-${a.id}`}
                                className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold text-[var(--accent-green-ui)] transition-all hover:bg-[rgb(var(--accent-green-ui-rgb)/0.10)] disabled:opacity-50"
                                style={{ background: "rgb(var(--accent-green-ui-rgb) / 0.1)" }}
                              >
                                {action === `verify-${a.id}` ? (
                                  <RefreshCw className="w-3 h-3 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="w-3 h-3" />
                                )}
                                Approve
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  setAssetReviewDialog({
                                    asset: a,
                                    outcome: "needs_changes",
                                    reason: "",
                                    issues: [{ field: "valuation_usdc", note: "" }],
                                  })
                                }
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all text-amber-400 hover:bg-amber-400/10"
                                style={{ background: "rgba(251,191,36,0.12)" }}
                              >
                                <X className="w-3 h-3" />
                                Request changes
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  setAssetReviewDialog({
                                    asset: a,
                                    outcome: "rejected",
                                    reason: "",
                                    issues: [{ field: "other", note: "" }],
                                  })
                                }
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all text-red-400 hover:bg-red-400/10"
                                style={{ background: "rgba(248,113,113,0.1)" }}
                              >
                                <XCircle className="w-3 h-3" />
                                Reject
                              </button>
                            </>
                          )}

                          {!["frozen", "closed", "draft"].includes(a.status) && (
                            <button
                              type="button"
                              onClick={() => doAssetAction(a.id, "freeze", "Freeze")}
                              disabled={action === `freeze-${a.id}`}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all disabled:opacity-50 text-sky-500 hover:bg-sky-500/10"
                              style={{ background: "rgba(14,165,233,0.1)" }}
                            >
                              {action === `freeze-${a.id}` ? (
                                <RefreshCw className="w-3 h-3 animate-spin" />
                              ) : (
                                <Snowflake className="w-3 h-3" />
                              )}
                              Freeze
                            </button>
                          )}

                          {a.status === "frozen" && (
                            <button
                              type="button"
                              onClick={() => doAssetAction(a.id, "close", "Close")}
                              disabled={action === `close-${a.id}`}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all disabled:opacity-50 text-red-400 hover:bg-red-400/10"
                              style={{ background: "rgba(248,113,113,0.1)" }}
                            >
                              {action === `close-${a.id}` ? (
                                <RefreshCw className="w-3 h-3 animate-spin" />
                              ) : (
                                <XCircle className="w-3 h-3" />
                              )}
                              Close
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
          </div>
        )}

        {panel === "users" && (
          <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
            <form className="card space-y-4" onSubmit={createUserAccount}>
              <div>
                <p className="label-xs mb-2">User Provisioning</p>
                <h2 className="text-2xl font-black" style={{ color: "var(--text)" }}>
                  Add user
                </h2>
              </div>

              <div>
                <label htmlFor="new-user-display-name" className="label-xs mb-2 block">
                  Display name
                </label>
                <input
                  id="new-user-display-name"
                  className="input-new"
                  value={newUser.display_name}
                  onChange={(e) =>
                    setNewUser((prev) => ({
                      ...prev,
                      display_name: e.target.value,
                    }))
                  }
                />
              </div>

              <div>
                <label htmlFor="new-user-email" className="label-xs mb-2 block">
                  Email
                </label>
                <input
                  id="new-user-email"
                  type="email"
                  className="input-new"
                  value={newUser.email}
                  onChange={(e) => setNewUser((prev) => ({ ...prev, email: e.target.value }))}
                />
              </div>

              <div>
                <label htmlFor="new-user-password" className="label-xs mb-2 block">
                  Temporary password
                </label>
                <input
                  id="new-user-password"
                  type="password"
                  className="input-new"
                  value={newUser.password}
                  onChange={(e) =>
                    setNewUser((prev) => ({
                      ...prev,
                      password: e.target.value,
                    }))
                  }
                />
              </div>

              <div>
                <label htmlFor="new-user-role" className="label-xs mb-2 block">
                  Role
                </label>
                <select
                  id="new-user-role"
                  className="input-new"
                  value={newUser.role}
                  onChange={(e) =>
                    setNewUser((prev) => ({
                      ...prev,
                      role: e.target.value as UserRole,
                    }))
                  }
                >
                  <option value="investor">Investor</option>
                  <option value="issuer">Issuer</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={action === "user-create"}
                className="btn-sol w-full justify-center"
              >
                {action === "user-create" ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <UserPlus className="w-4 h-4" />
                )}
                Create user
              </button>
            </form>

            <div className="space-y-4">
              <div className="card flex flex-wrap items-center gap-3">
                <input
                  className="input-new flex-1 min-w-[220px]"
                  placeholder="Search by name or email"
                  value={userSearchInput}
                  onChange={(e) => setUserSearchInput(e.target.value)}
                />
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => setUserSearch(userSearchInput.trim())}
                >
                  Search
                </button>
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => {
                    setUserSearchInput("");
                    setUserSearch("");
                  }}
                >
                  Reset
                </button>
              </div>

              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={`user-skeleton-${i}`} className="card h-28 animate-pulse" />
                ))
              ) : users.length === 0 ? (
                <div className="card">
                  <EmptyState
                    title="No users found"
                    description="Create a user or widen the search."
                  />
                </div>
              ) : (
                users.map((item) => (
                  <div key={item.id} className="card p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="space-y-2">
                        <div>
                          <p className="font-black text-sm" style={{ color: "var(--text)" }}>
                            {item.display_name}
                          </p>
                          <p className="text-xs" style={{ color: "var(--text-faint)" }}>
                            {item.email ?? item.id}
                          </p>
                        </div>
                        <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                          Created {formatDate(item.created_at)} · KYC {item.kyc_status}
                        </div>
                        <div className="text-xs" style={{ color: "var(--text-faint)" }}>
                          Providers:{" "}
                          {item.auth_providers.length > 0 ? item.auth_providers.join(", ") : "none"}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className="px-2 py-1 rounded-lg text-xs font-bold"
                          style={{
                            background: "var(--surface-low)",
                            color: "var(--text-muted)",
                          }}
                        >
                          {item.status}
                        </span>
                        <select
                          className="input-new min-w-[130px]"
                          value={roleDrafts[item.id] ?? item.role}
                          onChange={(e) =>
                            setRoleDrafts((prev) => ({
                              ...prev,
                              [item.id]: e.target.value as UserRole,
                            }))
                          }
                        >
                          <option value="investor">Investor</option>
                          <option value="issuer">Issuer</option>
                          <option value="admin">Admin</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => updateUserRole(item)}
                          disabled={
                            action === `role-${item.id}` ||
                            (roleDrafts[item.id] ?? item.role) === item.role
                          }
                          className="btn-outline"
                        >
                          {action === `role-${item.id}` ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            "Apply role"
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteUserAccount(item)}
                          disabled={action === `delete-${item.id}`}
                          className="inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold text-red-400"
                          style={{ background: "rgba(248,113,113,0.1)" }}
                        >
                          {action === `delete-${item.id}` ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {panel === "kyc" && (
          <div className="space-y-3">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={`kyc-skeleton-${i}`} className="card h-36 animate-pulse" />
              ))
            ) : kycRequests.length === 0 ? (
              <div className="card">
                <EmptyState
                  title="No pending KYC requests"
                  description="Investor KYC submissions will appear here."
                />
              </div>
            ) : (
              kycRequests.map((request) => {
                const isImageDocument = request.mime_type.startsWith("image/");

                return (
                  <div key={request.verification_request_id} className="card p-5">
                    <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
                      <div className="space-y-3">
                        <button
                          type="button"
                          onClick={() =>
                            isImageDocument
                              ? setDialogImage({
                                  src: request.document_uri,
                                  alt: `${request.display_name} KYC document`,
                                })
                              : undefined
                          }
                          className="w-full overflow-hidden rounded-[1.5rem] border text-left"
                          style={{
                            borderColor: "var(--border)",
                            background: "var(--surface-low)",
                          }}
                        >
                          <div
                            className="relative aspect-[4/5] w-full"
                            style={{ background: "rgba(12, 15, 15, 0.04)" }}
                          >
                            {isImageDocument ? (
                              <Image
                                src={request.document_uri}
                                alt={`${request.display_name} KYC document`}
                                fill
                                unoptimized
                                className="object-cover"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center px-6 text-center">
                                <div>
                                  <p className="text-sm font-bold" style={{ color: "var(--text)" }}>
                                    Preview unavailable
                                  </p>
                                  <p
                                    className="mt-2 text-xs"
                                    style={{ color: "var(--text-faint)" }}
                                  >
                                    Open the uploaded file in a new tab.
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        </button>

                        <a
                          href={request.document_uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex text-xs font-bold text-[#9945FF] hover:underline"
                        >
                          Open KYC document
                        </a>
                      </div>

                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="space-y-2">
                          <div>
                            <p className="font-black text-sm" style={{ color: "var(--text)" }}>
                              {request.display_name}
                            </p>
                            <p className="text-xs" style={{ color: "var(--text-faint)" }}>
                              {request.email ?? request.user_id}
                            </p>
                          </div>
                          <div
                            className="text-xs font-medium"
                            style={{ color: "var(--text-muted)" }}
                          >
                            {request.document_type === "passport" ? "Passport" : "National ID"} ·{" "}
                            {request.document_name}
                          </div>
                          <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                            Submitted {formatDate(request.created_at)}
                          </div>
                          <p
                            className="text-xs font-mono break-all"
                            style={{ color: "var(--text-faint)" }}
                          >
                            {request.document_hash}
                          </p>
                          {request.notes && (
                            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                              {request.notes}
                            </p>
                          )}
                        </div>

                        <div className="flex gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => approveKyc(request)}
                            disabled={action === `kyc-${request.verification_request_id}-approved`}
                            className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-[var(--accent-green-ui)]"
                            style={{ background: "rgb(var(--accent-green-ui-rgb) / 0.1)" }}
                          >
                            {action === `kyc-${request.verification_request_id}-approved` ? (
                              <RefreshCw className="w-3 h-3 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-3 h-3" />
                            )}
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setKycDialog({
                                request,
                                outcome: "needs_changes",
                                comment: "",
                              })
                            }
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-[#9945FF]"
                            style={{ background: "#9945FF10" }}
                          >
                            <BadgeCheck className="w-3 h-3" />
                            Needs changes
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setKycDialog({
                                request,
                                outcome: "rejected",
                                comment: "",
                              })
                            }
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-red-400"
                            style={{ background: "rgba(248,113,113,0.1)" }}
                          >
                            <XCircle className="w-3 h-3" />
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {panel === "audit" && (
          <div className="card overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: "var(--border)" }}>
                  {["Timestamp", "Actor", "Entity", "Action"].map((h) => (
                    <th key={h} className="text-left px-5 py-4 label-xs">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr
                      key={`audit-skeleton-${i}`}
                      className="border-b"
                      style={{ borderColor: "var(--border)" }}
                    >
                      {[1, 2, 3, 4].map((j) => (
                        <td key={j} className="px-5 py-4">
                          <div
                            className="h-3 rounded-xl animate-pulse w-20"
                            style={{ background: "var(--surface-low)" }}
                          />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : logs.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-5 py-10 text-center"
                      style={{ color: "var(--text-faint)" }}
                    >
                      No audit events.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr
                      key={log.id}
                      className="border-b transition-colors hover:bg-[#9945FF]/5"
                      style={{ borderColor: "var(--border)" }}
                    >
                      <td
                        className="px-5 py-3.5 text-xs font-mono whitespace-nowrap"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {formatDate(log.created_at)}
                      </td>
                      <td
                        className="px-5 py-3.5 text-xs font-mono"
                        style={{ color: "var(--text-faint)" }}
                      >
                        {log.actor_user_id ? `${log.actor_user_id.slice(0, 8)}…` : "system"}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-xs capitalize" style={{ color: "var(--text-muted)" }}>
                          {log.entity_type}
                        </span>
                        <span className="text-xs" style={{ color: "var(--text-faint)" }}>
                          {" "}
                          · {log.entity_id.slice(0, 8)}…
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className="px-2 py-1 rounded-lg text-xs font-mono text-[#9945FF]"
                          style={{ background: "#9945FF10" }}
                        >
                          {log.action}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {dialogImage && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-md"
          style={{ background: "rgba(12, 15, 15, 0.55)" }}
          role="button"
          tabIndex={0}
          onClick={() => setDialogImage(null)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " " || e.key === "Escape") {
              setDialogImage(null);
            }
          }}
        >
          <div
            className="relative w-full max-w-4xl overflow-hidden rounded-[2rem] border"
            style={{
              background: "var(--surface)",
              borderColor: "var(--border)",
            }}
            role="presentation"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setDialogImage(null)}
              className="absolute right-4 top-4 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border"
              style={{
                background: "rgba(12, 15, 15, 0.55)",
                borderColor: "rgba(255,255,255,0.12)",
                color: "#fff",
              }}
              aria-label="Close KYC document preview"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="relative aspect-[4/5] w-full" style={{ background: "#050606" }}>
              <Image
                src={dialogImage.src}
                alt={dialogImage.alt}
                fill
                unoptimized
                className="object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {kycDialog && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center p-6 backdrop-blur-md"
          style={{ background: "rgba(12, 15, 15, 0.55)" }}
          onClick={() => setKycDialog(null)}
        >
          <div
            className="w-full max-w-lg rounded-[2rem] border p-6"
            style={{
              background: "var(--surface)",
              borderColor: "var(--border)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="label-xs mb-2">KYC Review</p>
                <h2 className="text-2xl font-black" style={{ color: "var(--text)" }}>
                  {kycDialog.outcome === "rejected" ? "Reject document" : "Request changes"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setKycDialog(null)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border"
                style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="mt-3 text-sm" style={{ color: "var(--text-muted)" }}>
              Comment is optional. Leave it empty for a quick decision.
            </p>

            <div className="mt-5">
              <label className="label-xs mb-2 block">Comment</label>
              <textarea
                rows={5}
                className="input-new min-h-[140px]"
                value={kycDialog.comment}
                onChange={(e) =>
                  setKycDialog((prev) => (prev ? { ...prev, comment: e.target.value } : prev))
                }
                placeholder="Optional note for the user"
              />
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <button type="button" onClick={() => setKycDialog(null)} className="btn-outline">
                Cancel
              </button>
              <button
                type="button"
                onClick={submitKycDialog}
                disabled={
                  action === `kyc-${kycDialog.request.verification_request_id}-${kycDialog.outcome}`
                }
                className="btn-sol"
              >
                {action ===
                `kyc-${kycDialog.request.verification_request_id}-${kycDialog.outcome}` ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : kycDialog.outcome === "rejected" ? (
                  "Reject"
                ) : (
                  "Send for changes"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {assetReviewDialog && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center p-6 backdrop-blur-md"
          style={{ background: "rgba(12, 15, 15, 0.55)" }}
          onClick={() => setAssetReviewDialog(null)}
        >
          <div
            className="w-full max-w-2xl rounded-[2rem] border p-6"
            style={{
              background: "var(--surface)",
              borderColor: "var(--border)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="label-xs mb-2">Asset Review</p>
                <h2 className="text-2xl font-black" style={{ color: "var(--text)" }}>
                  {assetReviewDialog.outcome === "rejected" ? "Reject asset" : "Request changes"}
                </h2>
                <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
                  {assetReviewDialog.asset.title}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAssetReviewDialog(null)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border"
                style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="label-xs mb-2 block">Reason</label>
                <textarea
                  rows={4}
                  className="input-new min-h-[120px]"
                  value={assetReviewDialog.reason}
                  onChange={(e) =>
                    setAssetReviewDialog((prev) =>
                      prev ? { ...prev, reason: e.target.value } : prev,
                    )
                  }
                  placeholder="Explain what is wrong with the asset submission."
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="label-xs block">Structured Issues</label>
                  <button
                    type="button"
                    className="btn-outline text-xs px-3 py-2"
                    onClick={() =>
                      setAssetReviewDialog((prev) =>
                        prev
                          ? {
                              ...prev,
                              issues: [...prev.issues, { field: "other", note: "" }],
                            }
                          : prev,
                      )
                    }
                  >
                    Add issue
                  </button>
                </div>

                {assetReviewDialog.issues.map((issue, index) => (
                  <div
                    key={`${issue.field}-${index}`}
                    className="rounded-[1.25rem] border p-4"
                    style={{ borderColor: "var(--border)", background: "var(--surface-low)" }}
                  >
                    <div className="grid gap-3 sm:grid-cols-[220px_minmax(0,1fr)]">
                      <div>
                        <label className="label-xs mb-2 block">Field</label>
                        <select
                          className="input-new"
                          value={issue.field}
                          onChange={(e) =>
                            setAssetReviewDialog((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    issues: prev.issues.map((current, currentIndex) =>
                                      currentIndex === index
                                        ? { ...current, field: e.target.value }
                                        : current,
                                    ),
                                  }
                                : prev,
                            )
                          }
                        >
                          {[
                            ["valuation_usdc", "Asset valuation"],
                            ["minimum_buy_amount_usdc", "Minimum investment"],
                            ["capacity_kw", "Capacity"],
                            ["technical_passport", "Technical passport"],
                            ["ownership_doc", "Ownership document"],
                            ["right_to_income_doc", "Right to income"],
                            ["financial_model", "Financial model"],
                            ["other", "Other"],
                          ].map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="label-xs mb-2 block">Issue note</label>
                        <textarea
                          rows={3}
                          className="input-new"
                          value={issue.note}
                          onChange={(e) =>
                            setAssetReviewDialog((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    issues: prev.issues.map((current, currentIndex) =>
                                      currentIndex === index
                                        ? { ...current, note: e.target.value }
                                        : current,
                                    ),
                                  }
                                : prev,
                            )
                          }
                          placeholder="Example: valuation in the project passport does not match the submitted amount."
                        />
                      </div>
                    </div>

                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <input
                        className="input-new"
                        placeholder="Submitted value"
                        value={issue.actual_value ?? ""}
                        onChange={(e) =>
                          setAssetReviewDialog((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  issues: prev.issues.map((current, currentIndex) =>
                                    currentIndex === index
                                      ? { ...current, actual_value: e.target.value }
                                      : current,
                                  ),
                                }
                              : prev,
                          )
                        }
                      />
                      <input
                        className="input-new"
                        placeholder="Expected value"
                        value={issue.expected_value ?? ""}
                        onChange={(e) =>
                          setAssetReviewDialog((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  issues: prev.issues.map((current, currentIndex) =>
                                    currentIndex === index
                                      ? { ...current, expected_value: e.target.value }
                                      : current,
                                  ),
                                }
                              : prev,
                          )
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setAssetReviewDialog(null)}
                className="btn-outline"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitAssetReviewDialog}
                disabled={
                  action === `verify-${assetReviewDialog.asset.id}-${assetReviewDialog.outcome}`
                }
                className="btn-sol"
              >
                {action === `verify-${assetReviewDialog.asset.id}-${assetReviewDialog.outcome}` ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : assetReviewDialog.outcome === "rejected" ? (
                  "Reject asset"
                ) : (
                  "Send changes"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
