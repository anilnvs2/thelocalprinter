"use client";
import { useState, useEffect, useRef } from "react";
import {
  Search,
  Trash2,
  Eye,
  Loader2,
  MoreHorizontal,
  UserCheck,
  UserX,
  Megaphone,
  CheckCircle,
  XCircle,
} from "lucide-react";
import {
  getPosterBoys,
  toggleUserStatus,
  deleteUser,
  updateUserApprovalStatus,
  updatePosterBoyProfileStatus,
} from "../../services/adminService";
import { PageHeader } from "../../components/shared/page-header";
import { StatusBadge } from "../../components/shared/status-badge";
import { EmptyState } from "../../components/shared/empty-state";
import { PageLoader } from "../../components/shared/page-loader";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import PosterBoyViewDialog, {
  computeProfileChanges,
  humanizeChangeKey,
} from "./PosterBoyViewDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Avatar, AvatarFallback } from "../../components/ui/avatar";
import CopyableId from "../../components/admin/CopyableId";

const AdminPosterBoys = () => {
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [viewTarget, setViewTarget] = useState(null);
  const [accountConfirm, setAccountConfirm] = useState(null);
  const [profileConfirm, setProfileConfirm] = useState(null);
  const [actionLoading2, setActionLoading2] = useState(false);
  const debounceRef = useRef(null);

  const fetchPosterBoys = async (p = 1, s = "") => {
    setLoading(true);
    setError("");
    try {
      const res = await getPosterBoys(p, s, "approved");
      setItems(res.data.items);
      setPagination(res.data.pagination);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load poster boys");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosterBoys(page, search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchPosterBoys(1, value);
    }, 400);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setPage(1);
    fetchPosterBoys(1, search);
  };

  const handleToggle = async (id) => {
    try {
      setActionLoading(id);
      setError("");
      const res = await toggleUserStatus(id);
      setItems((prev) =>
        prev.map((v) => (v._id === id ? { ...v, isActive: res.data.user.isActive } : v))
      );
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update status");
    } finally {
      setActionLoading(null);
    }
  };

  const handleAccountAction = async () => {
    if (!accountConfirm) return;
    try {
      setActionLoading2(true);
      setError("");
      const res = await updateUserApprovalStatus(accountConfirm.id, accountConfirm.status);
      setItems((prev) =>
        prev.map((v) =>
          v._id === accountConfirm.id
            ? { ...v, approvalStatus: res.data.user.approvalStatus }
            : v
        )
      );
      setAccountConfirm(null);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update account approval");
    } finally {
      setActionLoading2(false);
    }
  };

  const handleProfileAction = async () => {
    if (!profileConfirm) return;
    try {
      setActionLoading2(true);
      setError("");
      const res = await updatePosterBoyProfileStatus(profileConfirm.profileId, profileConfirm.status);
      const updated = res.data.profile;
      setItems((prev) =>
        prev.map((v) =>
          v._id === profileConfirm.userId
            ? {
                ...v,
                profile: {
                  ...v.profile,
                  status: updated.status,
                  hasPendingChange: updated.hasPendingChange,
                  pendingChangeAt: updated.pendingChangeAt,
                  skills: updated.skills,
                  languages: updated.languages,
                  address: updated.address,
                  city: updated.city ?? v.profile?.city ?? "",
                  aadhaarNumber: updated.aadhaarNumber,
                  workRadius: updated.workRadius,
                  strength: updated.strength,
                  orderAccepted: updated.orderAccepted,
                  bookingTimeline: updated.bookingTimeline,
                  workTiming: updated.workTiming,
                  workMedia: updated.workMedia,
                  profileCompleted: updated.profileCompleted,
                  pendingChangeData: updated.pendingChangeData ?? null,
                },
              }
            : v
        )
      );
      setViewTarget((prev) =>
        prev && prev._id === profileConfirm.userId
          ? {
              ...prev,
              profile: {
                ...prev.profile,
                status: updated.status,
                hasPendingChange: updated.hasPendingChange,
                pendingChangeAt: updated.pendingChangeAt,
                skills: updated.skills,
                languages: updated.languages,
                address: updated.address,
                city: updated.city ?? prev.profile?.city ?? "",
                aadhaarNumber: updated.aadhaarNumber,
                workRadius: updated.workRadius,
                strength: updated.strength,
                orderAccepted: updated.orderAccepted,
                bookingTimeline: updated.bookingTimeline,
                workTiming: updated.workTiming,
                workMedia: updated.workMedia,
                profileCompleted: updated.profileCompleted,
                pendingChangeData: updated.pendingChangeData ?? null,
              },
            }
          : prev
      );
      setProfileConfirm(null);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update profile approval");
    } finally {
      setActionLoading2(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      setDeleteLoading(true);
      setError("");
      await deleteUser(deleteTarget._id);
      setItems((prev) => prev.filter((v) => v._id !== deleteTarget._id));
      if (pagination) {
        const newTotal = pagination.total - 1;
        const newPages = Math.ceil(newTotal / pagination.limit);
        setPagination((prev) => ({ ...prev, total: newTotal, pages: newPages }));
        if (page > newPages && newPages > 0) setPage(newPages);
      }
      setDeleteTarget(null);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete poster boy");
    } finally {
      setDeleteLoading(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const profileBadge = (v) => {
    if (!v.profile) {
      return (
        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
          no profile
        </span>
      );
    }
    return <StatusBadge status={v.profile.status} />;
  };

  // Profile edits submitted by approved worker boys, waiting for review.
  const pendingItems = items.filter((v) => v.profile?.hasPendingChange);

  const openProfileConfirm = (v, status) => {
    if (!v?.profile) return;
    setProfileConfirm({
      profileId: v.profile._id,
      userId: v._id,
      name: v.fullName,
      status,
      pending: v.profile.hasPendingChange,
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Poster Boys"
        description="Approved worker boy accounts and their work profile approvals. First-time sign-ups are reviewed under Businesses."
      />

      {error && (
        <div className="flex items-center justify-between rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <span>{error}</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-destructive hover:text-destructive"
            onClick={() => setError("")}
          >
            Dismiss
          </Button>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="flex flex-col gap-3 border-b px-6 py-4 sm:flex-row sm:items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search poster boys..."
                value={search}
                onChange={handleSearchChange}
                onSubmit={handleSearchSubmit}
                className="pl-9"
              />
            </div>
            {pagination && (
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                {pagination.total} poster boy{pagination.total !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {pendingItems.length > 0 && (
            <div className="border-b bg-amber-500/[0.04]">
              <div className="px-6 pt-4 pb-1">
                <h3 className="text-sm font-semibold text-foreground">
                  Approval Requests
                  <span className="ml-2 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold text-amber-700 dark:text-amber-400">
                    {pendingItems.length}
                  </span>
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Profile changes submitted by worker boys — review and approve or discard them here.
                </p>
              </div>
              <div className="divide-y">
                {pendingItems.map((v) => {
                  const changes = computeProfileChanges(v.profile);
                  const labels = changes.map((c) => humanizeChangeKey(c.field));
                  return (
                    <div
                      key={v._id}
                      className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs font-semibold">
                            {getInitials(v.fullName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{v.fullName}</p>
                          <p className="truncate text-sm text-muted-foreground">{v.email}</p>
                          <CopyableId id={v.publicId} />
                          <p className="mt-1 text-xs text-muted-foreground">
                            {changes.length > 0 ? (
                              <>
                                {changes.length} field{changes.length !== 1 ? "s" : ""} changed:{" "}
                                <span className="font-medium text-foreground">
                                  {labels.slice(0, 3).join(", ")}
                                  {labels.length > 3 ? ` +${labels.length - 3} more` : ""}
                                </span>
                              </>
                            ) : (
                              "Submitted changes"
                            )}
                            {v.profile?.pendingChangeAt && (
                              <> · {new Date(v.profile.pendingChangeAt).toLocaleString()}</>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 gap-1"
                          onClick={() => setViewTarget(v)}
                        >
                          <Eye className="h-4 w-4" />
                          View Changes
                        </Button>
                        <Button
                          size="sm"
                          className="h-8 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={() => openProfileConfirm(v, "approved")}
                        >
                          <CheckCircle className="h-4 w-4" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-8 gap-1"
                          onClick={() => openProfileConfirm(v, "rejected")}
                        >
                          <XCircle className="h-4 w-4" />
                          Discard
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {loading ? (
            <PageLoader text="Loading poster boys..." />
          ) : items.length === 0 ? (
            <EmptyState
              icon={Megaphone}
              title="No Poster Boys Found"
              description={
                search
                  ? "No poster boys match your search."
                  : "No poster boys have registered yet."
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Poster Boy</TableHead>
                    <TableHead className="hidden sm:table-cell">Phone</TableHead>
                    <TableHead>Profile</TableHead>
                    <TableHead className="hidden md:table-cell">Skills</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead className="hidden sm:table-cell">Joined</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((v) => (
                    <TableRow key={v._id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs font-semibold">
                              {getInitials(v.fullName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{v.fullName}</p>
                            <CopyableId id={v.publicId} />
                            <p className="text-sm text-muted-foreground truncate">{v.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">
                        {v.phone || v.whatsappNumber || "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 items-start">
                          {profileBadge(v)}
                          {v.profile?.hasPendingChange && (
                            <button
                              type="button"
                              title="Review submitted changes"
                              onClick={() => setViewTarget(v)}
                            >
                              <Badge
                                variant="outline"
                                className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px] cursor-pointer hover:bg-amber-500/20 transition-colors"
                              >
                                change pending · view
                              </Badge>
                            </button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {v.profile?.skills?.length ? (
                          <span className="text-sm text-muted-foreground">
                            {v.profile.skills.slice(0, 2).join(", ")}
                            {v.profile.skills.length > 2
                              ? ` +${v.profile.skills.length - 2}`
                              : ""}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={v.approvalStatus || "pending"} />
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">
                        {new Date(v.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setViewTarget(v)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Profile
                            </DropdownMenuItem>

                            {v.approvalStatus !== "approved" && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-emerald-600 focus:text-emerald-600"
                                  onClick={() =>
                                    setAccountConfirm({
                                      id: v._id,
                                      name: v.fullName,
                                      status: "approved",
                                    })
                                  }
                                >
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Approve Account
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() =>
                                    setAccountConfirm({
                                      id: v._id,
                                      name: v.fullName,
                                      status: "rejected",
                                    })
                                  }
                                >
                                  <XCircle className="mr-2 h-4 w-4" />
                                  Reject Account
                                </DropdownMenuItem>
                              </>
                            )}

                            {v.profile &&
                              (v.profile.status !== "approved" || v.profile.hasPendingChange) && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-emerald-600 focus:text-emerald-600"
                                  onClick={() =>
                                    setProfileConfirm({
                                      profileId: v.profile._id,
                                      userId: v._id,
                                      name: v.fullName,
                                      status: "approved",
                                      pending: v.profile.hasPendingChange,
                                    })
                                  }
                                >
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  {v.profile.hasPendingChange
                                    ? "Approve Changes"
                                    : "Approve Profile"}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() =>
                                    setProfileConfirm({
                                      profileId: v.profile._id,
                                      userId: v._id,
                                      name: v.fullName,
                                      status: "rejected",
                                      pending: v.profile.hasPendingChange,
                                    })
                                  }
                                >
                                  <XCircle className="mr-2 h-4 w-4" />
                                  {v.profile.hasPendingChange
                                    ? "Discard Changes"
                                    : "Reject Profile"}
                                </DropdownMenuItem>
                              </>
                            )}

                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleToggle(v._id)}
                              disabled={actionLoading === v._id}
                            >
                              {actionLoading === v._id ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : v.isActive ? (
                                <UserX className="mr-2 h-4 w-4" />
                              ) : (
                                <UserCheck className="mr-2 h-4 w-4" />
                              )}
                              {v.isActive ? "Deactivate" : "Activate"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setDeleteTarget(v)}
                              disabled={actionLoading === v._id}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {pagination && pagination.pages > 1 && (
                <div className="flex items-center justify-between border-t px-6 py-4">
                  <p className="text-sm text-muted-foreground">
                    Page {pagination.page} of {pagination.pages}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page >= pagination.pages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Profile detail (vendor-style shared dialog) */}
      <PosterBoyViewDialog
        open={!!viewTarget}
        onOpenChange={(open) => { if (!open) setViewTarget(null); }}
        worker={viewTarget}
        title={viewTarget?.fullName}
        description="Poster boy profile submitted for admin approval."
        showActions={!!(
          viewTarget?.profile &&
          (viewTarget.profile.status !== "approved" || viewTarget.profile.hasPendingChange)
        )}
        actionLoading={actionLoading2}
        onApprove={(w) => {
          if (!w?.profile) return;
          setProfileConfirm({
            profileId: w.profile._id,
            userId: w._id,
            name: w.fullName,
            status: "approved",
            pending: w.profile.hasPendingChange,
          });
          setViewTarget(null);
        }}
        onReject={(w) => {
          if (!w?.profile) return;
          setProfileConfirm({
            profileId: w.profile._id,
            userId: w._id,
            name: w.fullName,
            status: "rejected",
            pending: w.profile.hasPendingChange,
          });
          setViewTarget(null);
        }}
      />

      {/* Delete */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Poster Boy</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.fullName}</strong> and
              their work profile? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleteLoading}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={deleteLoading}>
              {deleteLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Account approval */}
      <Dialog
        open={!!accountConfirm}
        onOpenChange={(open) => !open && setAccountConfirm(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {accountConfirm?.status === "approved"
                ? "Approve Poster Boy Account"
                : "Reject Poster Boy Account"}
            </DialogTitle>
            <DialogDescription>
              {accountConfirm?.status === "approved"
                ? `Approve "${accountConfirm?.name}"? They will get access to their Poster Boy dashboard.`
                : `Reject "${accountConfirm?.name}"? They will not be able to log in.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAccountConfirm(null)} disabled={actionLoading2}>
              Cancel
            </Button>
            <Button
              variant={accountConfirm?.status === "approved" ? "default" : "destructive"}
              onClick={handleAccountAction}
              disabled={actionLoading2}
            >
              {actionLoading2 && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {accountConfirm?.status === "approved" ? "Approve" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Profile approval */}
      <Dialog
        open={!!profileConfirm}
        onOpenChange={(open) => !open && setProfileConfirm(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {profileConfirm?.status === "approved"
                ? profileConfirm?.pending
                  ? "Approve Profile Changes"
                  : "Approve Poster Boy Profile"
                : profileConfirm?.pending
                ? "Discard Profile Changes"
                : "Reject Poster Boy Profile"}
            </DialogTitle>
            <DialogDescription>
              {profileConfirm?.status === "approved"
                ? profileConfirm?.pending
                  ? `Apply the latest changes submitted by "${profileConfirm?.name}"?`
                  : `Approve the work profile of "${profileConfirm?.name}"?`
                : profileConfirm?.pending
                ? `Discard the pending changes from "${profileConfirm?.name}"? The currently approved profile stays as it is.`
                : `Reject the work profile of "${profileConfirm?.name}"? They can edit and resubmit.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProfileConfirm(null)} disabled={actionLoading2}>
              Cancel
            </Button>
            <Button
              variant={profileConfirm?.status === "approved" ? "default" : "destructive"}
              onClick={handleProfileAction}
              disabled={actionLoading2}
            >
              {actionLoading2 && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {profileConfirm?.status === "approved" ? "Approve" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPosterBoys;
