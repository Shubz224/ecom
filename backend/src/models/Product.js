const mongoose = require('mongoose');

// ============ PRODUCT SCHEMA ============
const productSchema = new mongoose.Schema({
  // Basic Product Info
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    minlength: [3, 'Product name must be at least 3 characters'],
    maxlength: [100, 'Product name cannot exceed 100 characters']
  },
  
  description: {
    type: String,
    required: [true, 'Product description is required'],
    trim: true,
    minlength: [10, 'Description must be at least 10 characters'],
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  
  // URL-friendly slug for SEO
  slug: {
    type: String,
    unique: true,
    lowercase: true
  },
  
  // Pricing
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  },
  
  originalPrice: {
    type: Number,
    min: [0, 'Original price cannot be negative']
  },
  
  // Product Organization
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: {
      values: ['electronics', 'clothing', 'books', 'home', 'sports', 'beauty'],
      message: 'Please select a valid category'
    }
  },
  
  subCategory: {
    type: String,
    trim: true
  },
  
  brand: {
    type: String,
    required: [true, 'Brand is required'],
    trim: true,
    maxlength: [50, 'Brand name cannot exceed 50 characters']
  },
  
  // Product Images
  images: [{
    url: {
      type: String,
      required: [true, 'Image URL is required']
    },
    public_id: String, // For Cloudinary
    alt: {
      type: String,
      default: function() {
        return `${this.name} image`;
      }
    }
  }],
  
  // Stock Management
  stock: {
    type: Number,
    required: [true, 'Stock quantity is required'],
    min: [0, 'Stock cannot be negative'],
    default: 0
  },
  
  lowStockAlert: {
    type: Number,
    default: 10,
    min: [0, 'Low stock alert cannot be negative']
  },
  
  // Product Variants (Size, Color, etc.)
  variants: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    value: {
      type: String,
      required: true,
      trim: true
    },
    price: {
      type: Number,
      min: [0, 'Variant price cannot be negative']
    },
    stock: {
      type: Number,
      default: 0,
      min: [0, 'Variant stock cannot be negative']
    }
  }],
  
  // Product Specifications
  specifications: {
    type: Map,
    of: String
    // Example: {"Weight": "500g", "Material": "Cotton", "Color": "Blue"}
  },
  
  // Reviews & Ratings
  rating: {
    type: Number,
    default: 0,
    min: [0, 'Rating cannot be negative'],
    max: [5, 'Rating cannot exceed 5']
  },
  
  numReviews: {
    type: Number,
    default: 0,
    min: [0, 'Number of reviews cannot be negative']
  },
  
  // SEO & Marketing
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  
  metaTitle: {
    type: String,
    maxlength: [60, 'Meta title cannot exceed 60 characters']
  },
  
  metaDescription: {
    type: String,
    maxlength: [160, 'Meta description cannot exceed 160 characters']
  },
  
  // Product Status
  isActive: {
    type: Boolean,
    default: true
  },
  
  isFeatured: {
    type: Boolean,
    default: false
  },
  
  // Shipping Info
  weight: {
    type: Number,
    min: [0, 'Weight cannot be negative']
  },
  
  dimensions: {
    length: { type: Number, min: 0 },
    width: { type: Number, min: 0 },
    height: { type: Number, min: 0 }
  },
  
  freeShipping: {
    type: Boolean,
    default: false
  },
  
  // Analytics
  views: {
    type: Number,
    default: 0
  },
  
  sales: {
    type: Number,
    default: 0
  },
  
  // Admin Info
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ============ INDEXING FOR PERFORMANCE ============

// 1. Most important - search by name and description
productSchema.index({ 
  name: 'text', 
  description: 'text', 
  brand: 'text',
  tags: 'text'
});

// 2. Filter by category (most common filter)
productSchema.index({ category: 1, isActive: 1 });

// 3. Price range filtering
productSchema.index({ price: 1, isActive: 1 });

// 4. Sort by rating (popular products)
productSchema.index({ rating: -1, isActive: 1 });

// 5. Latest products
productSchema.index({ createdAt: -1, isActive: 1 });

// 6. Featured products
productSchema.index({ isFeatured: 1, isActive: 1 });

// 7. Brand filtering
productSchema.index({ brand: 1, isActive: 1 });

// 8. Compound index for category + price filtering
productSchema.index({ category: 1, price: 1, isActive: 1 });

// 9. Low stock products (admin dashboard)
productSchema.index({ stock: 1, isActive: 1 });

// 10. Slug for SEO-friendly URLs
productSchema.index({ slug: 1 }, { unique: true });

// ============ VIRTUAL PROPERTIES ============

// Calculate discount percentage
productSchema.virtual('discountPercentage').get(function() {
  if (this.originalPrice && this.originalPrice > this.price) {
    return Math.round(((this.originalPrice - this.price) / this.originalPrice) * 100);
  }
  return 0;
});

// Check if product is in stock
productSchema.virtual('inStock').get(function() {
  return this.stock > 0;
});

// Check if stock is low
productSchema.virtual('isLowStock').get(function() {
  return this.stock <= this.lowStockAlert && this.stock > 0;
});

// Calculate savings amount
productSchema.virtual('savings').get(function() {
  if (this.originalPrice && this.originalPrice > this.price) {
    return this.originalPrice - this.price;
  }
  return 0;
});

// Primary image (first image)
productSchema.virtual('primaryImage').get(function() {
  return this.images && this.images.length > 0 ? this.images[0] : null;
});

// Average rating with one decimal
productSchema.virtual('averageRating').get(function() {
  return Math.round(this.rating * 10) / 10;
});

// Stock status text
productSchema.virtual('stockStatus').get(function() {
  if (this.stock === 0) return 'Out of Stock';
  if (this.stock <= this.lowStockAlert) return 'Low Stock';
  return 'In Stock';
});

// ============ PRE-SAVE MIDDLEWARE ============

// Generate slug from name
productSchema.pre('save', function(next) {
  if (this.isModified('name') && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
  next();
});

// Set originalPrice if not provided
productSchema.pre('save', function(next) {
  if (this.isNew && !this.originalPrice) {
    this.originalPrice = this.price;
  }
  next();
});

// Generate meta title and description if not provided
productSchema.pre('save', function(next) {
  if (!this.metaTitle) {
    this.metaTitle = this.name.substring(0, 60);
  }
  
  if (!this.metaDescription) {
    this.metaDescription = this.description.substring(0, 160);
  }
  
  next();
});

// Validate at least one image
productSchema.pre('save', function(next) {
  if (this.images.length === 0) {
    next(new Error('Product must have at least one image'));
  } else {
    next();
  }
});

// ============ INSTANCE METHODS ============

// Update product rating (called after review is added/updated)
productSchema.methods.updateRating = async function() {
  const Review = mongoose.model('Review');
  
  const stats = await Review.aggregate([
    { $match: { product: this._id } },
    {
      $group: {
        _id: '$product',
        averageRating: { $avg: '$rating' },
        numReviews: { $sum: 1 }
      }
    }
  ]);
  
  if (stats.length > 0) {
    this.rating = stats[0].averageRating;
    this.numReviews = stats[0].numReviews;
  } else {
    this.rating = 0;
    this.numReviews = 0;
  }
  
  await this.save();
};

// Increment view count
productSchema.methods.incrementViews = async function() {
  this.views += 1;
  await this.save();
};

// Increment sales count
productSchema.methods.incrementSales = async function(quantity = 1) {
  this.sales += quantity;
  await this.save();
};

// Check if product can be ordered
productSchema.methods.canOrder = function(quantity = 1) {
  return this.isActive && this.stock >= quantity;
};

// Reduce stock after order
productSchema.methods.reduceStock = async function(quantity) {
  if (this.stock >= quantity) {
    this.stock -= quantity;
    await this.save();
    return true;
  }
  return false;
};

// Add variant
productSchema.methods.addVariant = function(name, value, price, stock) {
  this.variants.push({ name, value, price, stock });
  return this.save();
};

// Remove variant
productSchema.methods.removeVariant = function(variantId) {
  this.variants.id(variantId).remove();
  return this.save();
};

// ============ STATIC METHODS ============

// Search products
productSchema.statics.searchProducts = function(searchTerm, filters = {}) {
  let query = { isActive: true };
  
  // Text search
  if (searchTerm) {
    query.$text = { $search: searchTerm };
  }
  
  // Category filter
  if (filters.category) {
    query.category = filters.category;
  }
  
  // Price range
  if (filters.minPrice || filters.maxPrice) {
    query.price = {};
    if (filters.minPrice) query.price.$gte = filters.minPrice;
    if (filters.maxPrice) query.price.$lte = filters.maxPrice;
  }
  
  // Brand filter
  if (filters.brand) {
    query.brand = filters.brand;
  }
  
  // Rating filter
  if (filters.minRating) {
    query.rating = { $gte: filters.minRating };
  }
  
  // In stock only
  if (filters.inStockOnly) {
    query.stock = { $gt: 0 };
  }
  
  return this.find(query);
};

// Get products by category
productSchema.statics.findByCategory = function(category) {
  return this.find({ 
    category, 
    isActive: true 
  }).sort({ createdAt: -1 });
};

// Get featured products
productSchema.statics.getFeaturedProducts = function(limit = 10) {
  return this.find({ 
    isFeatured: true, 
    isActive: true 
  }).limit(limit).sort({ createdAt: -1 });
};

// Get best selling products
productSchema.statics.getBestSellers = function(limit = 10) {
  return this.find({ 
    isActive: true 
  }).sort({ sales: -1 }).limit(limit);
};

// Get products with low stock
productSchema.statics.getLowStockProducts = function() {
  return this.find({
    isActive: true,
    $expr: { $lte: ['$stock', '$lowStockAlert'] },
    stock: { $gt: 0 }
  });
};

// Get related products (same category, different product)
productSchema.statics.getRelatedProducts = function(productId, category, limit = 5) {
  return this.find({
    _id: { $ne: productId },
    category,
    isActive: true
  }).limit(limit).sort({ rating: -1 });
};

// Get products by price range
productSchema.statics.getByPriceRange = function(min, max) {
  return this.find({
    price: { $gte: min, $lte: max },
    isActive: true
  }).sort({ price: 1 });
};

// ============ POST MIDDLEWARE ============

// Log when product is created
productSchema.post('save', function(doc, next) {
  if (doc.isNew) {
    console.log(`New product created: ${doc.name}`);
  }
  next();
});

module.exports = mongoose.model('Product', productSchema);
