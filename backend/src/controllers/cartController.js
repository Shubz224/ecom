const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { validationResult } = require('express-validator');

// ============ CART CONTROLLER ============

/**
 * @desc    Get user's cart
 * @route   GET /api/cart
 * @access  Private
 */
const getCart = async (req, res) => {
  try {
    const cart = await Cart.getCartWithProducts(req.user._id);

    if (!cart) {
      return res.status(200).json({
        success: true,
        message: 'Cart is empty',
        data: {
          cart: {
            items: [],
            subtotal: 0,
            totalItems: 0,
            totalQuantity: 0,
            grandTotal: 0
          }
        }
      });
    }

    res.status(200).json({
      success: true,
      message: 'Cart retrieved successfully',
      data: {
        cart
      }
    });

  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
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
    if (!product || !product.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Product not found or inactive'
      });
    }

    // Check stock availability
    if (!product.canOrder(quantity)) {
      return res.status(400).json({
        success: false,
        message: `Only ${product.stock} items available in stock`
      });
    }

    // Handle variant selection
    let variantData = null;
    let price = product.price;

    if (variantId) {
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

    // Find or create cart
    const cart = await Cart.findOrCreateCart(req.user._id);

    // Add item to cart
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

    // Get updated cart with product details
    const updatedCart = await Cart.getCartWithProducts(req.user._id);

    res.status(200).json({
      success: true,
      message: 'Item added to cart successfully',
      data: {
        cart: updatedCart
      }
    });

  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
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

    const cart = await Cart.findOne({ user: req.user._id, isActive: true });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    const item = cart.items.id(itemId);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found in cart'
      });
    }

    // Check product availability
    const product = await Product.findById(item.product);
    if (!product || !product.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Product is no longer available'
      });
    }

    // Check stock
    if (quantity > 0 && !product.canOrder(quantity)) {
      return res.status(400).json({
        success: false,
        message: `Only ${product.stock} items available in stock`
      });
    }

    // Update quantity
    await cart.updateItemQuantity(itemId, quantity);

    // Get updated cart
    const updatedCart = await Cart.getCartWithProducts(req.user._id);

    res.status(200).json({
      success: true,
      message: 'Cart item updated successfully',
      data: {
        cart: updatedCart
      }
    });

  } catch (error) {
    console.error('Update cart item error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
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

    const cart = await Cart.findOne({ user: req.user._id, isActive: true });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    await cart.removeItem(itemId);

    // Get updated cart
    const updatedCart = await Cart.getCartWithProducts(req.user._id);

    res.status(200).json({
      success: true,
      message: 'Item removed from cart successfully',
      data: {
        cart: updatedCart
      }
    });

  } catch (error) {
    console.error('Remove from cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
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
          items: [],
          subtotal: 0,
          totalItems: 0,
          totalQuantity: 0,
          grandTotal: 0
        }
      }
    });

  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * @desc    Apply discount to cart
 * @route   POST /api/cart/discount
 * @access  Private
 */
const applyDiscount = async (req, res) => {
  try {
    const { discountCode, discountAmount } = req.body;

    const cart = await Cart.findOne({ user: req.user._id, isActive: true });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    // In a real app, you'd validate the discount code here
    // For now, we'll just apply the discount amount
    await cart.applyDiscount(discountAmount || 0);

    // Get updated cart
    const updatedCart = await Cart.getCartWithProducts(req.user._id);

    res.status(200).json({
      success: true,
      message: 'Discount applied successfully',
      data: {
        cart: updatedCart
      }
    });

  } catch (error) {
    console.error('Apply discount error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * @desc    Validate cart before checkout
 * @route   GET /api/cart/validate
 * @access  Private
 */
const validateCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id, isActive: true });

    if (!cart || cart.isEmpty) {
      return res.status(400).json({
        success: false,
        message: 'Cart is empty'
      });
    }

    // Validate all items
    const invalidItems = await cart.validateCart();

    if (invalidItems.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Some items in your cart are no longer available',
        data: {
          invalidItems
        }
      });
    }

    res.status(200).json({
      success: true,
      message: 'Cart is valid for checkout',
      data: {
        cart: await Cart.getCartWithProducts(req.user._id)
      }
    });

  } catch (error) {
    console.error('Validate cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
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
      grandTotal: cart.grandTotal,
      estimatedDelivery: cart.estimatedDelivery
    };

    res.status(200).json({
      success: true,
      message: 'Cart summary retrieved successfully',
      data: {
        summary
      }
    });

  } catch (error) {
    console.error('Get cart summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  applyDiscount,
  validateCart,
  getCartSummary
};
