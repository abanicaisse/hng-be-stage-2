import { createCanvas } from 'canvas';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { AppError } from '../types';
import { S3Service } from './s3.service';

const prisma = new PrismaClient();

export class ImageGeneratorService {
  private static readonly LOCAL_IMAGE_PATH = path.join(process.cwd(), 'cache', 'summary.png');
  private static readonly S3_IMAGE_KEY = 'summary.png';
  private static readonly WIDTH = 800;
  private static readonly HEIGHT = 600;
  private static readonly USE_S3 = process.env.IMAGE_STORAGE === 's3';

  static async generateSummaryImage(): Promise<string> {
    try {
      console.log(`[${new Date().toISOString()}] Generating summary image...`);

      const totalCountries = await prisma.country.count();

      const topCountries = await prisma.country.findMany({
        where: {
          estimatedGdp: { not: null },
        },
        orderBy: {
          estimatedGdp: 'desc',
        },
        take: 5,
      });

      // Get last refresh timestamp
      const status = await prisma.systemStatus.findUnique({ where: { id: 1 } });
      const lastRefreshed = status?.lastRefreshedAt || new Date();

      // Create canvas
      const canvas = createCanvas(this.WIDTH, this.HEIGHT);
      const ctx = canvas.getContext('2d');

      // Background
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, this.WIDTH, this.HEIGHT);

      // Title
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Country Currency & Exchange API', this.WIDTH / 2, 60);

      // Subtitle
      ctx.font = '20px Arial';
      ctx.fillStyle = '#a8dadc';
      ctx.fillText('Data Summary', this.WIDTH / 2, 95);

      // Total Countries
      ctx.font = 'bold 28px Arial';
      ctx.fillStyle = '#f1faee';
      ctx.textAlign = 'left';
      ctx.fillText(`Total Countries: ${totalCountries}`, 50, 150);

      // Top 5 Countries Header
      ctx.font = 'bold 24px Arial';
      ctx.fillStyle = '#e63946';
      ctx.fillText('Top 5 Countries by GDP:', 50, 200);

      // Top 5 Countries List
      ctx.font = '18px Arial';
      ctx.fillStyle = '#ffffff';
      let yPosition = 240;

      topCountries.forEach((country, index) => {
        const gdp = country.estimatedGdp ? `$${(country.estimatedGdp / 1e9).toFixed(2)}B` : 'N/A';

        ctx.fillText(`${index + 1}. ${country.name} - ${gdp}`, 70, yPosition);
        yPosition += 35;
      });

      // Last Refreshed
      ctx.font = '16px Arial';
      ctx.fillStyle = '#a8dadc';
      ctx.textAlign = 'center';
      const refreshText = `Last Refreshed: ${lastRefreshed.toUTCString()}`;
      ctx.fillText(refreshText, this.WIDTH / 2, this.HEIGHT - 40);

      // Decorative line
      ctx.strokeStyle = '#457b9d';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(50, this.HEIGHT - 70);
      ctx.lineTo(this.WIDTH - 50, this.HEIGHT - 70);
      ctx.stroke();

      // Convert to buffer
      const buffer = canvas.toBuffer('image/png');

      // Save to S3 or local filesystem
      if (this.USE_S3) {
        const imageUrl = await S3Service.uploadImage(buffer, this.S3_IMAGE_KEY, 'image/png');
        console.log(`[${new Date().toISOString()}] Summary image uploaded to S3`);
        return imageUrl;
      } else {
        // Save locally
        const cacheDir = path.dirname(this.LOCAL_IMAGE_PATH);
        if (!fs.existsSync(cacheDir)) {
          fs.mkdirSync(cacheDir, { recursive: true });
        }
        fs.writeFileSync(this.LOCAL_IMAGE_PATH, buffer);
        console.log(`[${new Date().toISOString()}] Summary image saved locally`);
        return this.LOCAL_IMAGE_PATH;
      }
    } catch (error) {
      console.error('Error generating image:', error);
      throw new AppError(500, 'Failed to generate summary image');
    }
  }

  static async getImageUrl(): Promise<string> {
    if (this.USE_S3) {
      const exists = await S3Service.objectExists(this.S3_IMAGE_KEY);
      if (!exists) {
        throw new AppError(404, 'Summary image not found');
      }
      return S3Service.getPublicUrl(this.S3_IMAGE_KEY);
    } else {
      if (!fs.existsSync(this.LOCAL_IMAGE_PATH)) {
        throw new AppError(404, 'Summary image not found');
      }
      return this.LOCAL_IMAGE_PATH;
    }
  }

  // Gets the local image path (for serving files)
  static getLocalImagePath(): string {
    if (!fs.existsSync(this.LOCAL_IMAGE_PATH)) {
      throw new AppError(404, 'Summary image not found');
    }
    return this.LOCAL_IMAGE_PATH;
  }

  static async imageExists(): Promise<boolean> {
    if (this.USE_S3) {
      return await S3Service.objectExists(this.S3_IMAGE_KEY);
    } else {
      return fs.existsSync(this.LOCAL_IMAGE_PATH);
    }
  }
}
