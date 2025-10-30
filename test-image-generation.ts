import 'dotenv/config';
import { ImageGeneratorService } from './src/services/image-generator.service';

async function testImageGeneration() {
  console.log('🧪 Testing Puppeteer-based image generation...\n');

  try {
    console.log('⏳ Generating image...');
    const result = await ImageGeneratorService.generateSummaryImage();
    console.log('✅ Image generated successfully!');
    console.log('📍 Location:', result);
    console.log('\n🎉 Test passed! Image generation is working.\n');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testImageGeneration();
