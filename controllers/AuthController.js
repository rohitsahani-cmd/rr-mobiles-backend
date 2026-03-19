const UserModel = require("../Models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const crypto = require("crypto");
const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

// ================= MAIL HELPERS =================
const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const sendOtpEmail = async (email, name, otp) => {
  const { error } = await resend.emails.send({
    from: "RR Mobiles <onboarding@resend.dev>",
    to: email,
    subject: "Verify your account - OTP",
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Hello ${name},</h2>
        <p>Your OTP for account verification is:</p>
        <h1 style="color: #ff6600; letter-spacing: 3px;">${otp}</h1>
        <p>This OTP is valid for 5 minutes.</p>
        <p>If you did not request this, please ignore this email.</p>
      </div>
    `,
  });

  if (error) {
    throw new Error(error.message || "Failed to send OTP email");
  }
};

const sendResetEmail = async (email, resetLink) => {
  const { error } = await resend.emails.send({
    from: "RR Mobiles <onboarding@resend.dev>",
    to: email,
    subject: "Password Reset",
    html: `
      <h2>Password Reset Request</h2>
      <p>Click below to reset your password:</p>
      <a href="${resetLink}">${resetLink}</a>
      <p>This link expires in 15 minutes.</p>
    `,
  });

  if (error) {
    throw new Error(error.message || "Failed to send reset email");
  }
};

// ================= SIGNUP =================
const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    let user = await UserModel.findOne({ email });

    if (user && user.isVerified) {
      return res.status(400).json({
        success: false,
        message: "User already exists. Please login.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = generateOtp();
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000);

    if (user && !user.isVerified) {
      user.name = name;
      user.password = hashedPassword;
      user.otp = otp;
      user.otpExpires = otpExpires;
      await user.save();
    } else {
      user = new UserModel({
        name,
        email,
        password: hashedPassword,
        isVerified: false,
        otp,
        otpExpires,
      });
      await user.save();
    }

    try {
      await sendOtpEmail(email, name, otp);
    } catch (mailError) {
      console.log("OTP mail send error:", mailError);

      return res.status(500).json({
        success: false,
        message: "Could not send OTP email right now. Please try again later.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "OTP sent to your email. Please verify your account.",
      email,
    });
  } catch (error) {
    console.log("Signup error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ================= VERIFY SIGNUP OTP =================
const verifySignupOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    const user = await UserModel.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: "User already verified. Please login.",
      });
    }

    if (!user.otp || user.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    if (!user.otpExpires || user.otpExpires < new Date()) {
      return res.status(400).json({
        success: false,
        message: "OTP expired. Please request a new one.",
      });
    }

    user.isVerified = true;
    user.otp = "";
    user.otpExpires = null;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Email verified successfully. You can now login.",
    });
  } catch (error) {
    console.log("Verify OTP error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ================= RESEND SIGNUP OTP =================
const resendSignupOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const user = await UserModel.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: "User already verified. Please login.",
      });
    }

    const otp = generateOtp();
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000);

    user.otp = otp;
    user.otpExpires = otpExpires;
    await user.save();

    try {
      await sendOtpEmail(user.email, user.name, otp);
    } catch (mailError) {
      console.log("Resend OTP mail error:", mailError);

      return res.status(500).json({
        success: false,
        message: "Could not resend OTP email right now. Please try again later.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "New OTP sent successfully",
    });
  } catch (error) {
    console.log("Resend OTP error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ================= GOOGLE LOGIN =================
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const googleLogin = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Google token is required",
      });
    }

    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name } = payload;

    let user = await UserModel.findOne({ email });

    if (!user) {
      user = await UserModel.create({
        name,
        email,
        password: "google-auth",
        role: "user",
        isVerified: true,
      });
    } else if (!user.isVerified) {
      user.isVerified = true;
      user.otp = "";
      user.otpExpires = null;
      await user.save();
    }

    const jwtToken = jwt.sign(
      { email: user.email, id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    return res.status(200).json({
      success: true,
      message: "Google login successful",
      token: jwtToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.log("Google login full error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Google authentication failed",
    });
  }
};

// ================= LOGIN =================
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const user = await UserModel.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found, please register",
      });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email before logging in",
      });
    }

    const isPassEqual = await bcrypt.compare(password, user.password);

    if (!isPassEqual) {
      return res.status(401).json({
        success: false,
        message: "Wrong password",
      });
    }

    const token = jwt.sign(
      { email: user.email, id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.log("Login error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ================= FORGOT PASSWORD =================
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const user = await UserModel.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }//auth

    const resetToken = crypto.randomBytes(32).toString("hex");

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;

    await user.save();

    const resetLink = `https://rrmobilesolutions.vercel.app/auth/reset-password/${resetToken}`;

    try {
      await sendResetEmail(user.email, resetLink);
    } catch (mailError) {
      console.log("Forgot password mail error:", mailError);//rohith sahani is used

      return res.status(500).json({
        success: false,
        message: "Could not send password reset email right now. Please try again later.",
      });//error
    }

    return res.status(200).json({
      success: true,
      message: "Password reset link sent to email",
    });
  } catch (error) {
    console.log("Forgot password error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ================= RESET PASSWORD =================
const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: "Password is required",
      });
    }

    const user = await UserModel.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired token",
      });
    }
    const hashedPassword = await bcrypt.hash(password, 10);

    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password reset successful",
    });
  } catch (error) {
    console.log("Reset password error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  signup,
  verifySignupOtp,
  resendSignupOtp,
  login,
  googleLogin,
  forgotPassword,
  resetPassword,
};