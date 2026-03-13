const Product = require("../Models/Product");

const addProduct = async (req, res) => {
  try {
    const { name, price, description, category, quantity } = req.body;

    if (!name || !price || !description || !category || quantity === undefined) {
      return res.status(400).json({
        success: false,
        message: "Name, price, description, category, and quantity are required",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Product image is required",
      });
    }

const imageUrl = `https://rr-mobiles-backend-1.onrender.com/uploads/${req.file.filename}`;

    const newProduct = new Product({
      name,
      price,
      description,
      category,
      image: imageUrl,
      quantity: Number(quantity),
    });

    await newProduct.save();

    res.status(201).json({
      success: true,
      message: "Product added successfully",
      product: newProduct,
    });
  } catch (error) {
    console.log("Add product error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getProducts = async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      products,
    });
  } catch (error) {
    console.log("Get products error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedProduct = await Product.findByIdAndDelete(id);

    if (!deletedProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.log("Delete product error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = { addProduct, getProducts, deleteProduct };