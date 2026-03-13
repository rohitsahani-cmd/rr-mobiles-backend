const Joi = require("joi");

const signupValidation = (req, res, next) => {
    const schema = Joi.object({
        name: Joi.string().min(3).max(100).required(),
        email: Joi.string().email().required(),
        password: Joi.string().min(4).max(100).required()
    });

    const { error } = schema.validate(req.body);

    if (error) {
        return res.status(400).json({
            message: "bad request",
            error: error.details[0].message
        });
    }

    next();
};
const jwt = require("jsonwebtoken");

// VERIFY TOKEN
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "No token provided",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secretkey");

    req.user = decoded; // attach user data
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid token",
    });
  }
};

// VERIFY ADMIN
const verifyAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Admin access required",
    });
  }

  next();
};

module.exports = { verifyToken, verifyAdmin };

const loginValidation = (req, res, next) => {
    const schema = Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().min(4).max(100).required()
    });

    const { error } = schema.validate(req.body);

    if (error) {
        return res.status(400).json({
            message: "bad request",
            error: error.details[0].message
        });
    }

    next();
};

module.exports = {
    signupValidation,
    loginValidation
};
