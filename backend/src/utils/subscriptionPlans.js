const PLAN_DEFS = [
  {
    id: "1_month",
    key: "plan_1_month",
    label: "1 Month",
    months: 1,
    durationDays: 30,
    recommended: false,
  },
  {
    id: "3_months",
    key: "plan_3_months",
    label: "3 Months",
    months: 3,
    durationDays: 90,
    recommended: true,
  },
  {
    id: "12_months",
    key: "plan_12_months",
    label: "12 Months",
    months: 12,
    durationDays: 365,
    recommended: false,
  },
];

const DEFAULT_PLAN_PRICES = {
  plan_1_month: 99,
  plan_3_months: 249,
  plan_12_months: 799,
};

const DEFAULT_PLAN_BENEFITS = [
  "Unlimited business & poster boy search",
  "Access verified vendor details",
  "Priority support",
];

const getDefaultPlanValue = (def) => ({
  price: DEFAULT_PLAN_PRICES[def.key] ?? 0,
  benefits: [...DEFAULT_PLAN_BENEFITS],
  label: def.label,
});

// Settings can hold a plain number (legacy) or an object with price/benefits.
const normalizePlanValue = (value, def) => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return {
      price: Number(value.price) || 0,
      benefits: Array.isArray(value.benefits)
        ? value.benefits
        : [...DEFAULT_PLAN_BENEFITS],
      label: value.label || def.label,
    };
  }
  return {
    price: typeof value === "number" ? value : DEFAULT_PLAN_PRICES[def.key] ?? 0,
    benefits: [...DEFAULT_PLAN_BENEFITS],
    label: def.label,
  };
};

module.exports = {
  PLAN_DEFS,
  DEFAULT_PLAN_PRICES,
  DEFAULT_PLAN_BENEFITS,
  getDefaultPlanValue,
  normalizePlanValue,
};
