import { s3, S3_BUCKET_NAME } from '../config/aws.config';
import { AppError } from '../types';

export class S3Service {
  //  Uploads a file buffer to S3
  static async uploadImage(
    buffer: Buffer,
    key: string,
    contentType: string = 'image/png'
  ): Promise<string> {
    try {
      const params = {
        Bucket: S3_BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        ACL: 'public-read', // Make image publicly accessible
      };

      const result = await s3.upload(params).promise();

      console.log(`[${new Date().toISOString()}] Image uploaded to S3: ${result.Location}`);

      return result.Location; // Returns the public URL
    } catch (error) {
      console.error('Error uploading to S3:', error);
      throw new AppError(500, 'Failed to upload image to S3');
    }
  }

  static async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const params = {
        Bucket: S3_BUCKET_NAME,
        Key: key,
        Expires: expiresIn, // URL expires in seconds
      };

      const url = await s3.getSignedUrlPromise('getObject', params);
      return url;
    } catch (error) {
      console.error('Error generating signed URL:', error);
      throw new AppError(500, 'Failed to generate image URL');
    }
  }

  static async objectExists(key: string): Promise<boolean> {
    try {
      await s3
        .headObject({
          Bucket: S3_BUCKET_NAME,
          Key: key,
        })
        .promise();
      return true;
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'NotFound') {
        return false;
      }
      throw error;
    }
  }

  static async deleteObject(key: string): Promise<void> {
    try {
      await s3
        .deleteObject({
          Bucket: S3_BUCKET_NAME,
          Key: key,
        })
        .promise();

      console.log(`[${new Date().toISOString()}] Deleted from S3: ${key}`);
    } catch (error) {
      console.error('Error deleting from S3:', error);
      throw new AppError(500, 'Failed to delete image from S3');
    }
  }

  //  Gets the public URL for an S3 object
  static getPublicUrl(key: string): string {
    return `https://${S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
  }
}
