const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    trim: true,
    unique: true,
    maxlength: [50, 'Category name cannot exceed 50 characters']
  },
  
  slug: {
    type: String,
    unique: true,
    lowercase: true
  },
  
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  
  image: {
    url: String,
    public_id: String
  },
  
  // Parent category for nested categories
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  
  isActive: {
    type: Boolean,
    default: true
  },
  
  sortOrder: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ============ INDEXING ============
categorySchema.index({ slug: 1 }, { unique: true });
categorySchema.index({ parent: 1, isActive: 1 });
categorySchema.index({ isActive: 1, sortOrder: 1 });

// ============ VIRTUAL PROPERTIES ============
categorySchema.virtual('subcategories', {
  ref: 'Category',
  localField: '_id',
  foreignField: 'parent'
});

// ============ PRE-SAVE MIDDLEWARE ============
categorySchema.pre('save', function(next) {
  if (!this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
  next();
});

// ============ STATIC METHODS ============
categorySchema.statics.getTree = async function() {
  const categories = await this.find({ isActive: true })
    .sort({ sortOrder: 1, name: 1 });
  
  const categoryMap = new Map();
  const rootCategories = [];
  
  categories.forEach(cat => {
    categoryMap.set(cat._id.toString(), { ...cat.toObject(), children: [] });
  });
  
  categories.forEach(cat => {
    if (cat.parent) {
      const parent = categoryMap.get(cat.parent.toString());
      if (parent) {
        parent.children.push(categoryMap.get(cat._id.toString()));
      }
    } else {
      rootCategories.push(categoryMap.get(cat._id.toString()));
    }
  });
  
  return rootCategories;
};

module.exports = mongoose.model('Category', categorySchema);
