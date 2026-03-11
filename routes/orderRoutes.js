const express = require("express");
const router = express.Router();
const { saveAddress, placeOrder, getMyOrders } = require("../controllers/orderControllers");
const isAuthenticated = require("../middlewares/isAuthenticated");

router.post("/save-address", isAuthenticated, saveAddress);
router.post("/place-order", isAuthenticated, placeOrder);
router.get("/my-orders", isAuthenticated, getMyOrders);

module.exports = router;