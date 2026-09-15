const { v2: cloudinary } = require("cloudinary");

let configured = false;

const getCloudinaryConfig = () => ({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const configureCloudinary = () => {
  const config = getCloudinaryConfig();

  if (!config.cloud_name || !config.api_key || !config.api_secret) {
    throw new Error("Cloudinary credentials are not configured");
  }

  if (!configured) {
    cloudinary.config(config);
    configured = true;
  }

  return cloudinary;
};

module.exports = {
  cloudinary,
  configureCloudinary,
};
