const express = require("express");
const router = express.Router();

const { testShiprocketLogin } = require("../controllers/shiprocketController");

router.get("/test-login", testShiprocketLogin);

module.exports = router;