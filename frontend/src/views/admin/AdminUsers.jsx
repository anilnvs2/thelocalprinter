"use client";

import { useState, useEffect, useRef } from "react";
import {
  Search,
  Trash2,
  Eye,
  Pencil,
  Loader2,
  MoreHorizontal,
  Users,
  UserCheck,
  UserX,
  Mail,
  Phone,
  Calendar,
  Shield,
  Building2,
  FileText,
} from "lucide-react";
import {
  getUsers,
  toggleUserStatus,
  deleteUser,
} from "../../services/adminService";
import { PageHeader } from "../../components/shared/page-header";
import { StatusBadge } from "../../components/shared/status-badge";
import { EmptyState } from "../../components/shared/empty-state";
import { PageLoader } from "../../components/shared/page-loader";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
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
import { ScrollArea } from "../../components/ui/scroll-area";
import { Separator } from "../../components/ui/separator";
import CopyableId from "../../components/admin/CopyableId";

const BUSINESS_TYPE_LABELS = {
  PERSONAL_USE: "Personal Use",
  BUSINESS_PURPOSE: "Business Purpose",
  RESELLER: "Reseller",
};

const BUSINESS_TYPE_COLORS = {
  PERSONAL_USE: "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400",
  BUSINESS_PURPOSE: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  RESELLER: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
};

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [viewTarget, setViewTarget] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);
  const debounceRef = useRef(null);

  const fetchUsers = async (p = 1, s = "") => {
    setLoading(true);
    setError("");
    try {
      const res = await getUsers(p, s);
      setUsers(res.data.users);
      setPagination(res.data.pagination);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(page, search);
  }, [page]);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchUsers(1, value);
    }, 400);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setPage(1);
    fetchUsers(1, search);
  };

  const handleToggle = async (id) => {
    try {
      setActionLoading(id);
      setError("");
      const res = await toggleUserStatus(id);
      setUsers((prev) =>
        prev.map((u) => (u._id === id ? { ...u, isActive: res.data.user.isActive } : u))
      );
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update user status");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      setDeleteLoading(true);
      setError("");
      await deleteUser(deleteTarget._id);
      setUsers((prev) => prev.filter((u) => u._id !== deleteTarget._id));
      if (pagination) {
        const newTotal = pagination.total - 1;
        const newPages = Math.ceil(newTotal / pagination.limit);
        setPagination((prev) => ({ ...prev, total: newTotal, pages: newPages }));
        if (page > newPages && newPages > 0) setPage(newPages);
      }
      setDeleteTarget(null);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete user");
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

  const getEffectiveStatus = (u) => {
    // A reseller account is only "approved" once the admin has approved the
    // reseller application; until then the row shows PENDING.
    if (u.registrationType === "RESELLER" && u.resellerApprovalStatus) {
      return u.resellerApprovalStatus.toLowerCase();
    }
    return u.approvalStatus || "approved";
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Manage all registered users including Personal Use, Business Purpose, and Reseller accounts."
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
          <div className="flex flex-col gap-3 border-b px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or public ID..."
                  value={search}
                  onChange={handleSearchChange}
                  onSubmit={handleSearchSubmit}
                  className="pl-9"
                />
              </div>
            </div>
            {pagination && (
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                {pagination.total} user{pagination.total !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {loading ? (
            <PageLoader text="Loading users..." />
          ) : users.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No Users Found"
              description={
                search
                  ? "No users match your search."
                  : "No users have registered yet."
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead className="hidden sm:table-cell">Public ID</TableHead>
                    <TableHead className="hidden md:table-cell">Business Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden sm:table-cell">Joined</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u._id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs font-semibold">
                              {getInitials(u.fullName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium truncate max-w-[180px]">{u.fullName}</p>
                            <p className="text-sm text-muted-foreground truncate max-w-[180px]">
                              {u.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <CopyableId id={u.publicId} />
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {u.registrationType ? (
                          <Badge
                            variant="secondary"
                            className={`font-normal ${BUSINESS_TYPE_COLORS[u.registrationType] || ""}`}
                          >
                            {BUSINESS_TYPE_LABELS[u.registrationType] || u.registrationType}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={getEffectiveStatus(u)} />
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">
                        {new Date(u.createdAt).toLocaleDateString()}
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
                            <DropdownMenuItem onClick={() => setViewTarget(u)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleToggle(u._id)}
                              disabled={actionLoading === u._id}
                            >
                              {actionLoading === u._id ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : u.isActive ? (
                                <UserX className="mr-2 h-4 w-4" />
                              ) : (
                                <UserCheck className="mr-2 h-4 w-4" />
                              )}
                              {u.isActive ? "Deactivate" : "Activate"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setDeleteTarget(u)}
                              disabled={actionLoading === u._id}
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

      {/* View User Dialog */}
      <Dialog open={!!viewTarget} onOpenChange={(open) => !open && setViewTarget(null)}>
        <DialogContent className="max-w-2xl h-full max-h-[calc(100vh-40px)] p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-lg truncate">{viewTarget?.fullName || "User Details"}</DialogTitle>
                {viewTarget && (
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <StatusBadge status={getEffectiveStatus(viewTarget)} />
                    {viewTarget.registrationType && (
                      <Badge
                        variant="secondary"
                        className={`text-xs font-normal ${BUSINESS_TYPE_COLORS[viewTarget.registrationType] || ""}`}
                      >
                        {BUSINESS_TYPE_LABELS[viewTarget.registrationType] || viewTarget.registrationType}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </div>
          </DialogHeader>

          <ScrollArea className="flex-1 min-h-0">
            <div className="px-6 py-5 space-y-6">
              {viewTarget && (
                <>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                        Account Information
                      </h3>
                    </div>
                    <div className="rounded-lg border bg-muted/30 p-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-0.5 min-w-0">
                          <p className="text-xs text-muted-foreground">Full Name</p>
                          <p className="text-sm text-foreground break-words">{viewTarget.fullName}</p>
                        </div>
                        <div className="space-y-0.5 min-w-0">
                          <p className="text-xs text-muted-foreground">Email</p>
                          <p className="text-sm text-foreground break-all">{viewTarget.email}</p>
                        </div>
                        <div className="space-y-0.5 min-w-0">
                          <p className="text-xs text-muted-foreground">Public ID</p>
                          <CopyableId id={viewTarget.publicId} />
                        </div>
                        <div className="space-y-0.5 min-w-0">
                          <p className="text-xs text-muted-foreground">Phone</p>
                          <p className="text-sm text-foreground break-words">{viewTarget.phone || "Not provided"}</p>
                        </div>
                        <div className="space-y-0.5 min-w-0">
                          <p className="text-xs text-muted-foreground">WhatsApp</p>
                          <p className="text-sm text-foreground break-words">{viewTarget.whatsappNumber || "Not provided"}</p>
                        </div>
                        <div className="space-y-0.5 min-w-0">
                          <p className="text-xs text-muted-foreground">Role</p>
                          <p className="text-sm text-foreground">{viewTarget.role}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                        Business Type & Status
                      </h3>
                    </div>
                    <div className="rounded-lg border bg-muted/30 p-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-0.5 min-w-0">
                          <p className="text-xs text-muted-foreground">Business Type</p>
                          {viewTarget.registrationType ? (
                            <Badge
                              variant="secondary"
                              className={`font-normal ${BUSINESS_TYPE_COLORS[viewTarget.registrationType] || ""}`}
                            >
                              {BUSINESS_TYPE_LABELS[viewTarget.registrationType] || viewTarget.registrationType}
                            </Badge>
                          ) : (
                            <p className="text-sm text-muted-foreground italic">Not set</p>
                          )}
                        </div>
                        <div className="space-y-0.5 min-w-0">
                          <p className="text-xs text-muted-foreground">Approval Status</p>
                          <StatusBadge status={getEffectiveStatus(viewTarget)} />
                        </div>
                        <div className="space-y-0.5 min-w-0">
                          <p className="text-xs text-muted-foreground">Account Active</p>
                          <Badge variant={viewTarget.isActive ? "default" : "secondary"}>
                            {viewTarget.isActive ? "Yes" : "No"}
                          </Badge>
                        </div>
                        {viewTarget.resellerApprovalStatus && (
                          <div className="space-y-0.5 min-w-0">
                            <p className="text-xs text-muted-foreground">Reseller Approval</p>
                            <StatusBadge status={viewTarget.resellerApprovalStatus.toLowerCase()} />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                        Timeline
                      </h3>
                    </div>
                    <div className="rounded-lg border bg-muted/30 p-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-0.5 min-w-0">
                          <p className="text-xs text-muted-foreground">Created</p>
                          <p className="text-sm text-foreground break-words">
                            {viewTarget.createdAt
                              ? new Date(viewTarget.createdAt).toLocaleString()
                              : "Unknown"}
                          </p>
                        </div>
                        {viewTarget.updatedAt && (
                          <div className="space-y-0.5 min-w-0">
                            <p className="text-xs text-muted-foreground">Updated</p>
                            <p className="text-sm text-foreground break-words">
                              {new Date(viewTarget.updatedAt).toLocaleString()}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.fullName}</strong>? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleteLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteLoading}
            >
              {deleteLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsers;
