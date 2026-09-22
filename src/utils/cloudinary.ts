import { v2 as cloudinary } from "cloudinary";

const cloudName = process.env.CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (cloudName && apiKey && apiSecret) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
}

export async function uploadToCloudinary(fileString: string, folder = "kaizen/avatars"): Promise<string> {
  if (!cloudName || !apiKey || !apiSecret) {
    console.warn("Cloudinary credentials not configured in environment.");
    return fileString;
  }

  // If it's already an HTTP/HTTPS URL, return as is
  if (fileString.startsWith("http://") || fileString.startsWith("https://")) {
    return fileString;
  }

  try {
    const result = await cloudinary.uploader.upload(fileString, {
      folder,
      resource_type: "auto",
    });
    return result.secure_url;
  } catch (err) {
    console.error("Cloudinary upload error:", err);
    return fileString; // Fallback to provided string
  }
}
