const UserModel = require("../Models/User");
const Order = require("../Models/Order");

const saveAddress = async (req, res) => {
  try {
    const { fullName, phone, pincode, city, state, street } = req.body;

    if (!fullName || !phone || !pincode || !city || !state || !street) {
      return res.status(400).json({
        success: false,
        message: "All address fields are required",
      });
    }

    const updatedUser = await UserModel.findByIdAndUpdate(
      req.user._id,
      {
        address: { fullName, phone, pincode, city, state, street },
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: "Address saved successfully",
      address: updatedUser.address,
    });
  } catch (error) {
    console.log("Save address error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const placeOrder = async (req, res) => {
  try {
    const { items, address, subtotal, deliveryCharge, total, paymentMethod } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Cart is empty",
      });
    }

    if (
      !address?.fullName ||
      !address?.phone ||
      !address?.pincode ||
      !address?.city ||
      !address?.state ||
      !address?.street
    ) {
      return res.status(400).json({
        success: false,
        message: "Complete address is required",
      });
    }

    const newOrder = new Order({
      user: req.user._id,
      items,
      address,
      subtotal,
      deliveryCharge,
      total,
      paymentMethod: paymentMethod || "COD",
    });

    await newOrder.save();

    await UserModel.findByIdAndUpdate(
      req.user._id,
      { address },
      { new: true }
    );

    res.status(201).json({
      success: true,
      message: "Order placed successfully",
      order: newOrder,
    });
  } catch (error) {
    console.log("Place order error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      orders,
    });
  } catch (error) {
    console.log("Get orders error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = { saveAddress, placeOrder, getMyOrders };