const express = require("express");
const router = express.Router();

const {
  saveAddress,
  placeOrder,
  getMyOrders,
  getAllOrdersAdmin,
  updateOrderStatusAdmin,
  deleteOrderAdmin,
  createShipmentForOrder,
  syncTracking,
} = require("../controllers/orderControllers");

const isAuthenticated = require("../middlewares/isAuthenticated");
const isAdmin = require("../middlewares/isAdmin");

// User routes
router.post("/save-address", isAuthenticated, saveAddress);
router.post("/place-order", isAuthenticated, placeOrder);
router.get("/my-orders", isAuthenticated, getMyOrders);

// Admin routes
router.get("/admin/all", isAuthenticated, isAdmin, getAllOrdersAdmin);
router.put("/admin/update/:id", isAuthenticated, isAdmin, updateOrderStatusAdmin);
router.delete("/admin/delete/:id", isAuthenticated, isAdmin, deleteOrderAdmin);
router.post("/admin/ship/:id", isAuthenticated, isAdmin, createShipmentForOrder);

// Tracking
router.get("/track/:id", isAuthenticated, syncTracking);

module.exports = router;