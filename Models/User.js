const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const UserSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user",
  },
  address: {
    fullName: { type: String, default: "" },
    phone: { type: String, default: "" },
    pincode: { type: String, default: "" },
    city: { type: String, default: "" },
    state: { type: String, default: "" },
    street: { type: String, default: "" },
  },
});

module.exports = mongoose.model("users", UserSchema);