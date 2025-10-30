import { s3, S3_BUCKET_NAME } from '../config/aws.config';
import { AppError } from '../types';
import axios from 'axios';

const API_GATEWAY_URL = process.env.AWS_S3_API_GATEWAY_URL;

export class S3Service {
  //  Uploads a file buffer to S3 via API Gateway
  static async uploadImage(
    buffer: Buffer,
    key: string,
    contentType: string = 'image/png'
  ): Promise<string> {
    try {
      const apiGatewayUrl = `${API_GATEWAY_URL}/${S3_BUCKET_NAME}/${key}`;

      await axios.put(apiGatewayUrl, buffer, {
        headers: {
          'Content-Type': contentType,
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      });

      const publicUrl = `https://${S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

      console.log(
        `[${new Date().toISOString()}] Image uploaded to S3 via API Gateway: ${publicUrl}`
      );

      return publicUrl;
    } catch (error) {
      console.error('Error uploading to S3 via API Gateway:', error);
      if (axios.isAxiosError(error)) {
        console.error('API Gateway response:', error.response?.data);
        console.error('API Gateway status:', error.response?.status);
      }
      throw new AppError(500, 'Failed to upload image to S3');
    }
  }

  static async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const params = {
        Bucket: S3_BUCKET_NAME,
        Key: key,
        Expires: expiresIn,
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
