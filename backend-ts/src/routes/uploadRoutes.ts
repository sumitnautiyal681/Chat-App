import express, { Request, Response } from "express";
import multer from "multer";
import { v2 as cloudinary, UploadApiResponse } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();

// Cloudinary config
const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (!cloudName || !apiKey || !apiSecret) {
  throw new Error("Cloudinary environment variables are not set properly");
}

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
});

const upload = multer(); // default memory storage

router.post("/", upload.single("file"), (req: Request, res: Response) => {
  const file = req.file;
  console.log("Received file:", file); // <- DEBUG

  if (!file) return res.status(400).json({ error: "No file uploaded" });

  const stream = cloudinary.uploader.upload_stream(
    { resource_type: "auto" },
    (error: Error | undefined, result: UploadApiResponse | undefined) => {
      if (error) {
        console.error("Cloudinary error:", error);
        return res.status(500).json({ error: error.message });
      }
      if (result) {
        console.log("Uploaded file:", result.secure_url); // <- DEBUG
        res.json({ fileUrl: result.secure_url });
      }
    }
  );

  stream.end(file.buffer);
});

export default router;
