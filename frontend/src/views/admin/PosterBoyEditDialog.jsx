"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Loader2, Plus, Trash2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Button } from "../../components/ui/button";
import { adminUpdatePosterBoy } from "../../services/adminService";

const LANGUAGE_OPTIONS = [
  "English", "Hindi", "Telugu", "Tamil", "Kannada",
  "Malayalam", "Marathi", "Gujarati", "Bengali", "Punjabi",
];

const SKILL_OPTIONS = [
  "Newspaper Inserts",
  "Pasting Boy",
  "Safety Belt Worker",
  "Reckoning Boy",
  "Installation Boy",
  "Distribution Boy",
];

const WORK_RADIUS_OPTIONS = ["10 km to 30 km", "No Limit"];
const STRENGTH_OPTIONS = ["Single Person", "Team"];
const ORDER_ACCEPTED_OPTIONS = ["Small", "Medium", "Bulk", "No Limit"];
const BOOKING_TIMELINE_OPTIONS = ["1 day prior", "2 days prior", "Sameday"];
const WORK_TIMING_OPTIONS = ["Day Only", "Day & Night"];

const Field = ({ label, required, error, hint, children }) => (
  <div className="space-y-1.5">
    <Label className="text-sm font-medium">
      {label} {required && <span className="text-destructive">*</span>}
    </Label>
    {children}
    {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
    {error && <p className="text-xs font-medium text-destructive">{error}</p>}
  </div>
);

const CheckboxGrid = ({ options, selected, onChange }) => {
  const toggle = (val) => {
    onChange(selected.includes(val) ? selected.filter((v) => v !== val) : [...selected, val]);
  };
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {options.map((opt) => (
        <label
          key={opt}
          className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 text-sm transition-all ${
            selected.includes(opt)
              ? "border-primary bg-primary/5 text-foreground"
              : "border-border text-muted-foreground hover:bg-muted/50"
          }`}
        >
          <input
            type="checkbox"
            checked={selected.includes(opt)}
            onChange={() => toggle(opt)}
            className="h-3.5 w-3.5 accent-primary"
          />
          <span>{opt}</span>
        </label>
      ))}
    </div>
  );
};

const RadioGrid = ({ name, options, value, onChange }) => (
  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
    {options.map((opt) => (
      <label
        key={opt}
        className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 text-sm transition-all ${
          value === opt
            ? "border-primary bg-primary/5 text-foreground"
            : "border-border text-muted-foreground hover:bg-muted/50"
        }`}
      >
        <input
          type="radio"
          name={name}
          checked={value === opt}
          onChange={() => onChange(opt)}
          className="h-3.5 w-3.5 accent-primary"
        />
        <span>{opt}</span>
      </label>
    ))}
  </div>
);

const TagInput = ({ tags, onChange, placeholder }) => {
  const [input, setInput] = useState("");
  const addTag = () => {
    const val = input.trim();
    if (val && !tags.includes(val)) onChange([...tags, val]);
    setInput("");
  };
  return (
    <div className="space-y-2">
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground"
            >
              {tag}
              <button type="button" onClick={() => onChange(tags.filter((t) => t !== tag))}>
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTag();
            }
          }}
          placeholder={placeholder || "Type and press Enter"}
          className="flex-1"
        />
        <Button type="button" variant="outline" size="sm" onClick={addTag}>
          Add
        </Button>
      </div>
    </div>
  );
};

const emptyForm = {
  fullName: "",
  email: "",
  phone: "",
  whatsappNumber: "",
  aadhaarNumber: "",
  languages: [],
  address: "",
  city: "",
  skills: [],
  workRadius: "",
  strength: "",
  orderAccepted: [],
  bookingTimeline: "",
  workTiming: "",
  workMedia: [],
};

const PosterBoyEditDialog = ({ open, onOpenChange, worker, onSaved }) => {
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaType, setMediaType] = useState("image");

  useEffect(() => {
    if (!open || !worker) return;
    const p = worker.profile || {};
    setForm({
      fullName: worker.fullName || "",
      email: worker.email || "",
      phone: worker.phone || "",
      whatsappNumber: worker.whatsappNumber || "",
      aadhaarNumber: p.aadhaarNumber || "",
      languages: Array.isArray(p.languages) ? p.languages : [],
      address: p.address || "",
      city: p.city || "",
      skills: Array.isArray(p.skills) ? p.skills : [],
      workRadius: p.workRadius || "",
      strength: p.strength || "",
      orderAccepted: Array.isArray(p.orderAccepted) ? p.orderAccepted : [],
      bookingTimeline: p.bookingTimeline || "",
      workTiming: p.workTiming || "",
      workMedia: Array.isArray(p.workMedia) ? p.workMedia.map((m) => ({ ...m })) : [],
    });
    setErrors({});
    setError("");
    setSaving(false);
    setMediaUrl("");
    setMediaType("image");
  }, [open, worker]);

  const setField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
    setError("");
  };

  const addMedia = () => {
    const url = mediaUrl.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) {
      setErrors((prev) => ({ ...prev, workMedia: "Media URL must start with http:// or https://" }));
      return;
    }
    setField("workMedia", [...form.workMedia, { url, resourceType: mediaType }]);
    setMediaUrl("");
  };

  const removeMedia = (index) => {
    setField("workMedia", form.workMedia.filter((_, i) => i !== index));
  };

  const validate = () => {
    const e = {};
    if (form.fullName.trim().length < 2) e.fullName = "Full name must be at least 2 characters";
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) e.email = "Please enter a valid email";
    if (!/^\d{12}$/.test(form.aadhaarNumber)) e.aadhaarNumber = "Aadhaar number must be exactly 12 digits";
    if (form.languages.length < 1) e.languages = "Please add at least one language";
    if (form.address.trim().length < 5) e.address = "Address must be at least 5 characters";
    else if (form.address.trim().length > 300) e.address = "Address must be at most 300 characters";
    if (form.skills.length < 1) e.skills = "Please add at least one skill";
    if (!WORK_RADIUS_OPTIONS.includes(form.workRadius)) e.workRadius = "Please select a work radius";
    if (!STRENGTH_OPTIONS.includes(form.strength)) e.strength = "Please select strength";
    if (form.orderAccepted.length < 1) e.orderAccepted = "Please select at least one order size";
    if (!BOOKING_TIMELINE_OPTIONS.includes(form.bookingTimeline)) e.bookingTimeline = "Please select a booking timeline";
    if (!WORK_TIMING_OPTIONS.includes(form.workTiming)) e.workTiming = "Please select timings";
    if (form.workMedia.length < 1) e.workMedia = "At least one work photo or video is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!worker) return;
    setError("");
    if (!validate()) return;
    setSaving(true);
    try {
      const res = await adminUpdatePosterBoy(worker._id, {
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        whatsappNumber: form.whatsappNumber.trim(),
        profile: {
          aadhaarNumber: form.aadhaarNumber.trim(),
          languages: form.languages,
          address: form.address.trim(),
          city: form.city.trim(),
          skills: form.skills,
          workRadius: form.workRadius,
          strength: form.strength,
          orderAccepted: form.orderAccepted,
          bookingTimeline: form.bookingTimeline,
          workTiming: form.workTiming,
          workMedia: form.workMedia,
        },
      });
      const data = res.data || {};
      const updated = {
        ...worker,
        fullName: data.user?.fullName ?? worker.fullName,
        email: data.user?.email ?? worker.email,
        phone: data.user?.phone ?? worker.phone,
        whatsappNumber: data.user?.whatsappNumber ?? worker.whatsappNumber,
        profile: data.profile ?? worker.profile,
      };
      onSaved?.(updated);
      onOpenChange(false);
    } catch (err) {
      const data = err.response?.data;
      if (Array.isArray(data?.errors)) {
        const map = {};
        data.errors.forEach((x) => {
          if (x?.field) map[x.field] = x.message;
        });
        setErrors(map);
      }
      setError(data?.message || "Could not update the poster boy");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !saving && onOpenChange(v)}>
      <DialogContent className="max-h-[90vh] w-[calc(100%-1.5rem)] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Poster Boy</DialogTitle>
          <DialogDescription>
            Admin edits are saved immediately and replace the live profile. Any pending worker change is discarded.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Account</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Full Name" required error={errors.fullName}>
                <Input value={form.fullName} onChange={(e) => setField("fullName", e.target.value)} />
              </Field>
              <Field label="Email" required error={errors.email}>
                <Input type="email" value={form.email} onChange={(e) => setField("email", e.target.value)} />
              </Field>
              <Field label="Phone">
                <Input value={form.phone} onChange={(e) => setField("phone", e.target.value)} />
              </Field>
              <Field label="WhatsApp">
                <Input value={form.whatsappNumber} onChange={(e) => setField("whatsappNumber", e.target.value)} />
              </Field>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Profile</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Aadhaar Number" required error={errors.aadhaarNumber} hint="12 digits, no spaces">
                <Input
                  inputMode="numeric"
                  maxLength={12}
                  value={form.aadhaarNumber}
                  onChange={(e) => setField("aadhaarNumber", e.target.value.replace(/\D/g, ""))}
                />
              </Field>
              <Field label="City">
                <Input value={form.city} onChange={(e) => setField("city", e.target.value)} />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Address" required error={errors.address}>
                  <Textarea rows={2} value={form.address} onChange={(e) => setField("address", e.target.value)} />
                </Field>
              </div>
            </div>

            <Field label="Languages" required error={errors.languages}>
              <TagInput
                tags={form.languages}
                onChange={(v) => setField("languages", v)}
                placeholder="Add a language"
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {LANGUAGE_OPTIONS.filter((l) => !form.languages.includes(l)).map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setField("languages", [...form.languages, l])}
                    className="rounded-full border px-2.5 py-0.5 text-xs text-muted-foreground hover:bg-muted"
                  >
                    + {l}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Skills" required error={errors.skills}>
              <TagInput tags={form.skills} onChange={(v) => setField("skills", v)} placeholder="Add a skill" />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {SKILL_OPTIONS.filter((s) => !form.skills.includes(s)).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setField("skills", [...form.skills, s])}
                    className="rounded-full border px-2.5 py-0.5 text-xs text-muted-foreground hover:bg-muted"
                  >
                    + {s}
                  </button>
                ))}
              </div>
            </Field>
          </section>

          <section className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Work Preferences</h3>
            <Field label="Work Radius" required error={errors.workRadius}>
              <RadioGrid
                name="admin-workRadius"
                options={WORK_RADIUS_OPTIONS}
                value={form.workRadius}
                onChange={(v) => setField("workRadius", v)}
              />
            </Field>
            <Field label="Strength" required error={errors.strength}>
              <RadioGrid
                name="admin-strength"
                options={STRENGTH_OPTIONS}
                value={form.strength}
                onChange={(v) => setField("strength", v)}
              />
            </Field>
            <Field label="Order Accepted" required error={errors.orderAccepted}>
              <CheckboxGrid
                options={ORDER_ACCEPTED_OPTIONS}
                selected={form.orderAccepted}
                onChange={(v) => setField("orderAccepted", v)}
              />
            </Field>
            <Field label="Booking Timeline" required error={errors.bookingTimeline}>
              <RadioGrid
                name="admin-bookingTimeline"
                options={BOOKING_TIMELINE_OPTIONS}
                value={form.bookingTimeline}
                onChange={(v) => setField("bookingTimeline", v)}
              />
            </Field>
            <Field label="Timings" required error={errors.workTiming}>
              <RadioGrid
                name="admin-workTiming"
                options={WORK_TIMING_OPTIONS}
                value={form.workTiming}
                onChange={(v) => setField("workTiming", v)}
              />
            </Field>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Work Media</h3>
            <Field label="Photos / Videos" required error={errors.workMedia} hint="At least one file is required">
              {form.workMedia.length > 0 ? (
                <div className="space-y-2">
                  {form.workMedia.map((m, i) => (
                    <div
                      key={`${m.url}-${i}`}
                      className="flex items-center gap-3 rounded-md border bg-muted/30 p-2"
                    >
                      {m.resourceType === "video" ? (
                        <video src={m.url} className="h-12 w-12 rounded object-cover" muted />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.url} alt="" className="h-12 w-12 rounded object-cover" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs text-muted-foreground">{m.url}</p>
                        <p className="text-[11px] uppercase text-muted-foreground">{m.resourceType}</p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => removeMedia(i)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm italic text-muted-foreground">No work media added.</p>
              )}
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  value={mediaUrl}
                  onChange={(e) => {
                    setMediaUrl(e.target.value);
                    setErrors((prev) => ({ ...prev, workMedia: "" }));
                  }}
                  placeholder="https://... (image or video URL)"
                  className="flex-1"
                />
                <select
                  value={mediaType}
                  onChange={(e) => setMediaType(e.target.value)}
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="image">Image</option>
                  <option value="video">Video</option>
                </select>
                <Button type="button" variant="outline" className="gap-1" onClick={addMedia}>
                  <Plus className="h-4 w-4" />
                  Add
                </Button>
              </div>
            </Field>
          </section>

          {error && (
            <p className="flex items-start gap-1.5 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PosterBoyEditDialog;
