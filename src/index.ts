import express, { Application, Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import countriesRouter from "./routes/countries.routes";
import { errorHandler } from "./middleware/error-handler";
import { CountryService } from "./services/country.service";
import "./config/aws.config";

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req: Request, res: Response, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

app.use("/countries", countriesRouter);

// Show total countries and last refresh timestamp
app.get("/status", async (req: Request, res: Response, next) => {
  try {
    const status = await CountryService.getStatus();
    res.status(200).json(status);
  } catch (error) {
    next(error);
  }
});

app.get("/", (req: Request, res: Response) => {
  res.json({
    message: "Country Currency & Exchange API",
    version: "1.0.0",
    endpoints: {
      refresh: "POST /countries/refresh",
      getAll: "GET /countries",
      getOne: "GET /countries/:name",
      delete: "DELETE /countries/:name",
      status: "GET /status",
      image: "GET /countries/image",
    },
    documentation: "See README.md for full API documentation",
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: "Endpoint not found",
  });
});

app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log("=".repeat(60));
  console.log(`🚀 Country Currency & Exchange API running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`📡 Health check: http://localhost:${PORT}/`);
  console.log(
    `🗄️  Database: ${process.env.DATABASE_URL ? "Connected" : "Not configured"}`
  );
  console.log(`☁️  Image Storage: ${process.env.IMAGE_STORAGE || "local"}`);
  console.log("=".repeat(60));
});

export default app;
