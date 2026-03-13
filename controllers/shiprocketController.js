const { getShiprocketToken } = require("../services/shiprocketService");

const testShiprocketLogin = async (req, res) => {
  try {
    const data = await getShiprocketToken();

    return res.status(200).json({
      success: true,
      message: "Shiprocket login successful",
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Shiprocket login failed",
      error: error.response?.data || error.message,
    });
  }
};

module.exports = { testShiprocketLogin };