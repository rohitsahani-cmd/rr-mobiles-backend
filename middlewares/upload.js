const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueName + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error("Only jpg, jpeg, png, webp files are allowed"));
  }
};

const upload = multer({
  storage,
  fileFilter,
});

module.exports = upload;

//  <button className="bg-gray-100 p-2 rounded-lg hover:bg-gray-200 transition">
//             <span className="text-red-500 text-lg">♡</span>
//           </button>
     