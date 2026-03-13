const axios = require("axios");

const BASE_URL =
  process.env.SHIPROCKET_BASE_URL ||
  "https://apiv2.shiprocket.in/v1/external";

let cachedToken = null;
let tokenCreatedAt = null;

// =======================
// GET TOKEN (Auto cache)
// =======================
const getShiprocketToken = async () => {
  try {
    const now = Date.now();

    // reuse token for 8 hours
    if (
      cachedToken &&
      tokenCreatedAt &&
      now - tokenCreatedAt < 8 * 60 * 60 * 1000
    ) {
      return cachedToken;
    }

    const response = await axios.post(
      `${BASE_URL}/auth/login`,
      {
        email: process.env.SHIPROCKET_EMAIL,
        password: process.env.SHIPROCKET_PASSWORD,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    cachedToken = response.data.token;
    tokenCreatedAt = now;

    return cachedToken;
  } catch (error) {
    console.log("Shiprocket login error:");
    console.log(error.response?.data || error.message);
    throw error;
  }
};

// =======================
// Generic API caller
// =======================
const shiprocketRequest = async (
  method,
  endpoint,
  data = null,
  params = null
) => {
  const token = await getShiprocketToken();

  try {
    const response = await axios({
      method,
      url: `${BASE_URL}${endpoint}`,
      data,
      params,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    return response.data;
  } catch (error) {
    console.log("Shiprocket API error:");
    console.log(error.response?.data || error.message);
    throw error;
  }
};

// =======================
// CREATE ORDER
// =======================
const createShiprocketOrder = async (payload) => {
  return shiprocketRequest("post", "/orders/create/adhoc", payload);
};

// =======================
// ASSIGN AWB
// =======================
const assignAwbToShipment = async (shipmentId) => {
  return shiprocketRequest("post", "/courier/assign/awb", {
    shipment_id: shipmentId,
  });
};

// =======================
// GENERATE PICKUP
// =======================
const generatePickup = async (shipmentId) => {
  return shiprocketRequest("post", "/courier/generate/pickup", {
    shipment_id: [shipmentId],
  });
};

// =======================
// TRACK BY AWB
// =======================
const getTrackingByAwb = async (awb) => {
  return shiprocketRequest("get", `/courier/track/awb/${awb}`);
};

module.exports = {
  getShiprocketToken,
  createShiprocketOrder,
  assignAwbToShipment,
  generatePickup,
  getTrackingByAwb,
};