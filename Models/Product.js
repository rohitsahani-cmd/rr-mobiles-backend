const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    quantity: {
  type: Number,
  required: true,
  default: 0,
},inStock: {
  type: Boolean,
  default: true,
},
    category: {
      type: String,
      required: true,
      enum: [
        "Mobiles",
        "Electronics",
        "Accessories",
        "Tablets",
        "Laptops",
        "Smartwatches",
        "Headphones",
        "Chargers",
        "Mobile Case",
        "Screen Guard",
        "Laptop Skins",
        "Mobile Skins"
      ],
    },
    image: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", ProductSchema);