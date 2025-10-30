import { Router, Request, Response, NextFunction } from 'express';
import { CountryService } from '../services/country.service';
import { ImageGeneratorService } from '../services/image-generator.service';
import { filterQuerySchema } from '../utils/validators';
import { AppError } from '../types';

const router = Router();

// Fetch and cache all countries and exchange rates
router.post('/refresh', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    console.log(`[${new Date().toISOString()}] POST /countries/refresh - Starting refresh...`);

    const result = await CountryService.refreshCountries();

    res.status(200).json({
      message: 'Countries refreshed successfully',
      inserted: result.inserted,
      updated: result.updated,
      total: result.inserted + result.updated,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filters = filterQuerySchema.parse(req.query);

    const countries = await CountryService.getAllCountries(filters);

    res.status(200).json(countries);
  } catch (error) {
    next(error);
  }
});

router.get('/image', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const imageExists = await ImageGeneratorService.imageExists();

    if (!imageExists) {
      throw new AppError(404, 'Summary image not found');
    }

    // If using S3, redirect to S3 URL
    if (process.env.IMAGE_STORAGE === 's3') {
      const imageUrl = await ImageGeneratorService.getImageUrl();
      res.redirect(imageUrl);
    } else {
      // If using local storage, serve the file with proper content type
      const imagePath = ImageGeneratorService.getLocalImagePath();
      res.setHeader('Content-Type', 'image/png');
      res.sendFile(imagePath);
    }
  } catch (error) {
    next(error);
  }
});

router.get('/:name', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name } = req.params;

    const country = await CountryService.getCountryByName(name);

    res.status(200).json(country);
  } catch (error) {
    next(error);
  }
});

router.delete('/:name', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name } = req.params;

    await CountryService.deleteCountry(name);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
