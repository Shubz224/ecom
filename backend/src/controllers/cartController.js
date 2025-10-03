const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { validationResult } = require('express-validator');

// ============ CART CONTROLLER - FIXED VERSION ============

/**
 * @desc    Get user's cart
 * @route   GET /api/cart
 * @access  Private
 */
const getCart = async (req, res) => {
  try {
    console.log('📦 Getting cart for user:', req.user._id);
    
    // Find cart for user - FIXED
    let cart = await Cart.findOne({ user: req.user._id, isActive: true })
      .populate({
        path: 'items.product',
        select: 'name price images stock isActive'
      });

    console.log('🔍 Cart found:', cart ? 'Yes' : 'No');
    
    if (!cart || cart.items.length === 0) {
      console.log('📭 Cart is empty, returning empty cart structure');
      return res.status(200).json({
        success: true,
        message: 'Cart is empty',
        data: {
          cart: {
            _id: cart?._id || null,
            user: req.user._id,
            items: [],
            subtotal: 0,
            totalItems: 0,
            totalQuantity: 0,
            discountAmount: 0,
            shippingCost: 0,
            grandTotal: 0,
            isEmpty: true
          }
        }
      });
    }

    console.log('✅ Cart retrieved successfully with', cart.items.length, 'items');
    
    res.status(200).json({
      success: true,
      message: 'Cart retrieved successfully',
      data: {
        cart
      }
    });

  } catch (error) {
    console.error('❌ Get cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while getting cart',
      error: error.message
    });
  }
};

/**
 * @desc    Add item to cart
 * @route   POST /api/cart/add
 * @access  Private
 */
const addToCart = async (req, res) => {
  try {
    console.log('🛒 Add to cart request:', req.body);
    console.log('👤 User ID:', req.user._id);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { productId, quantity = 1, variantId } = req.body;

    // Check if product exists and is active
    const product = await Product.findById(productId);
    console.log('🎯 Product found:', product ? product.name : 'Not found');
    
    if (!product || !product.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Product not found or inactive'
      });
    }

    // Check stock availability
    if (product.stock < quantity) {
      return res.status(400).json({
        success: false,
        message: `Only ${product.stock} items available in stock`
      });
    }

    // Handle variant selection
    let variantData = null;
    let price = product.price;

    if (variantId && product.variants.length > 0) {
      const variant = product.variants.id(variantId);
      if (!variant) {
        return res.status(400).json({
          success: false,
          message: 'Invalid product variant'
        });
      }

      if (variant.stock < quantity) {
        return res.status(400).json({
          success: false,
          message: `Only ${variant.stock} items available for this variant`
        });
      }

      variantData = {
        name: variant.name,
        value: variant.value,
        price: variant.price || product.price
      };
      price = variant.price || product.price;
    }

    // Find or create cart - FIXED
    let cart = await Cart.findOne({ user: req.user._id, isActive: true });
    
    if (!cart) {
      console.log('📝 Creating new cart for user');
      cart = new Cart({ user: req.user._id, items: [] });
      await cart.save();
    }

    // Add item to cart - FIXED
    await cart.addItem(
      {
        _id: product._id,
        name: product.name,
        images: product.images,
        price: price
      },
      quantity,
      variantData
    );

    // Get updated cart with populated products
    const updatedCart = await Cart.findById(cart._id)
      .populate({
        path: 'items.product',
        select: 'name price images stock isActive'
      });

    console.log('✅ Item added successfully to cart');

    res.status(200).json({
      success: true,
      message: 'Item added to cart successfully',
      data: {
        cart: updatedCart
      }
    });

  } catch (error) {
    console.error('❌ Add to cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while adding to cart',
      error: error.message
    });
  }
};

/**
 * @desc    Update cart item quantity
 * @route   PUT /api/cart/update/:itemId
 * @access  Private
 */
const updateCartItem = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { itemId } = req.params;
    const { quantity } = req.body;

    console.log('🔄 Updating cart item:', { itemId, quantity });

    const cart = await Cart.findOne({ user: req.user._id, isActive: true });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    // Update quantity
    await cart.updateItemQuantity(itemId, quantity);

    // Get updated cart
    const updatedCart = await Cart.findById(cart._id)
      .populate({
        path: 'items.product',
        select: 'name price images stock isActive'
      });

    res.status(200).json({
      success: true,
      message: 'Cart item updated successfully',
      data: {
        cart: updatedCart
      }
    });

  } catch (error) {
    console.error('❌ Update cart item error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating cart item',
      error: error.message
    });
  }
};

/**
 * @desc    Remove item from cart
 * @route   DELETE /api/cart/remove/:itemId
 * @access  Private
 */
const removeFromCart = async (req, res) => {
  try {
    const { itemId } = req.params;

    console.log('🗑️ Removing item from cart:', itemId);

    const cart = await Cart.findOne({ user: req.user._id, isActive: true });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    await cart.removeItem(itemId);

    // Get updated cart
    const updatedCart = await Cart.findById(cart._id)
      .populate({
        path: 'items.product',
        select: 'name price images stock isActive'
      });

    res.status(200).json({
      success: true,
      message: 'Item removed from cart successfully',
      data: {
        cart: updatedCart
      }
    });

  } catch (error) {
    console.error('❌ Remove from cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while removing from cart',
      error: error.message
    });
  }
};

/**
 * @desc    Clear entire cart
 * @route   DELETE /api/cart/clear
 * @access  Private
 */
const clearCart = async (req, res) => {
  try {
    console.log('🧹 Clearing cart for user:', req.user._id);
    
    const cart = await Cart.findOne({ user: req.user._id, isActive: true });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    await cart.clearCart();

    res.status(200).json({
      success: true,
      message: 'Cart cleared successfully',
      data: {
        cart: {
          _id: cart._id,
          user: req.user._id,
          items: [],
          subtotal: 0,
          totalItems: 0,
          totalQuantity: 0,
          grandTotal: 0,
          isEmpty: true
        }
      }
    });

  } catch (error) {
    console.error('❌ Clear cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while clearing cart',
      error: error.message
    });
  }
};

/**
 * @desc    Get cart summary
 * @route   GET /api/cart/summary
 * @access  Private
 */
const getCartSummary = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id, isActive: true });

    if (!cart) {
      return res.status(200).json({
        success: true,
        message: 'Cart is empty',
        data: {
          summary: {
            totalItems: 0,
            totalQuantity: 0,
            subtotal: 0,
            grandTotal: 0
          }
        }
      });
    }

    const summary = {
      totalItems: cart.totalItems,
      totalQuantity: cart.totalQuantity,
      subtotal: cart.subtotal,
      discountAmount: cart.discountAmount,
      shippingCost: cart.shippingCost,
      grandTotal: cart.grandTotal
    };

    res.status(200).json({
      success: true,
      message: 'Cart summary retrieved successfully',
      data: {
        summary
      }
    });

  } catch (error) {
    console.error('❌ Get cart summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while getting cart summary',
      error: error.message
    });
  }
};

const applyDiscount = async(req,res)=>{
  res.json({Message: "Yet to code !"})
};

const validateCart = async(req,res)=>{
  res.json({Message: "Yet to code !"})
};


module.exports = {
  getCart,
  addToCart,
  validateCart,//temporarily 
  applyDiscount,//added for code
  updateCartItem,
  removeFromCart,
  clearCart,
  getCartSummary
};
