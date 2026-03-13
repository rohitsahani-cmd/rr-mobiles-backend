const UserModel = require("../Models/User");
const Order = require("../Models/Order");
const Product = require("../Models/Product");
const {
  createShiprocketOrder,
  assignAwbToShipment,
  generatePickup,
  getTrackingByAwb,
} = require("../services/shiprocketService");

// =========================
// SAVE ADDRESS
// =========================
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

    return res.status(200).json({
      success: true,
      message: "Address saved successfully",
      address: updatedUser.address,
    });
  } catch (error) {
    console.log("Save address error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =========================
// PLACE ORDER
// =========================
const placeOrder = async (req, res) => {
  try {
    const {
      items,
      address,
      subtotal,
      deliveryCharge,
      total,
      paymentMethod,
      paymentStatus,
      razorpayOrderId,
      razorpayPaymentId,
    } = req.body;

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

    // =========================
    // CHECK STOCK FIRST
    // =========================
    for (const item of items) {
      const product = await Product.findById(item.productId);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product not found`,
        });
      }

      if (product.quantity < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `${product.name} is out of stock or insufficient quantity`,
        });
      }
    }

    let finalPaymentStatus = "Pending";
    let finalOrderStatus = "Pending";

    if (paymentMethod === "COD") {
      finalPaymentStatus = "Pending";
      finalOrderStatus = "Confirmed";
    }

    if (paymentMethod === "ONLINE") {
      finalPaymentStatus = paymentStatus === "Paid" ? "Paid" : "Pending";
      finalOrderStatus = paymentStatus === "Paid" ? "Confirmed" : "Pending";
    }

    const newOrder = new Order({
      user: req.user._id,
      items,
      address,
      subtotal,
      deliveryCharge,
      total,
      paymentMethod,
      paymentStatus: finalPaymentStatus,
      orderStatus: finalOrderStatus,
      razorpayOrderId: razorpayOrderId || "",
      razorpayPaymentId: razorpayPaymentId || "",
    });

    await newOrder.save();

    // =========================
    // REDUCE STOCK AFTER ORDER SAVED
    // =========================
    for (const item of items) {
      const product = await Product.findById(item.productId);
      product.quantity -= item.quantity;
      await product.save();
    }

    await UserModel.findByIdAndUpdate(
      req.user._id,
      { address },
      { new: true }
    );

    return res.status(201).json({
      success: true,
      message: "Order placed successfully",
      order: newOrder,
    });
  } catch (error) {
    console.log("Place order error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =========================
// GET MY ORDERS
// =========================
const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      orders,
    });
  } catch (error) {
    console.log("Get my orders error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =========================
// GET ALL ORDERS FOR ADMIN
// =========================
const getAllOrdersAdmin = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      orders,
    });
  } catch (error) {
    console.log("Get all admin orders error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =========================
// UPDATE ORDER STATUS BY ADMIN
// =========================
const updateOrderStatusAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { orderStatus, trackingId, courierPartner, estimatedDelivery } =
      req.body;

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (orderStatus) order.orderStatus = orderStatus;
    if (trackingId) order.trackingId = trackingId;
    if (courierPartner) order.courierPartner = courierPartner;
    if (estimatedDelivery) order.estimatedDelivery = estimatedDelivery;

    await order.save();

    return res.json({
      success: true,
      message: "Order updated successfully",
      order,
    });
  } catch (error) {
    console.log("Update order status error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =========================
// DELETE CANCELLED ORDER
// =========================
const deleteOrderAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (order.orderStatus !== "Cancelled") {
      return res.status(400).json({
        success: false,
        message: "Only cancelled orders can be deleted",
      });
    }

    await Order.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Order deleted successfully",
    });
  } catch (error) {
    console.log("Delete order error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =========================
// CREATE SHIPMENT IN SHIPROCKET
// =========================
const createShipmentForOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id).populate("user");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (!order.items || order.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Order items not found",
      });
    }

    const payload = {
      order_id: order._id.toString(),
      order_date: new Date(order.createdAt)
        .toISOString()
        .slice(0, 19)
        .replace("T", " "),
      pickup_location: "work",
      billing_customer_name:
        order.address?.fullName || order.user?.name || "Customer",
      billing_last_name: "",
      billing_address: order.address?.street || "",
      billing_city: order.address?.city || "",
      billing_pincode: order.address?.pincode || "",
      billing_state: order.address?.state || "",
      billing_country: "India",
      billing_email: order.user?.email || "test@example.com",
      billing_phone: order.address?.phone || "9999999999",
      shipping_is_billing: true,
      order_items: order.items.map((item) => ({
        name: item.name,
        sku: item.productId?.toString?.() || item.name || "SKU",
        units: item.quantity || 1,
        selling_price: item.price || 0,
      })),
      payment_method: order.paymentMethod === "COD" ? "COD" : "Prepaid",
      sub_total: order.subtotal || order.total || 0,
      length: 10,
      breadth: 10,
      height: 5,
      weight: 0.5,
    };

    const sr = await createShiprocketOrder(payload);

    if (!sr?.shipment_id) {
      return res.status(400).json({
        success: false,
        message: sr?.message || "Shipment ID not received from Shiprocket",
        shiprocket: sr,
      });
    }

    order.shiprocketOrderId =
      sr?.order_id?.toString?.() || sr?.order_id || "";
    order.shipmentId =
      sr?.shipment_id?.toString?.() || sr?.shipment_id || "";

    let awbResponse = null;
    let awbError = null;

    try {
      awbResponse = await assignAwbToShipment(sr.shipment_id);
      console.log("AWB RESPONSE:", awbResponse);
    } catch (error) {
      awbError = error?.response?.data || error.message;
      console.log("AWB ERROR:", awbError);
    }

    const awbData = awbResponse?.response?.data || awbResponse?.data || {};
    const assignedAwb =
      awbData?.awb_code?.toString?.() ||
      awbResponse?.awb_code?.toString?.() ||
      "";

    const assignedCourier =
      awbData?.courier_name || awbResponse?.courier_name || "";

    let pickupResponse = null;
    let pickupError = null;

    if (assignedAwb) {
      try {
        pickupResponse = await generatePickup(sr.shipment_id);
        console.log("PICKUP RESPONSE:", pickupResponse);
      } catch (error) {
        pickupError = error?.response?.data || error.message;
        console.log("PICKUP ERROR:", pickupError);
      }
    }

    order.trackingId = assignedAwb || order.trackingId || "";
    order.courierPartner = assignedCourier || order.courierPartner || "";

    if (order.trackingId) {
      order.orderStatus = "Shipped";
    } else {
      order.orderStatus = "Confirmed";
    }

    await order.save();

    let finalMessage = "Shiprocket order created";

    if (order.trackingId) {
      finalMessage = "Shipment created and AWB assigned successfully";
    } else if (awbResponse?.message) {
      finalMessage = awbResponse.message;
    }

    return res.json({
      success: true,
      message: finalMessage,
      shiprocket: sr,
      awbResponse,
      awbError,
      pickupResponse,
      pickupError,
      order,
    });
  } catch (error) {
    console.log(
      "Create shipment error:",
      error?.response?.data || error.message
    );

    return res.status(500).json({
      success: false,
      message: error?.response?.data?.message || error.message,
      error: error?.response?.data || null,
    });
  }
};

// =========================
// SYNC TRACKING FROM SHIPROCKET
// =========================
const syncTracking = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id);

    if (!order || !order.trackingId) {
      return res.status(404).json({
        success: false,
        message: "Order or tracking ID not found",
      });
    }

    const tracking = await getTrackingByAwb(order.trackingId);

    const activities =
      tracking?.tracking_data?.shipment_track_activities || [];
    const currentStatus =
      tracking?.tracking_data?.shipment_track?.[0]?.current_status ||
      order.orderStatus;

    order.trackingHistory = activities.map((item) => ({
      status: item.activity || item.status || "",
      location: item.location || "",
      time: item.date ? new Date(item.date) : new Date(),
    }));

    if (currentStatus) {
      order.orderStatus = currentStatus;
    }

    await order.save();

    return res.json({
      success: true,
      message: "Tracking synced successfully",
      order,
      tracking,
    });
  } catch (error) {
    console.log("Sync tracking error:", error?.response?.data || error.message);

    return res.status(500).json({
      success: false,
      message: error?.response?.data?.message || error.message,
      error: error?.response?.data || null,
    });
  }
};

module.exports = {
  saveAddress,
  placeOrder,
  getMyOrders,
  getAllOrdersAdmin,
  updateOrderStatusAdmin,
  deleteOrderAdmin,
  createShipmentForOrder,
  syncTracking,
};