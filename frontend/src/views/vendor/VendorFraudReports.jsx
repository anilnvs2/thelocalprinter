"use client";
import { useState, useEffect, useCallback } from "react";
import {
  Search,
  AlertTriangle,
  X,
  ShieldAlert,
  ShieldCheck,
  Phone,
  User,
  Plus,
  Loader2,
  CheckCircle,
} from "lucide-react";
import { getFraudReports, addFraudReport } from "../../services/vendorService";
import { PageHeader } from "../../components/shared/page-header";
import { EmptyState } from "../../components/shared/empty-state";
import { PageLoader } from "../../components/shared/page-loader";
import { TablePagination } from "../../components/admin/SharedComponents";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Label } from "../../components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";

const SEARCH_DEBOUNCE_MS = 400;

const VendorFraudReports = () => {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [reports, setReports] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [searchMeta, setSearchMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Vendor self-submission dialog.
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ contactName: "", designation: "", contactNumber: "" });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");

  // Debounce the raw input so the API is hit once the vendor pauses typing.
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // A new query always restarts from page 1.
  useEffect(() => {
    setPage(1);
  }, [search]);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getFraudReports({ page, search });
      setReports(res.data.reports);
      setPagination(res.data.pagination);
      setSearchMeta(res.data.search || null);
    } catch (err) {
      // On failure we must never claim a contact is "not on the fraud list" —
      // the error banner is shown instead and results are left untouched.
      setError(err.response?.data?.message || "Failed to load fraud reports");
      setReports([]);
      setPagination(null);
      setSearchMeta(null);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const isNumberSearch = searchMeta?.type === "number";
  const hasQuery = !!search;
  const totalMatches = searchMeta?.totalMatches ?? 0;

  const verdict = hasQuery && !loading && !error
    ? isNumberSearch
      ? totalMatches > 0
        ? { ok: true, text: "This number is on the fraud list." }
        : { ok: false, text: "This number is not on the fraud list." }
      : totalMatches > 0
        ? { ok: true, text: "This name is on the fraud list." }
        : { ok: false, text: "This name is not on the fraud list." }
    : null;

  const clearSearch = () => setSearchInput("");

  const openAdd = () => {
    setForm({ contactName: "", designation: "", contactNumber: "" });
    setSaveError("");
    setSaveSuccess("");
    setAddOpen(true);
  };

  const setField = (field, value) => setForm((p) => ({ ...p, [field]: value }));

  const handleAdd = async () => {
    const entry = {
      contactName: form.contactName.trim(),
      designation: form.designation.trim(),
      contactNumber: form.contactNumber.trim(),
    };
    if (!entry.contactName && !entry.designation && !entry.contactNumber) {
      setSaveError("Provide at least a contact name, designation or number");
      return;
    }
    setSaving(true);
    setSaveError("");
    try {
      const res = await addFraudReport(entry);
      setSaveSuccess(res.message || "Fraud report added to the shared hotlist");
      // Refresh the list so the new row shows immediately.
      fetchReports();
      setTimeout(() => setAddOpen(false), 1200);
    } catch (err) {
      setSaveError(err.response?.data?.message || "Failed to add fraud report");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Fraud / Hotlist Report"
        description="Search the shared hotlist of reported contacts before dealing with a new client or supplier."
        actions={
          <Button onClick={openAdd} className="gap-2">
            <Plus size={16} /> Add Report
          </Button>
        }
      />

      <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 text-amber-600 text-sm">
        <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
        <span>
          Reports are shared with authorized vendors only — never shown to public users.
        </span>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b space-y-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by contact name or contact number..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9 pr-9"
              />
              {searchInput && (
                <button
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Clear search"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {verdict && (
              <div
                className={
                  verdict.ok
                    ? "flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400"
                    : "flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-600 dark:text-emerald-400"
                }
              >
                {verdict.ok ? (
                  <ShieldAlert size={16} className="flex-shrink-0" />
                ) : (
                  <ShieldCheck size={16} className="flex-shrink-0" />
                )}
                <span>{verdict.text}</span>
              </div>
            )}

            {hasQuery && !loading && !error && (
              <p className="text-xs text-muted-foreground">
                {totalMatches} matching fraud {totalMatches === 1 ? "report" : "reports"} found across all reported businesses.
              </p>
            )}
          </div>

          {loading ? (
            <div className="p-6">
              <PageLoader />
            </div>
          ) : error ? (
            <div className="p-6">
              <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <AlertTriangle size={16} className="flex-shrink-0" />
                <span>{error}</span>
              </div>
            </div>
          ) : reports.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={AlertTriangle}
                title={hasQuery ? "No Matching Reports" : "No Fraud Reports Yet"}
                description={
                  hasQuery
                    ? "No fraud / hotlist report matches this contact name or number."
                    : "No fraud / hotlist reports have been submitted yet."
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contact Name</TableHead>
                    <TableHead className="hidden sm:table-cell">Designation</TableHead>
                    <TableHead>Contact Number</TableHead>
                    <TableHead className="hidden md:table-cell">Reported Under</TableHead>
                    <TableHead className="hidden lg:table-cell">Reported On</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((r) => (
                    <TableRow key={r.reportId}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User size={14} className="text-muted-foreground flex-shrink-0" />
                          <div>
                            <p className="text-sm font-semibold text-foreground">{r.contactName || "-"}</p>
                            <p className="text-xs text-muted-foreground sm:hidden">{r.designation || "-"}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                        {r.designation ? <Badge variant="secondary">{r.designation}</Badge> : "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm font-mono text-foreground">
                          <Phone size={14} className="text-muted-foreground flex-shrink-0" />
                          {r.contactNumber || "-"}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {r.businessName || "-"}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {!loading && !error && pagination && (
            <TablePagination pagination={pagination} onPageChange={setPage} />
          )}
        </CardContent>
      </Card>

      <Dialog open={addOpen} onOpenChange={(open) => !saving && setAddOpen(open)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Fraud Report</DialogTitle>
            <DialogDescription>
              Report a contact to the shared hotlist. It is visible to all vendors immediately.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {saveError && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <AlertTriangle size={14} className="flex-shrink-0" />
                <span>{saveError}</span>
              </div>
            )}
            {saveSuccess && (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600 dark:text-emerald-400">
                <CheckCircle size={14} className="flex-shrink-0" />
                <span>{saveSuccess}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="contactName">Contact Name</Label>
              <Input
                id="contactName"
                value={form.contactName}
                onChange={(e) => setField("contactName", e.target.value)}
                placeholder="Name of the person to report"
                disabled={saving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="designation">Designation</Label>
              <Input
                id="designation"
                value={form.designation}
                onChange={(e) => setField("designation", e.target.value)}
                placeholder="e.g. Manager, Owner"
                disabled={saving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactNumber">Contact Number</Label>
              <Input
                id="contactNumber"
                value={form.contactNumber}
                onChange={(e) => setField("contactNumber", e.target.value)}
                placeholder="e.g. +91 98765 43210"
                disabled={saving}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 size={16} className="animate-spin mr-2" /> Adding...
                </>
              ) : (
                "Add Report"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VendorFraudReports;
