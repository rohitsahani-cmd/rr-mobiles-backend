const express = require("express");
const router = express.Router();

const {
  addProduct,
  getProducts,
  deleteProduct,
} = require("../controllers/producController");

const isAuthenticated = require("../middlewares/isAuthenticated");
const isAdmin = require("../middlewares/isAdmin");
const upload = require("../middlewares/upload");
router.post("/add", isAuthenticated, isAdmin, upload.single("image"), addProduct);
router.get("/get", getProducts);
router.delete("/delete/:id", isAuthenticated, isAdmin, deleteProduct);

module.exports = router;