"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Award, CheckCircle2, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { updateBusinessTrustScore } from "../../services/adminService";

/**
 * ADMIN-only Brand Recall / Trust Score editor for a single business.
 *
 * `businesses` is an array of `{ _id, name, brandRecallScore }`:
 *  - exactly one entry → the score editor opens straight away,
 *  - more than one    → the admin picks which business to score first.
 *
 * The score is optional: 0–10, decimals allowed. Leaving the input blank and
 * saving means "no score assigned".
 */
const TRUST_SCORE_PATTERN = /^(\d+(\.\d*)?|\.\d+)$/;

const formatScore = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Number.isInteger(n) ? String(n) : String(n);
};

const parseScore = (raw) => {
  const v = String(raw == null ? "" : raw).trim();
  if (v === "") return { ok: true, value: null }; // blank = no score assigned
  if (!TRUST_SCORE_PATTERN.test(v)) {
    return { ok: false, message: "Enter a valid score, e.g. 8.5" };
  }
  const n = Number(v);
  if (!Number.isFinite(n)) {
    return { ok: false, message: "Enter a valid score, e.g. 8.5" };
  }
  if (n < 0 || n > 10) {
    return { ok: false, message: "Score must be between 0 and 10" };
  }
  return { ok: true, value: n };
};

const TrustScoreDialog = ({ open, onOpenChange, businesses = [], onSaved }) => {
  const list = Array.isArray(businesses) ? businesses : [];
  const [selectedId, setSelectedId] = useState(null);
  const [scoreInput, setScoreInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const selected =
    list.length === 1 ? list[0] : list.find((b) => b._id === selectedId) || null;

  // Reset every time the dialog is opened.
  useEffect(() => {
    if (!open) return;
    setSelectedId(list.length === 1 && list[0] ? list[0]._id : null);
    setScoreInput("");
    setError("");
    setSuccess("");
    setSaving(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Prefill with the currently assigned score of the chosen business.
  // Depends only on `open` / `selectedId` so a background list refresh after a
  // successful save does not wipe the success message or the typed value.
  useEffect(() => {
    if (!open) return;
    const target =
      list.length === 1 ? list[0] : list.find((b) => b._id === selectedId);
    if (!target) return;
    const current = formatScore(target.brandRecallScore);
    setScoreInput(current === null ? "" : current);
    setError("");
    setSuccess("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, selectedId]);

  const currentScore = selected ? formatScore(selected.brandRecallScore) : null;

  const finish = (message, value) => {
    setSuccess(message);
    setError("");
    if (typeof onSaved === "function") {
      onSaved({ businessId: selected._id, brandRecallScore: value });
    }
  };

  const handleSave = async () => {
    if (!selected) {
      setError("Select a business first");
      return;
    }
    const parsed = parseScore(scoreInput);
    if (!parsed.ok) {
      setError(parsed.message);
      setSuccess("");
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await updateBusinessTrustScore(selected._id, parsed.value);
      finish(
        res?.message ||
          (parsed.value === null
            ? "Trust score removed"
            : `Trust score ${parsed.value}/10 saved`),
        parsed.value
      );
    } catch (err) {
      setError(err?.response?.data?.message || "Could not save the trust score");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!selected || currentScore === null) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await updateBusinessTrustScore(selected._id, null);
      finish(res?.message || "Trust score removed", null);
    } catch (err) {
      setError(err?.response?.data?.message || "Could not remove the trust score");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onOpenChange(false); }}>
      <DialogContent className="w-[calc(100%-1.5rem)] max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 pr-6">
            <Award className="h-4 w-4 text-amber-500 shrink-0" />
            Set Trust Score
          </DialogTitle>
          <DialogDescription>
            Optional Brand Recall / Trust Score from 0 to 10 for an individual
            business. Decimals are allowed, e.g. 8.5.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {list.length === 0 && (
            <p className="text-sm text-muted-foreground">
              This vendor has no businesses yet.
            </p>
          )}

          {/* Vendor row → pick which of their businesses to score */}
          {list.length > 1 && (
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Business</Label>
              <div className="space-y-2 max-h-44 overflow-y-auto rounded-md border border-border p-2">
                {list.map((b) => (
                  <label
                    key={b._id}
                    className={`flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm cursor-pointer transition-colors ${
                      selectedId === b._id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <input
                        type="radio"
                        name="trust-score-business"
                        checked={selectedId === b._id}
                        onChange={() => setSelectedId(b._id)}
                        className="accent-primary h-3.5 w-3.5 shrink-0"
                      />
                      <span className="truncate">{b.name}</span>
                    </span>
                    <span className="shrink-0 text-xs font-semibold text-muted-foreground">
                      {formatScore(b.brandRecallScore) !== null
                        ? `${formatScore(b.brandRecallScore)}/10`
                        : "No score"}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {list.length === 1 && selected && (
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Business</Label>
              <p className="rounded-md border border-border bg-muted/50 px-3 py-2 text-sm font-medium break-words">
                {selected.name}
              </p>
            </div>
          )}

          {list.length > 1 && !selected && (
            <p className="text-sm text-muted-foreground">
              Select a business to set its trust score.
            </p>
          )}

          {selected && (
            <>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Current Trust Score</Label>
                <p className="text-sm text-muted-foreground">
                  {currentScore !== null ? (
                    <span className="font-semibold text-foreground">
                      {currentScore}/10
                    </span>
                  ) : (
                    "Not assigned"
                  )}
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="trustScoreInput" className="text-sm font-medium">
                  New Trust Score
                </Label>
                <Input
                  id="trustScoreInput"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="e.g. 8.5 (blank = no score)"
                  value={scoreInput}
                  onChange={(e) => {
                    setScoreInput(e.target.value);
                    setError("");
                    setSuccess("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSave();
                    }
                  }}
                  className={error ? "border-destructive" : ""}
                  disabled={saving}
                />
                <p className="text-xs text-muted-foreground">
                  Range 0–10, decimals allowed. Leave blank to keep no score.
                </p>
              </div>
            </>
          )}

          {error && (
            <p className="flex items-start gap-1.5 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              {error}
            </p>
          )}

          {success && (
            <p className="flex items-start gap-1.5 text-sm text-emerald-600">
              <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
              {success}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            {currentScore !== null && success ? "Close" : "Cancel"}
          </Button>
          {selected && currentScore !== null && (
            <Button
              type="button"
              variant="destructive"
              onClick={handleRemove}
              disabled={saving}
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Remove Score
            </Button>
          )}
          <Button type="button" onClick={handleSave} disabled={saving || !selected}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TrustScoreDialog;
