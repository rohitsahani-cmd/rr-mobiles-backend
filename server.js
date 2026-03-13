const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config();

const paymentRoutes = require("./routes/PaymentRoutes");
const AuthRouter = require("./routes/AuthRouter.js");
const productRoutes = require("./routes/productRoutes.js");
const orderRoutes = require("./routes/orderRoutes");
const shiprocketRoutes = require("./routes/shiprocketroutes");

const app = express();

mongoose
  .connect(process.env.MONGO_URL)
  .then(() => console.log("MongoDB Connected"))
  .catch((error) => console.log("MongoDB connection error:", error));

const PORT = process.env.PORT || 3000;

const allowedOrigins = [
  "http://localhost:5173",
  "https://rrmobilessolutions.netlify.app",
];

app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());
app.use(bodyParser.json());
app.use(cookieParser());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes
app.use("/api/payment", paymentRoutes);
app.use("/auth", AuthRouter);
app.use("/api/orders", orderRoutes);
app.use("/api/products", productRoutes);
app.use("/api/shiprocket", shiprocketRoutes);

app.get("/", (req, res) => {
  res.send("Backend is running");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});