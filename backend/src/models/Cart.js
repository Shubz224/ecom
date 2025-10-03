const mongoose = require('mongoose');

// ============ CART ITEM SCHEMA ============
const cartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Product is required']
  },
  
  // Store product details at time of adding to cart
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
    name: String,
    value: String,
    price: Number
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
  
  // Discount & Shipping
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

// ============ INDEXING ============
cartSchema.index({ user: 1 }, { unique: true });
cartSchema.index({ 'items.product': 1 });
cartSchema.index({ isActive: 1, lastActivity: 1 });

// ============ VIRTUAL PROPERTIES ============
cartSchema.virtual('isEmpty').get(function() {
  return this.items.length === 0;
});

// ============ PRE-SAVE MIDDLEWARE ============
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
  
  // Calculate grand total
  this.grandTotal = this.subtotal - this.discountAmount + this.shippingCost;
  
  // Update last activity
  this.lastActivity = new Date();
  
  next();
});

// ============ STATIC METHODS ============

// Find or create cart for user
cartSchema.statics.findOrCreateCart = async function(userId) {
  console.log('🔍 Looking for cart for user:', userId);
  
  let cart = await this.findOne({ user: userId, isActive: true });
  
  if (!cart) {
    console.log('📝 Creating new cart for user:', userId);
    cart = new this({ user: userId, items: [] });
    await cart.save();
    console.log('✅ New cart created:', cart._id);
  } else {
    console.log('✅ Found existing cart:', cart._id);
  }
  
  return cart;
};

// Get cart with populated product details
cartSchema.statics.getCartWithProducts = async function(userId) {
  console.log('🔍 Getting cart with products for user:', userId);
  
  const cart = await this.findOne({ user: userId, isActive: true })
    .populate({
      path: 'items.product',
      select: 'name price images stock isActive',
      match: { isActive: true }
    });
  
  console.log('📦 Cart found:', cart ? 'Yes' : 'No');
  if (cart) {
    console.log('📊 Cart items count:', cart.items.length);
  }
  
  return cart;
};

// ============ INSTANCE METHODS ============
// Add item to cart - FIXED METHOD
cartSchema.methods.addItem = async function(productData, quantity = 1, variantData = null) {
  console.log('➕ Adding item to cart:', {
    productId: productData._id,
    quantity,
    variant: variantData
  });
  
  const { _id: productId, name, images, price } = productData;
  
  // Check if item already exists
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
    // Update existing item
    console.log('🔄 Updating existing item quantity');
    this.items[existingItemIndex].quantity += quantity;
  } else {
    // Add new item - FIXED: Proper structure
    console.log('🆕 Adding new item to cart');
    const newItem = {
      product: productId,
      productName: name,
      productImage: images[0]?.url || '',
      productPrice: price,
      quantity
    };
    
    // FIXED: Only add selectedVariant if variantData exists
    if (variantData && variantData.name) {
      newItem.selectedVariant = variantData;
    }
    
    this.items.push(newItem);
  }
  
  await this.save();
  console.log('✅ Item added successfully. Total items:', this.items.length);
  return this;
};


// Remove item from cart
cartSchema.methods.removeItem = async function(itemId) {
  console.log('🗑️ Removing item from cart:', itemId);
  
  const item = this.items.id(itemId);
  if (!item) {
    throw new Error('Item not found in cart');
  }
  
  this.items.pull(itemId);
  await this.save();
  console.log('✅ Item removed successfully');
  return this;
};

// Update item quantity
cartSchema.methods.updateItemQuantity = async function(itemId, quantity) {
  console.log('🔄 Updating item quantity:', { itemId, quantity });
  
  if (quantity <= 0) {
    return this.removeItem(itemId);
  }
  
  const item = this.items.id(itemId);
  if (!item) {
    throw new Error('Item not found in cart');
  }
  
  item.quantity = quantity;
  await this.save();
  console.log('✅ Quantity updated successfully');
  return this;
};

// Clear entire cart
cartSchema.methods.clearCart = async function() {
  console.log('🧹 Clearing cart');
  this.items = [];
  await this.save();
  console.log('✅ Cart cleared successfully');
  return this;
};

module.exports = mongoose.model('Cart', cartSchema);
