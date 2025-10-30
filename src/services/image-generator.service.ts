import puppeteer from 'puppeteer';
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
    let browser;
    try {
      console.log(`[${new Date().toISOString()}] Generating summary image with Puppeteer...`);

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

      // Generate HTML content
      const html = this.generateHTML(totalCountries, topCountries, lastRefreshed);

      // Launch headless browser with timeout
      const launchTimeout = setTimeout(() => {
        throw new Error('Puppeteer launch timeout after 10 seconds');
      }, 10000);

      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-software-rasterizer',
          '--disable-extensions',
        ],
        timeout: 10000,
      });

      clearTimeout(launchTimeout);

      const page = await browser.newPage();
      await page.setViewport({ width: this.WIDTH, height: this.HEIGHT });

      // Set content with timeout
      await page.setContent(html, {
        waitUntil: 'domcontentloaded',
        timeout: 5000,
      });

      // Take screenshot with timeout
      const screenshotTimeout = setTimeout(() => {
        throw new Error('Screenshot timeout after 5 seconds');
      }, 5000);

      const buffer = await page.screenshot({
        type: 'png',
        fullPage: false,
      });

      clearTimeout(screenshotTimeout);

      await browser.close();
      browser = undefined;

      console.log(`[${new Date().toISOString()}] Screenshot generated successfully`);

      // Save to S3 or local filesystem
      if (this.USE_S3) {
        const imageUrl = await S3Service.uploadImage(
          buffer as Buffer,
          this.S3_IMAGE_KEY,
          'image/png'
        );
        console.log(`[${new Date().toISOString()}] Summary image uploaded to S3`);
        return imageUrl;
      } else {
        const cacheDir = path.dirname(this.LOCAL_IMAGE_PATH);
        if (!fs.existsSync(cacheDir)) {
          fs.mkdirSync(cacheDir, { recursive: true });
        }
        fs.writeFileSync(this.LOCAL_IMAGE_PATH, buffer);
        console.log(`[${new Date().toISOString()}] Summary image saved locally`);
        return this.LOCAL_IMAGE_PATH;
      }
    } catch (error) {
      if (browser) {
        await browser.close().catch((closeError) => {
          console.error('Error closing browser:', closeError);
        });
      }
      console.error('Error generating image:', error);
      throw new AppError(500, 'Failed to generate summary image');
    }
  }

  private static generateHTML(
    totalCountries: number,
    topCountries: { name: string; estimatedGdp: number | null }[],
    lastRefreshed: Date
  ): string {
    const countriesHTML = topCountries
      .map((country, index) => {
        const gdp = country.estimatedGdp ? `$${(country.estimatedGdp / 1e9).toFixed(2)}B` : 'N/A';
        return `<div class="country-item">${index + 1}. ${country.name} - ${gdp}</div>`;
      })
      .join('');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              width: 800px;
              height: 600px;
              background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
              font-family: Arial, sans-serif;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              padding: 40px 50px;
            }
            .header {
              text-align: center;
            }
            .title {
              color: #ffffff;
              font-size: 36px;
              font-weight: bold;
              margin-bottom: 10px;
            }
            .subtitle {
              color: #a8dadc;
              font-size: 20px;
            }
            .content {
              flex: 1;
              display: flex;
              flex-direction: column;
              justify-content: center;
            }
            .total-countries {
              color: #f1faee;
              font-size: 28px;
              font-weight: bold;
              margin-bottom: 30px;
            }
            .top-header {
              color: #e63946;
              font-size: 24px;
              font-weight: bold;
              margin-bottom: 20px;
            }
            .countries-list {
              margin-left: 20px;
            }
            .country-item {
              color: #ffffff;
              font-size: 18px;
              margin-bottom: 10px;
            }
            .footer {
              text-align: center;
              padding-top: 20px;
              border-top: 2px solid #457b9d;
            }
            .last-refreshed {
              color: #a8dadc;
              font-size: 16px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">Country Currency & Exchange API</div>
            <div class="subtitle">Data Summary</div>
          </div>
          <div class="content">
            <div class="total-countries">Total Countries: ${totalCountries}</div>
            <div class="top-header">Top 5 Countries by GDP:</div>
            <div class="countries-list">
              ${countriesHTML}
            </div>
          </div>
          <div class="footer">
            <div class="last-refreshed">Last Refreshed: ${lastRefreshed.toUTCString()}</div>
          </div>
        </body>
      </html>
    `;
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
