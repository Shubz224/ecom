const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  // Review associations
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
  },
  
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Product is required']
  },
  
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  
  // Review content
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5']
  },
  
  title: {
    type: String,
    trim: true,
    maxlength: [100, 'Review title cannot exceed 100 characters']
  },
  
  comment: {
    type: String,
    required: [true, 'Review comment is required'],
    trim: true,
    minlength: [10, 'Comment must be at least 10 characters'],
    maxlength: [1000, 'Comment cannot exceed 1000 characters']
  },
  
  // Review images (optional)
  images: [{
    url: String,
    public_id: String
  }],
  
  // Review verification
  isVerified: {
    type: Boolean,
    default: false // Only verified purchases can be marked verified
  },
  
  // Helpful votes
  helpfulVotes: {
    type: Number,
    default: 0,
    min: [0, 'Helpful votes cannot be negative']
  },
  
  // Review status
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Admin moderation
  isApproved: {
    type: Boolean,
    default: true
  },
  
  moderationNote: String
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ============ INDEXING ============
reviewSchema.index({ product: 1, createdAt: -1 }); // Product reviews
reviewSchema.index({ user: 1, product: 1 }, { unique: true }); // One review per user per product
reviewSchema.index({ rating: 1 });
reviewSchema.index({ isActive: 1, isApproved: 1 });

// ============ VIRTUAL PROPERTIES ============
reviewSchema.virtual('ratingStars').get(function() {
  return '★'.repeat(this.rating) + '☆'.repeat(5 - this.rating);
});

reviewSchema.virtual('isHelpful').get(function() {
  return this.helpfulVotes > 0;
});

// ============ PRE-SAVE MIDDLEWARE ============
reviewSchema.pre('save', async function(next) {
  // Check if this is a verified purchase
  if (this.order && !this.isVerified) {
    const Order = mongoose.model('Order');
    const order = await Order.findOne({
      _id: this.order,
      user: this.user,
      orderStatus: 'delivered',
      'items.product': this.product
    });
    
    if (order) {
      this.isVerified = true;
    }
  }
  next();
});

// ============ POST-SAVE MIDDLEWARE ============
// Update product rating when review is saved
reviewSchema.post('save', async function() {
  const Product = mongoose.model('Product');
  const product = await Product.findById(this.product);
  if (product) {
    await product.updateRating();
  }
});

// Update product rating when review is removed
reviewSchema.post('remove', async function() {
  const Product = mongoose.model('Product');
  const product = await Product.findById(this.product);
  if (product) {
    await product.updateRating();
  }
});

// ============ INSTANCE METHODS ============
reviewSchema.methods.markHelpful = async function() {
  this.helpfulVotes += 1;
  await this.save();
  return this;
};

reviewSchema.methods.approve = async function() {
  this.isApproved = true;
  await this.save();
  return this;
};

reviewSchema.methods.reject = async function(reason = '') {
  this.isApproved = false;
  this.moderationNote = reason;
  await this.save();
  return this;
};

// ============ STATIC METHODS ============
reviewSchema.statics.findByProduct = function(productId) {
  return this.find({ 
    product: productId, 
    isActive: true, 
    isApproved: true 
  }).populate('user', 'name').sort({ createdAt: -1 });
};

reviewSchema.statics.findByUser = function(userId) {
  return this.find({ user: userId, isActive: true })
    .populate('product', 'name images')
    .sort({ createdAt: -1 });
};

reviewSchema.statics.getAverageRating = async function(productId) {
  const result = await this.aggregate([
    { 
      $match: { 
        product: mongoose.Types.ObjectId(productId),
        isActive: true,
        isApproved: true
      }
    },
    {
      $group: {
        _id: '$product',
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 },
        ratingBreakdown: {
          $push: '$rating'
        }
      }
    }
  ]);
  
  if (result.length === 0) {
    return { averageRating: 0, totalReviews: 0, breakdown: {} };
  }
  
  const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  result[0].ratingBreakdown.forEach(rating => {
    breakdown[rating]++;
  });
  
  return {
    averageRating: Math.round(result[0].averageRating * 10) / 10,
    totalReviews: result[0].totalReviews,
    breakdown
  };
};

module.exports = mongoose.model('Review', reviewSchema);
