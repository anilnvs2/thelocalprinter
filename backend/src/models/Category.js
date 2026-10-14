const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Category name is required"],
      trim: true,
      unique: true,
      maxlength: [100, "Category name must be at most 100 characters"],
    },
    slug: {
      type: String,
      unique: true,
      trim: true,
      lowercase: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: [500, "Description must be at most 500 characters"],
    },
    type: {
      type: String,
      enum: ["parent", "subcategory"],
      default: "parent",
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },
    // "business"  -> a printing/business category (vendor may pick it)
    // "staffing"  -> a people/service-provider category (e.g. Poster Boy);
    //                never selectable as a business category.
    kind: {
      type: String,
      enum: ["business", "staffing"],
      default: "business",
    },
    image: {
      type: String,
      default: "",
    },
    // Slugs of builtin static subcategories the admin permanently deleted.
    // Client merges suppress matching static defaults so they stay hidden
    // instead of reappearing from the builtin list.
    hiddenSubs: {
      type: [String],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    businessCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

categorySchema.pre("save", function () {
  if (this.isModified("name")) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }
});

categorySchema.pre("validate", async function () {
  if (this.type === "subcategory") {
    if (!this.parentId) {
      this.invalidate("parentId", "Parent category is required for subcategory");
    } else {
      const parent = await mongoose.model("Category").findById(this.parentId);
      if (!parent) {
        this.invalidate("parentId", "Parent category not found");
      } else if (parent.type !== "parent") {
        this.invalidate("parentId", "Parent reference must be a parent category");
      }
    }
  } else if (this.type === "parent") {
    this.parentId = null;
  }
});

categorySchema.index({ name: 1 });
categorySchema.index({ slug: 1 });
categorySchema.index({ isActive: 1 });
categorySchema.index({ type: 1 });
categorySchema.index({ parentId: 1 });
categorySchema.index({ kind: 1 });

const Category = mongoose.model("Category", categorySchema);

module.exports = Category;
