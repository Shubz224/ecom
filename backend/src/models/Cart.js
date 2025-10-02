const mongoose = require('mongoose');

// ============ CART ITEM SCHEMA ============
// Subdocument for individual cart items
const cartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Product is required']
  },
  
  // Store product details to avoid issues if product is deleted/modified
  productName: {
    type: String,
    required: true
  },
  
  productImage: {
    type: String,
    required: true
  },
  
  productPrice: {
    type: Number,
    required: true,
    min: [0, 'Product price cannot be negative']
  },
  
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [1, 'Quantity must be at least 1'],
    default: 1
  },
  
  // For products with variants (size, color, etc.)
  selectedVariant: {
    name: String,   // e.g., "Size"
    value: String,  // e.g., "Large"
    price: Number   // Variant-specific price
  },
  
  // Calculate item total
  itemTotal: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// ============ MAIN CART SCHEMA ============
const cartSchema = new mongoose.Schema({
  // Cart owner
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required'],
    unique: true // One cart per user
  },
  
  // Cart items
  items: [cartItemSchema],
  
  // Cart totals
  subtotal: {
    type: Number,
    default: 0,
    min: [0, 'Subtotal cannot be negative']
  },
  
  totalItems: {
    type: Number,
    default: 0,
    min: [0, 'Total items cannot be negative']
  },
  
  totalQuantity: {
    type: Number,
    default: 0,
    min: [0, 'Total quantity cannot be negative']
  },
  
  // Discount & Shipping (for future use)
  discountAmount: {
    type: Number,
    default: 0,
    min: [0, 'Discount cannot be negative']
  },
  
  shippingCost: {
    type: Number,
    default: 0,
    min: [0, 'Shipping cost cannot be negative']
  },
  
  // Final total
  grandTotal: {
    type: Number,
    default: 0,
    min: [0, 'Grand total cannot be negative']
  },
  
  // Cart status
  isActive: {
    type: Boolean,
    default: true
  },
  
  // When cart was last updated
  lastActivity: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ============ INDEXING FOR PERFORMANCE ============

// 1. Primary - find cart by user (most common operation)
cartSchema.index({ user: 1 }, { unique: true });

// 2. Find carts containing specific products
cartSchema.index({ 'items.product': 1 });

// 3. Active carts for cleanup/analysis
cartSchema.index({ isActive: 1, lastActivity: 1 });

// 4. Recent activity
cartSchema.index({ lastActivity: -1 });

// ============ VIRTUAL PROPERTIES ============

// Check if cart is empty
cartSchema.virtual('isEmpty').get(function() {
  return this.items.length === 0;
});

// Get unique product count (different from total quantity)
cartSchema.virtual('uniqueItemCount').get(function() {
  return this.items.length;
});

// Calculate average item price
cartSchema.virtual('averageItemPrice').get(function() {
  if (this.totalQuantity === 0) return 0;
  return Math.round((this.subtotal / this.totalQuantity) * 100) / 100;
});

// Check if cart has any discounted items
cartSchema.virtual('hasDiscounts').get(function() {
  return this.items.some(item => {
    // Check if product has original price higher than current price
    return item.selectedVariant ? 
      item.selectedVariant.price < item.productPrice :
      false;
  });
});

// Estimated delivery date (simple calculation)
cartSchema.virtual('estimatedDelivery').get(function() {
  const deliveryDays = 7; // Default 7 days
  const deliveryDate = new Date();
  deliveryDate.setDate(deliveryDate.getDate() + deliveryDays);
  return deliveryDate;
});

// ============ PRE-SAVE MIDDLEWARE ============

// Calculate cart totals before saving
cartSchema.pre('save', function(next) {
  // Calculate item totals first
  this.items.forEach(item => {
    const price = item.selectedVariant ? item.selectedVariant.price : item.productPrice;
    item.itemTotal = price * item.quantity;
  });
  
  // Calculate cart totals
  this.subtotal = this.items.reduce((total, item) => total + item.itemTotal, 0);
  this.totalItems = this.items.length;
  this.totalQuantity = this.items.reduce((total, item) => total + item.quantity, 0);
  
  // Calculate grand total (subtotal - discount + shipping)
  this.grandTotal = this.subtotal - this.discountAmount + this.shippingCost;
  
  // Update last activity
  this.lastActivity = new Date();
  
  next();
});

// Remove empty carts before saving
cartSchema.pre('save', function(next) {
  // If cart becomes empty, mark as inactive
  if (this.items.length === 0) {
    this.isActive = false;
  }
  next();
});

// ============ INSTANCE METHODS ============

// Add item to cart
cartSchema.methods.addItem = async function(productData, quantity = 1, variantData = null) {
  const { _id: productId, name, images, price } = productData;
  
  // Check if item already exists in cart
  const existingItemIndex = this.items.findIndex(item => {
    const sameProduct = item.product.toString() === productId.toString();
    const sameVariant = variantData ? 
      (item.selectedVariant && 
       item.selectedVariant.name === variantData.name && 
       item.selectedVariant.value === variantData.value) : 
      !item.selectedVariant;
    return sameProduct && sameVariant;
  });
  
  if (existingItemIndex > -1) {
    // Update quantity if item exists
    this.items[existingItemIndex].quantity += quantity;
  } else {
    // Add new item
    const newItem = {
      product: productId,
      productName: name,
      productImage: images[0]?.url || '',
      productPrice: price,
      quantity,
      selectedVariant: variantData
    };
    
    this.items.push(newItem);
  }
  
  await this.save();
  return this;
};

// Update item quantity
cartSchema.methods.updateItemQuantity = async function(itemId, quantity) {
  const item = this.items.id(itemId);
  
  if (!item) {
    throw new Error('Item not found in cart');
  }
  
  if (quantity <= 0) {
    // Remove item if quantity is 0 or less
    return this.removeItem(itemId);
  }
  
  item.quantity = quantity;
  await this.save();
  return this;
};

// Remove item from cart
cartSchema.methods.removeItem = async function(itemId) {
  const item = this.items.id(itemId);
  
  if (!item) {
    throw new Error('Item not found in cart');
  }
  
  item.remove();
  await this.save();
  return this;
};

// Clear entire cart
cartSchema.methods.clearCart = async function() {
  this.items = [];
  await this.save();
  return this;
};

// Apply discount
cartSchema.methods.applyDiscount = async function(discountAmount) {
  this.discountAmount = Math.min(discountAmount, this.subtotal);
  await this.save();
  return this;
};

// Set shipping cost
cartSchema.methods.setShippingCost = async function(cost) {
  this.shippingCost = cost;
  await this.save();
  return this;
};

// Check if product is in cart
cartSchema.methods.hasProduct = function(productId) {
  return this.items.some(item => item.product.toString() === productId.toString());
};

// Get item by product ID
cartSchema.methods.getItemByProduct = function(productId) {
  return this.items.find(item => item.product.toString() === productId.toString());
};

// Validate cart (check if all products are still available)
cartSchema.methods.validateCart = async function() {
  const Product = mongoose.model('Product');
  const invalidItems = [];
  
  for (let item of this.items) {
    const product = await Product.findById(item.product);
    
    if (!product || !product.isActive) {
      invalidItems.push({
        itemId: item._id,
        reason: 'Product no longer available'
      });
    } else if (product.stock < item.quantity) {
      invalidItems.push({
        itemId: item._id,
        reason: `Only ${product.stock} items available, you have ${item.quantity} in cart`
      });
    }
  }
  
  return invalidItems;
};

// Convert cart to order format
cartSchema.methods.toOrderFormat = function() {
  return {
    items: this.items.map(item => ({
      product: item.product,
      productName: item.productName,
      productImage: item.productImage,
      quantity: item.quantity,
      price: item.selectedVariant ? item.selectedVariant.price : item.productPrice,
      selectedVariant: item.selectedVariant,
      itemTotal: item.itemTotal
    })),
    subtotal: this.subtotal,
    discountAmount: this.discountAmount,
    shippingCost: this.shippingCost,
    grandTotal: this.grandTotal
  };
};

// ============ STATIC METHODS ============

// Find or create cart for user
cartSchema.statics.findOrCreateCart = async function(userId) {
  let cart = await this.findOne({ user: userId, isActive: true });
  
  if (!cart) {
    cart = new this({ user: userId });
    await cart.save();
  }
  
  return cart;
};

// Get cart with populated product details
cartSchema.statics.getCartWithProducts = async function(userId) {
  return this.findOne({ user: userId, isActive: true })
    .populate({
      path: 'items.product',
      select: 'name price images stock isActive'
    });
};

// Find abandoned carts (not updated for X days)
cartSchema.statics.findAbandonedCarts = function(days = 7) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  return this.find({
    isActive: true,
    lastActivity: { $lt: cutoffDate },
    totalItems: { $gt: 0 }
  });
};

// Get cart statistics
cartSchema.statics.getCartStats = async function() {
  const stats = await this.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: null,
        totalCarts: { $sum: 1 },
        totalValue: { $sum: '$grandTotal' },
        averageCartValue: { $avg: '$grandTotal' },
        averageItemsPerCart: { $avg: '$totalQuantity' }
      }
    }
  ]);
  
  return stats[0] || {
    totalCarts: 0,
    totalValue: 0,
    averageCartValue: 0,
    averageItemsPerCart: 0
  };
};

// Remove inactive carts (cleanup)
cartSchema.statics.cleanupInactiveCarts = async function(days = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  const result = await this.deleteMany({
    isActive: false,
    lastActivity: { $lt: cutoffDate }
  });
  
  return result.deletedCount;
};

// ============ POST MIDDLEWARE ============

// Log cart activity
cartSchema.post('save', function(doc, next) {
  console.log(`Cart updated for user: ${doc.user}, Items: ${doc.totalItems}, Total: ₹${doc.grandTotal}`);
  next();
});

module.exports = mongoose.model('Cart', cartSchema);
