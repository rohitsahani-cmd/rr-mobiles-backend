const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        name: String,
        price: Number,
        quantity: Number,
        image: String,
        category: String,
      },
    ],
    address: {
      fullName: String,
      phone: String,
      pincode: String,
      city: String,
      state: String,
      street: String,
    },
    subtotal: {
      type: Number,
      required: true,
    },
    deliveryCharge: {
      type: Number,
      default: 49,
    },
    trackingId: { type: String, default: "" },      // AWB / tracking number
courierPartner: { type: String, default: "" },
estimatedDelivery: { type: Date },
shiprocketOrderId: { type: String, default: "" },
trackingHistory: [
  {
    status: String,
    location: String,
    time: Date,
  }
],
    total: {
      type: Number,
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ["COD", "ONLINE"],
      default: "COD",
    },
    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid", "Failed"],
      default: "Pending",
    },
   orderStatus: {
  type: String,
  default: "Pending",
},
    razorpayOrderId: {
      type: String,
      default: "",
    },
    razorpayPaymentId: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", OrderSchema);