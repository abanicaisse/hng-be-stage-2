import AWS from "aws-sdk";

// Configure AWS SDK
AWS.config.update({
  region: process.env.AWS_REGION || "us-east-1",
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

// Create S3 instance
export const s3 = new AWS.S3({
  apiVersion: "2006-03-01",
  signatureVersion: "v4",
});

// S3 Bucket name
export const S3_BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || "";

// Validate configuration
if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
  console.warn(
    "⚠️  AWS credentials not configured. S3 features will not work."
  );
}

if (!S3_BUCKET_NAME) {
  console.warn("⚠️  S3 bucket name not configured.");
}

console.log("✅ AWS Configuration loaded");
