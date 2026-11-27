"use client";

import { useState, useEffect } from "react";
import {
  Settings,
  Save,
  Loader2,
  Globe,
  CreditCard,
  CheckCircle,
  AlertCircle,
  Plus,
  X,
  Pencil,
  Trash2,
  CalendarDays,
} from "lucide-react";
import { getSettings, updateSettings } from "../../services/adminService";
import { PageLoader } from "../../components/shared/page-loader";
import { ConfirmDialog } from "../../components/shared/confirm-dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Switch } from "../../components/ui/switch";
import { Button } from "../../components/ui/button";
import { Separator } from "../../components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { CouponList } from "../../components/admin/CouponList";

const PackageBenefits = ({ benefits = [], onChange }) => {
  const [input, setInput] = useState("");
  const [inputError, setInputError] = useState("");
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingValue, setEditingValue] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState(null);

  const addBenefit = () => {
    const val = input.trim();
    if (!val) {
      setInputError("Benefit cannot be empty.");
      return;
    }
    if (benefits.includes(val)) {
      setInputError("This benefit already exists.");
      return;
    }
    setInputError("");
    onChange([...benefits, val]);
    setInput("");
  };

  const startEdit = (index) => {
    setEditingIndex(index);
    setEditingValue(benefits[index]);
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditingValue("");
  };

  const saveEdit = () => {
    const val = editingValue.trim();
    if (!val) return;
    if (val !== benefits[editingIndex] && benefits.includes(val)) return;
    const updated = [...benefits];
    updated[editingIndex] = val;
    onChange(updated);
    setEditingIndex(null);
    setEditingValue("");
  };

  const confirmDelete = (index) => {
    setDeleteIndex(index);
    setDeleteDialogOpen(true);
  };

  const executeDelete = () => {
    onChange(benefits.filter((_, i) => i !== deleteIndex));
    setDeleteDialogOpen(false);
    setDeleteIndex(null);
  };

  return (
    <div className="space-y-3">
      <Label>Package Benefits</Label>
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => { setInput(e.target.value); setInputError(""); }}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addBenefit(); } }}
          placeholder="Enter a benefit point..."
          className="flex-1"
        />
        <Button type="button" variant="outline" size="sm" onClick={addBenefit} className="gap-1">
          <Plus size={14} /> Add
        </Button>
      </div>
      {inputError && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <AlertCircle size={12} /> {inputError}
        </p>
      )}
      {benefits.length > 0 ? (
        <div className="space-y-1.5">
          {benefits.map((benefit, i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm group"
            >
              <CheckCircle className="h-4 w-4 shrink-0 text-emerald-500" />
              {editingIndex === i ? (
                <>
                  <Input
                    value={editingValue}
                    onChange={(e) => setEditingValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { e.preventDefault(); saveEdit(); }
                      if (e.key === "Escape") cancelEdit();
                    }}
                    className="flex-1 h-7 text-sm"
                    autoFocus
                  />
                  <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={saveEdit}>
                    Save
                  </Button>
                  <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={cancelEdit}>
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  <span className="flex-1">{benefit}</span>
                  <button
                    type="button"
                    onClick={() => startEdit(i)}
                    className="shrink-0 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Edit benefit"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => confirmDelete(i)}
                    className="shrink-0 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete benefit"
                  >
                    <Trash2 size={14} />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">No benefits added yet.</p>
      )}

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Benefit"
        message="Are you sure you want to delete this package benefit?"
        onConfirm={executeDelete}
        onCancel={() => { setDeleteDialogOpen(false); setDeleteIndex(null); }}
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
      />
    </div>
  );
};

const SearchPlanCard = ({ title, durationDays, value, onChange }) => {
  const price = Number(value?.price) || 0;
  const benefits = Array.isArray(value?.benefits) ? value.benefits : [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">{title}</CardTitle>
        </div>
        <CardDescription>Search access for {durationDays} days.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Price</Label>
          <div className="relative max-w-xs">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              &#8377;
            </span>
            <Input
              type="number"
              min="0"
              className="pl-7"
              value={price}
              onChange={(e) => onChange({ price: Number(e.target.value) })}
            />
          </div>
        </div>
        <Separator />
        <PackageBenefits
          benefits={benefits}
          onChange={(val) => onChange({ benefits: val })}
        />
      </CardContent>
    </Card>
  );
};

const AdminSettings = () => {
  const [settings, setSettings] = useState({ general: [], subscription: [], platform: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await getSettings();
      setSettings(res.data.settings);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleChange = (category, key, value) => {
    setSettings((prev) => {
      const list = prev[category] || [];
      const exists = list.some((s) => s.key === key);
      return {
        ...prev,
        [category]: exists
          ? list.map((s) => (s.key === key ? { ...s, value } : s))
          : [...list, { key, value, category }],
      };
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError("");
      setMessage("");
      const allSettings = [
        ...settings.general.map((s) => ({ key: s.key, value: s.value, category: "general" })),
        ...settings.subscription.map((s) => ({ key: s.key, value: s.value, category: "subscription" })),
        ...settings.platform.map((s) => ({ key: s.key, value: s.value, category: "platform" })),
      ];
      await updateSettings(allSettings);
      setMessage("Settings saved successfully");
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const getSettingValue = (category, key) => {
    const setting = settings[category]?.find((s) => s.key === key);
    return setting?.value;
  };

  const getSettingDescription = (category, key) => {
    const setting = settings[category]?.find((s) => s.key === key);
    return setting?.description;
  };

  const getPlanValue = (key, fallbackLabel) => {
    const value = getSettingValue("subscription", key);
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return {
        price: Number(value.price) || 0,
        benefits: Array.isArray(value.benefits) ? value.benefits : [],
        label: value.label || fallbackLabel,
      };
    }
    return {
      price: typeof value === "number" ? value : 0,
      benefits: [],
      label: fallbackLabel,
    };
  };

  const updatePlanValue = (key, fallbackLabel, patch) => {
    const current = getPlanValue(key, fallbackLabel);
    handleChange("subscription", key, { ...current, ...patch });
  };

  if (loading) return <PageLoader text="Loading settings..." />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground">Configure your platform settings.</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Changes
        </Button>
      </div>

      {message && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400">
          <CheckCircle className="h-4 w-4" />
          {message}
        </div>
      )}

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

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList>
          <TabsTrigger value="general" className="gap-2">
            <Globe className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="subscription" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Subscription
          </TabsTrigger>
        </TabsList>

        {/* ── General Settings ── */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>
                Basic platform information and contact details.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="platform_name">Platform Name</Label>
                <Input
                  id="platform_name"
                  value={getSettingValue("general", "platform_name") ?? ""}
                  onChange={(e) => handleChange("general", "platform_name", e.target.value)}
                  placeholder="Platform name"
                />
                {getSettingDescription("general", "platform_name") && (
                  <p className="text-xs text-muted-foreground">
                    {getSettingDescription("general", "platform_name")}
                  </p>
                )}
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="platform_email">Contact Email</Label>
                <Input
                  id="platform_email"
                  type="email"
                  value={getSettingValue("general", "platform_email") ?? ""}
                  onChange={(e) => handleChange("general", "platform_email", e.target.value)}
                  placeholder="admin@example.com"
                />
                {getSettingDescription("general", "platform_email") && (
                  <p className="text-xs text-muted-foreground">
                    {getSettingDescription("general", "platform_email")}
                  </p>
                )}
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="platform_phone">Contact Phone</Label>
                <Input
                  id="platform_phone"
                  type="tel"
                  value={getSettingValue("general", "platform_phone") ?? ""}
                  onChange={(e) => handleChange("general", "platform_phone", e.target.value)}
                  placeholder="+91 XXXXX XXXXX"
                />
                {getSettingDescription("general", "platform_phone") && (
                  <p className="text-xs text-muted-foreground">
                    {getSettingDescription("general", "platform_phone")}
                  </p>
                )}
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="platform_description">Platform Description</Label>
                <Input
                  id="platform_description"
                  value={getSettingValue("general", "platform_description") ?? ""}
                  onChange={(e) => handleChange("general", "platform_description", e.target.value)}
                  placeholder="Brief platform description"
                />
                {getSettingDescription("general", "platform_description") && (
                  <p className="text-xs text-muted-foreground">
                    {getSettingDescription("general", "platform_description")}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Subscription Settings ── */}
        <TabsContent value="subscription">
          <Tabs defaultValue="user" className="space-y-6">
            <TabsList>
              <TabsTrigger value="user">User Subscription</TabsTrigger>
              <TabsTrigger value="vendor">Vendor Subscription</TabsTrigger>
              <TabsTrigger value="search-plans">Search Plans</TabsTrigger>
            </TabsList>

            {/* User Subscription */}
            <TabsContent value="user">
              <Card>
                <CardHeader>
                  <CardTitle>User Subscription</CardTitle>
                  <CardDescription>
                    Configure subscription plans and pricing for end users.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="user_subscription_fee">Subscription Fee</Label>
                    <div className="relative max-w-xs">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        &#8377;
                      </span>
                      <Input
                        id="user_subscription_fee"
                        type="number"
                        min="0"
                        className="pl-7"
                        value={getSettingValue("subscription", "user_subscription_fee") ?? 0}
                        onChange={(e) =>
                          handleChange("subscription", "user_subscription_fee", Number(e.target.value))
                        }
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {getSettingDescription("subscription", "user_subscription_fee") || "Fee charged to users. Set to 0 for free access."}
                    </p>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label htmlFor="user_sub_duration">Subscription Duration (Days)</Label>
                    <Input
                      id="user_sub_duration"
                      type="number"
                      min="1"
                      className="max-w-xs"
                      value={getSettingValue("subscription", "user_subscription_duration_days") ?? 30}
                      onChange={(e) =>
                        handleChange("subscription", "user_subscription_duration_days", Number(e.target.value))
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      How long a user subscription lasts in days.
                    </p>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label htmlFor="user_trial">Trial Period (Days)</Label>
                    <Input
                      id="user_trial"
                      type="number"
                      min="0"
                      className="max-w-xs"
                      value={getSettingValue("subscription", "user_trial_period_days") ?? 0}
                      onChange={(e) =>
                        handleChange("subscription", "user_trial_period_days", Number(e.target.value))
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Free trial period for users in days. Set to 0 for no trial.
                    </p>
                  </div>

                  <Separator />

                  <PackageBenefits
                    benefits={getSettingValue("subscription", "user_package_benefits") || []}
                    onChange={(val) => handleChange("subscription", "user_package_benefits", val)}
                  />
                </CardContent>
              </Card>

              <div className="mt-6">
                <CouponList type="USER" />
              </div>
            </TabsContent>

            {/* Vendor Subscription */}
            <TabsContent value="vendor">
              <Card>
                <CardHeader>
                  <CardTitle>Vendor Subscription</CardTitle>
                  <CardDescription>
                    Configure subscription plans and pricing for vendors.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="vendor_subscription_fee">Subscription Fee</Label>
                    <div className="relative max-w-xs">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        &#8377;
                      </span>
                      <Input
                        id="vendor_subscription_fee"
                        type="number"
                        min="0"
                        className="pl-7"
                        value={getSettingValue("subscription", "vendor_subscription_fee") ?? 0}
                        onChange={(e) =>
                          handleChange("subscription", "vendor_subscription_fee", Number(e.target.value))
                        }
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {getSettingDescription("subscription", "vendor_subscription_fee") || "Fee charged to vendors. Set to 0 for free access."}
                    </p>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label htmlFor="vendor_sub_duration">Subscription Duration (Days)</Label>
                    <Input
                      id="vendor_sub_duration"
                      type="number"
                      min="1"
                      className="max-w-xs"
                      value={getSettingValue("subscription", "vendor_subscription_duration_days") ?? 30}
                      onChange={(e) =>
                        handleChange("subscription", "vendor_subscription_duration_days", Number(e.target.value))
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      How long a vendor subscription lasts in days.
                    </p>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label htmlFor="vendor_trial">Trial Period (Days)</Label>
                    <Input
                      id="vendor_trial"
                      type="number"
                      min="0"
                      className="max-w-xs"
                      value={getSettingValue("subscription", "vendor_trial_period_days") ?? 0}
                      onChange={(e) =>
                        handleChange("subscription", "vendor_trial_period_days", Number(e.target.value))
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Free trial period for vendors in days. Set to 0 for no trial.
                    </p>
                  </div>

                  <Separator />

                  <PackageBenefits
                    benefits={getSettingValue("subscription", "vendor_package_benefits") || []}
                    onChange={(val) => handleChange("subscription", "vendor_package_benefits", val)}
                  />
                </CardContent>
              </Card>

              <div className="mt-6">
                <CouponList type="VENDOR" />
              </div>
            </TabsContent>

            {/* Search Subscription Plans (1 / 3 / 12 months) */}
            <TabsContent value="search-plans">
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Search Subscription Plans</CardTitle>
                    <CardDescription>
                      These three plans unlock the search page for users, vendors,
                      and poster boys. Pricing and benefits apply to all roles.
                    </CardDescription>
                  </CardHeader>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <SearchPlanCard
                    title="1 Month"
                    durationDays={30}
                    value={getPlanValue("plan_1_month", "1 Month")}
                    onChange={(patch) => updatePlanValue("plan_1_month", "1 Month", patch)}
                  />
                  <SearchPlanCard
                    title="3 Months"
                    durationDays={90}
                    value={getPlanValue("plan_3_months", "3 Months")}
                    onChange={(patch) => updatePlanValue("plan_3_months", "3 Months", patch)}
                  />
                  <SearchPlanCard
                    title="12 Months"
                    durationDays={365}
                    value={getPlanValue("plan_12_months", "12 Months")}
                    onChange={(patch) => updatePlanValue("plan_12_months", "12 Months", patch)}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminSettings;
