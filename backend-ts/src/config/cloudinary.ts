import { v2 as cloudinary, ConfigOptions } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

const cloudName: string | undefined = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey: string | undefined = process.env.CLOUDINARY_API_KEY;
const apiSecret: string | undefined = process.env.CLOUDINARY_API_SECRET;

if (!cloudName || !apiKey || !apiSecret) {
  throw new Error("Cloudinary environment variables are not set properly");
}

const configOptions: ConfigOptions = {
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
};

cloudinary.config(configOptions);

export default cloudinary;
