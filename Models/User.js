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
  },trackingId: {
  type: String,
  default: "",
},
resetPasswordToken: { type: String },
resetPasswordExpires: { type: Date },
isVerified: { type: Boolean, default: false },
otp: { type: String, default: "" },
otpExpires: { type: Date },
courierPartner: {
  type: String,
  default: "",
},

estimatedDelivery: {
  type: Date,
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