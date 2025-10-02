const mongoose = require('mongoose');

// ============ ORDER ITEM SCHEMA ============
const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  
  // Store product info at time of order (in case product changes later)
  productName: {
    type: String,
    required: true
  },
  
  productImage: String,
  
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1']
  },
  
  price: {
    type: Number,
    required: true,
    min: [0, 'Price cannot be negative']
  },
  
  selectedVariant: {
    name: String,
    value: String
  },
  
  itemTotal: {
    type: Number,
    required: true
  }
});

// ============ MAIN ORDER SCHEMA ============
const orderSchema = new mongoose.Schema({
  // Order identification
  orderNumber: {
    type: String,
    unique: true,
    required: true
  },
  
  // Customer info
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Order items
  items: [orderItemSchema],
  
  // Shipping address
  shippingAddress: {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    landmark: String
  },
  
  // Order amounts
  subtotal: {
    type: Number,
    required: true,
    min: [0, 'Subtotal cannot be negative']
  },
  
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
  
  tax: {
    type: Number,
    default: 0,
    min: [0, 'Tax cannot be negative']
  },
  
  totalAmount: {
    type: Number,
    required: true,
    min: [0, 'Total amount cannot be negative']
  },
  
  // Payment info
  paymentMethod: {
    type: String,
    required: true,
    enum: ['razorpay', 'cod', 'wallet']
  },
  
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  
  paymentId: String, // Razorpay payment ID
  
  // Order status tracking
  orderStatus: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'],
    default: 'pending'
  },
  
  // Status timeline
  statusHistory: [{
    status: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    note: String
  }],
  
  // Important dates
  confirmedAt: Date,
  shippedAt: Date,
  deliveredAt: Date,
  cancelledAt: Date,
  
  // Shipping info
  trackingNumber: String,
  estimatedDelivery: Date,
  
  // Notes
  customerNotes: String,
  adminNotes: String
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ============ INDEXING ============
orderSchema.index({ user: 1, createdAt: -1 }); // User's orders
orderSchema.index({ orderNumber: 1 }, { unique: true });
orderSchema.index({ orderStatus: 1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ createdAt: -1 }); // Recent orders
orderSchema.index({ 'items.product': 1 }); // Find orders containing product

// ============ VIRTUAL PROPERTIES ============
orderSchema.virtual('isPaid').get(function() {
  return this.paymentStatus === 'paid';
});

orderSchema.virtual('isDelivered').get(function() {
  return this.orderStatus === 'delivered';
});

orderSchema.virtual('canCancel').get(function() {
  return ['pending', 'confirmed'].includes(this.orderStatus);
});

orderSchema.virtual('totalItems').get(function() {
  return this.items.reduce((total, item) => total + item.quantity, 0);
});

// ============ PRE-SAVE MIDDLEWARE ============
// Generate order number
orderSchema.pre('save', async function(next) {
  if (this.isNew) {
    const count = await mongoose.model('Order').countDocuments();
    this.orderNumber = `ORD${Date.now()}${(count + 1).toString().padStart(4, '0')}`;
    
    // Add initial status to history
    this.statusHistory.push({
      status: this.orderStatus,
      timestamp: new Date(),
      note: 'Order created'
    });
  }
  next();
});

// Update status dates
orderSchema.pre('save', function(next) {
  if (this.isModified('orderStatus')) {
    const now = new Date();
    
    switch (this.orderStatus) {
      case 'confirmed':
        this.confirmedAt = now;
        break;
      case 'shipped':
        this.shippedAt = now;
        break;
      case 'delivered':
        this.deliveredAt = now;
        break;
      case 'cancelled':
        this.cancelledAt = now;
        break;
    }
    
    // Add to status history
    this.statusHistory.push({
      status: this.orderStatus,
      timestamp: now
    });
  }
  next();
});

// ============ INSTANCE METHODS ============
orderSchema.methods.updateStatus = async function(newStatus, note = '') {
  this.orderStatus = newStatus;
  
  if (note) {
    this.statusHistory[this.statusHistory.length - 1].note = note;
  }
  
  await this.save();
  return this;
};

orderSchema.methods.markAsPaid = async function(paymentId = '') {
  this.paymentStatus = 'paid';
  this.paymentId = paymentId;
  await this.save();
  return this;
};

orderSchema.methods.cancelOrder = async function(reason = '') {
  if (!this.canCancel) {
    throw new Error('Order cannot be cancelled at this stage');
  }
  
  this.orderStatus = 'cancelled';
  this.cancelledAt = new Date();
  
  if (reason) {
    this.adminNotes = reason;
  }
  
  await this.save();
  return this;
};

// ============ STATIC METHODS ============
orderSchema.statics.findByUser = function(userId) {
  return this.find({ user: userId }).sort({ createdAt: -1 });
};

orderSchema.statics.findByStatus = function(status) {
  return this.find({ orderStatus: status }).sort({ createdAt: -1 });
};

orderSchema.statics.getOrderStats = async function(startDate, endDate) {
  const match = {};
  if (startDate && endDate) {
    match.createdAt = { $gte: startDate, $lte: endDate };
  }
  
  const stats = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalRevenue: { $sum: '$totalAmount' },
        averageOrderValue: { $avg: '$totalAmount' },
        pendingOrders: {
          $sum: { $cond: [{ $eq: ['$orderStatus', 'pending'] }, 1, 0] }
        },
        completedOrders: {
          $sum: { $cond: [{ $eq: ['$orderStatus', 'delivered'] }, 1, 0] }
        }
      }
    }
  ]);
  
  return stats[0] || {};
};

module.exports = mongoose.model('Order', orderSchema);
