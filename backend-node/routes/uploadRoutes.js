const express = require("express");
const multer = require("multer");
const authMiddleware = require("../middleware/authMiddleware");
const cloudinary = require("../config/cloudinary");
const { CloudinaryStorage } = require("multer-storage-cloudinary");

const router = express.Router();

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "apna-invoice-signatures",
    allowed_formats: ["jpg", "jpeg", "png"],
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

router.post("/", authMiddleware, upload.single("file"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    return res.status(200).json({
      success: true,
      message: "File uploaded successfully",
      file: {
        id: req.file.filename,
        name: req.file.originalname,
        url: req.file.path,
        type: req.file.mimetype,
        size: req.file.size,
        uploadedAt: new Date().toISOString(),
        uploadedBy: req.user.id,
      },
    });
  } catch (error) {
    console.error("Upload error:", error);

    return res.status(500).json({
      success: false,
      message: "File upload failed",
      error: error.message,
    });
  }
});

router.delete("/delete", authMiddleware, async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        message: "URL is required",
      });
    }

    const parts = url.split("/upload/");
    if (parts.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Invalid Cloudinary URL",
      });
    }

    

    console.log("Deleting from Cloudinary:", publicId);

    const result = await cloudinary.uploader.destroy(publicId);

    console.log("Cloudinary delete result:", result);

    return res.status(200).json({
      success: true,
      message: "Signature deleted successfully",
      result,
    });
  } catch (error) {
    console.error("Cloudinary delete error:", error);

    return res.status(500).json({
      success: false,
      message: "File delete failed",
      error: error.message,
    });
  }
});

module.exports = router; 