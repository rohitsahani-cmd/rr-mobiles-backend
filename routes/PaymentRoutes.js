const express = require("express");
const crypto = require("crypto");
const razorpay = require("../config/Razorpay");

const router = express.Router();

router.post("/create-order", async (req, res) => {
  try {
    const { amount } = req.body;

    console.log("Razorpay key used:", process.env.RAZORPAY_KEY_ID);
    console.log("Amount received from frontend:", amount);

    const options = {
      amount: Number(amount) * 100,
      currency: "INR",
      receipt: `receipt_${Date.now()}`
    };

    console.log("Order options:", options);

    const order = await razorpay.orders.create(options);

    console.log("Created Razorpay order:", order);

    res.status(200).json({
      success: true,
      order
    });
  } catch (error) {
    console.log("Create order error:", error);
    res.status(500).json({
      success: false,
      message: "Order creation failed"
    });
  }
});

router.post("/verify-payment", async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    const isAuthentic = expectedSignature === razorpay_signature;

    if (!isAuthentic) {
      return res.status(400).json({
        success: false,
        message: "Payment verification failed",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Payment verified successfully",
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
    });
  } catch (error) {
    console.log("Verify payment error:", error);
    res.status(500).json({
      success: false,
      message: "Verification failed",
    });
  }
});

module.exports = router;