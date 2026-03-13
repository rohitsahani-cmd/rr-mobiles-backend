const UserModel = require("../Models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
// ================= MAIL SETUP =================
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const sendOtpEmail = async (email, name, otp) => {
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
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
};

// ================= SIGNUP =================
const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    let user = await UserModel.findOne({ email });

    if (user && user.isVerified) {
      return res.status(400).json({
        success: false,
        message: "User already exists. Please login.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = generateOtp();
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 min

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

    await sendOtpEmail(email, name, otp);

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

    await sendOtpEmail(user.email, user.name, otp);

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
    console.log("BACKEND GOOGLE_CLIENT_ID:", process.env.GOOGLE_CLIENT_ID);

    const { token } = req.body;
    console.log("Token received:", !!token);

    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    console.log("Google payload:", payload);

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
    }

    const jwtToken = jwt.sign(
      { _id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(200).json({
      success: true,
      message: "Google login successful",
      token: jwtToken,
      user,
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
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await UserModel.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000; // 15 minutes

    await user.save();

    const resetLink = `https://rrmobilessolutions.netlify.app/auth/reset-password/${resetToken}`;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: "Password Reset",
      html: `
        <h2>Password Reset Request</h2>
        <p>Click below to reset your password:</p>
        <a href="${resetLink}">${resetLink}</a>
        <p>This link expires in 15 minutes.</p>
      `,
    });

    res.json({
      success: true,
      message: "Password reset link sent to email",
    });
  } catch (error) {
    console.log("Forgot password error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

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

    res.json({
      success: true,
      message: "Password reset successful",
    });
  } catch (error) {
    console.log("Reset password error:", error);
    res.status(500).json({
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
  googleLogin,forgotPassword,resetPassword
};




// import { User } from "../database/models/userModel.js";
// import bcrypt from "bcryptjs";
// import jwt from "jsonwebtoken";
// import { verifyEmail } from "../emailVerify/verifyEmail.js";
// import { Session } from "../database/models/sessionModel.js";
// import crypto from "crypto";
// import { sendEmail } from "../emailVerify/sendOtpMail.js";

// export const register = async (req, res) => {
//     try {
//         const { firstName, lastName, email, password } = req.body;

//         if (!firstName || !lastName || !email || !password) {
//             return res.status(400).json({
//                 success: false,
//                 message: "All fields are required"
//             });
//         }

//         const user = await User.findOne({ email });

//         if (user) {
//             return res.status(400).json({
//                 success: false,
//                 message: "User already exists"
//             });
//         }

//         const hashedPassword = await bcrypt.hash(password, 10);

//         const newUser = await User.create({
//             firstName,
//             lastName,
//             email,
//             password: hashedPassword
//         });
//         const token = jwt.sign(
//             { id: newUser._id },
//             process.env.SECRET_KEY,
//             { expiresIn: "10m" }
//         );


//         newUser.token = token;
//         await newUser.save();

//         await verifyEmail(token, email);

//         return res.status(201).json({
//             success: true,
//             message: "User Registered Successfully",
//             user: newUser
//         });

//     } catch (error) {
//         return res.status(500).json({
//             success: false,
//             message: error.message
//         });
//     }
// };

// export const verify = async (req, res) => {
//     try {
//         const authHeader = req.headers.authorization;

//         if (!authHeader || !authHeader.startsWith("Bearer ")) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Authorization token is missing"
//             });
//         }

//         const token = authHeader.split(" ")[1];

//         let decoded;
//         try {
//             decoded = jwt.verify(token, process.env.SECRET_KEY);
//         } catch (error) {
//             if (error.name === "TokenExpiredError") {
//                 return res.status(400).json({
//                     success: false,
//                     message: "Link has expired"
//                 });
//             }

//             return res.status(400).json({
//                 success: false,
//                 message: "Verification failed"
//             });
//         }

//         const user = await User.findById(decoded.id); // use lowercase id

//         if (!user) {
//             return res.status(404).json({
//                 success: false,
//                 message: "User not found"
//             });
//         }

//         if (user.isVerified) {
//             return res.status(400).json({
//                 success: false,
//                 message: "User already verified"
//             });
//         }

//         user.token = null;
//         user.isVerified = true;
//         await user.save();

//         return res.status(200).json({
//             success: true,
//             message: "Email verified successfully"
//         });

//     } catch (error) {
//         return res.status(500).json({
//             success: false,
//             message: error.message
//         });
//     }
// };

// export const reVerify = async (req, res) => {
//     try {
//         const { email } = req.body;

//         if (!email) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Email is required"
//             });
//         }

//         const user = await User.findOne({ email });

//         if (!user) {
//             return res.status(404).json({
//                 success: false,
//                 message: "User not found"
//             });
//         }

//         if (user.isVerified) {
//             return res.status(400).json({
//                 success: false,
//                 message: "User is already verified"
//             });
//         }

//         const token = jwt.sign(
//             { id: user._id },
//             process.env.SECRET_KEY,
//             { expiresIn: '10m' }
//         );

//         user.token = token;
//         await user.save();

//         await verifyEmail(token, email); // make sure this is awaited

//         return res.status(200).json({
//             success: true,
//             message: "Verification email sent agian successfully"
//             // ❌ Do NOT send token back in response
//         });

//     } catch (error) {
//         return res.status(500).json({
//             success: false,
//             message: error.message
//         });
//     }
// };
// export const login = async (req, res) => {
//     try {
//         const { email, password } = req.body;
//         if (!email || !password) {
//             return res.status(400).json({
//                 success: false,
//                 message: "all fields are required"
//             })
//         }
//         const existingUser = await User.findOne({ email })
//         if (!existingUser) {
//             return res.status(400).json({
//                 success: false,
//                 message: "user not exist please register"
//             })

//         }
//         const isPasswordValid = await bcrypt.compare(password, existingUser.password)
//         if (!isPasswordValid) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Invalic Credentials"
//             })
//         }
//         if (existingUser.isVerified == false) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Register and then login"
//             })
//         }
//        const accessToken = jwt.sign(
//     { id: existingUser._id },
//     process.env.SECRET_KEY,
//     { expiresIn: "15m" }
// );

// const refreshToken = jwt.sign(
//     { id: existingUser._id },
//     process.env.SECRET_KEY,
//     { expiresIn: "7d" }
// );

// existingUser.isLoggedIn = true;
// await existingUser.save();

// // remove old session (optional single-device login)
// await Session.deleteOne({ userId: existingUser._id });

// await Session.create({
//     userId: existingUser._id,
//     refreshToken: refreshToken,   // ✅ REQUIRED
//     userAgent: req.headers["user-agent"],
//     ipAddress: req.ip
// });
//         return res.status(200).json({
//             success: true,
//             message: `welcome back ${existingUser.firstName}`,
//             user: existingUser,
//             accessToken,
//             refreshToken
//         })




//     } catch (error) {
//         res.status(500).json({
//             success: false,
//             message: error.message
//         })

//     }
// }
// export const logout = async (req, res) => {
//     try {
//         const authHeader = req.headers.authorization;

//         if (!authHeader || !authHeader.startsWith("Bearer ")) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Authorization token missing"
//             });
//         }

//         const token = authHeader.split(" ")[1];

//         let decoded;
//         try {
//             decoded = jwt.verify(token, process.env.SECRET_KEY);
//         } catch (error) {
//             return res.status(401).json({
//                 success: false,
//                 message: "Invalid or expired token"
//             });
//         }

//         const user = await User.findById(decoded.id);

//         if (!user) {
//             return res.status(404).json({
//                 success: false,
//                 message: "User not found"
//             });
//         }

        
//         await Session.deleteOne({ userId: user._id });

//         user.isLoggedIn = false;
//         await user.save();

//         return res.status(200).json({
//             success: true,
//             message: "Logged out successfully"
//         });

//     } catch (error) {
//         return res.status(500).json({
//             success: false,
//             message: error.message
//         });
//     }
// };


// // ================= SEND RESET OTP =================
// export const sendResetOtp = async (req, res) => {
//   try {
//     const { email } = req.body;

//     const user = await User.findOne({ email });

//     if (!user) {
//       return res.status(400).json({
//         success: false,
//         message: "User not found"
//       });
//     }

//     const otp = crypto.randomInt(100000, 999999).toString();

//     const hashedOtp = crypto
//       .createHash("sha256")
//       .update(otp)
//       .digest("hex");

//     user.resetOtp = hashedOtp;
//     user.resetOtpExpire = Date.now() + 10 * 60 * 1000;

//     await user.save();

//     const message = `
// Hi ${user.firstName},

// Your password reset OTP is:

// ${otp}

// It will expire in 10 minutes.
// `;

//     await sendEmail(user.email, "Password Reset OTP", message);

//     return res.json({
//       success: true,
//       message: "OTP sent to email"
//     });

//   } catch (error) {
//     return res.status(500).json({
//       success: false,
//       message: error.message
//     });
//   }
// };

// // ================= VERIFY RESET OTP =================
// export const verifyResetOtp = async (req, res) => {
//     try {
//         const { email, otp, newPassword } = req.body;

//         if (!email || !otp || !newPassword) {
//             return res.status(400).json({
//                 success: false,
//                 message: "All fields are required"
//             });
//         }

//         const hashedOtp = crypto
//             .createHash("sha256")
//             .update(otp)
//             .digest("hex");

//         const user = await User.findOne({
//             email,
//             resetOtp: hashedOtp,
//             resetOtpExpire: { $gt: Date.now() }
//         });

//         if (!user) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Invalid or expired OTP"
//             });
//         }

//         const hashedPassword = await bcrypt.hash(newPassword, 10);

//         user.password = hashedPassword;
//         user.resetOtp = undefined;
//         user.resetOtpExpire = undefined;

//         await user.save();

//         return res.status(200).json({
//             success: true,
//             message: "Password reset successfully"
//         });

//     } catch (error) {
//         return res.status(500).json({
//             success: false,
//             message: error.message
//         });
//     }
// };

// export const allUser = async (req, res) => {
    
//   try {
//     const users = await User.find().select("-password -resetOtp -resetOtpExpire -token");
//     return res.status(200).json({
//       success: true,
//       users
//     });
//   } catch (error) {
//     return res.status(500).json({
//       success: false,
//       message: error.message
//     });
//   }
// };

// export const getUserById=async(req,res)=>{
//     try {
//         const {userId}=req.params;
//         const user=findById(userId).select("-otp -password -token -otpExxpiry")
//         if(!user){
//             return res.status(404).json({
//                 success:false,
//                 message:"user not found"
//             })
//         }
//         res.status(200).json({
//             success:true,
//             user
//         })
        
//     } catch (error) {
//         return res.status(500).json({
//             success:false,
//             message:error.message
//         })
//     }
// }