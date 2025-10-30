# Country Currency & Exchange API - Backend Wizards Stage 2

A RESTful API that fetches country data and exchange rates from external APIs, performs computations, stores data in MySQL, and generates visual summaries.

## 🚀 Live Demo

**API Base URL:** http://countryapi.duckdns.org/

**Endpoints:**

- Health: `GET /`
- Status: `GET /status`
- Refresh: `POST /countries/refresh`
- Get All: `GET /countries`
- Get One: `GET /countries/:name`
- Delete: `DELETE /countries/:name`
- Image: `GET /countries/image`

## 📋 Features

- ✅ Fetch and cache 250+ countries from external API
- ✅ Real-time exchange rate integration
- ✅ Automatic GDP estimation with random multipliers
- ✅ MySQL database with Prisma ORM
- ✅ Advanced filtering (region, currency) and sorting
- ✅ Dynamic image generation with top 5 countries
- ✅ AWS S3 integration for image storage
- ✅ Robust error handling for external API failures
- ✅ Full CRUD operations
- ✅ TypeScript for type safety

## 🛠️ Tech Stack

| Category             | Technology                  |
| -------------------- | --------------------------- |
| **Language**         | TypeScript                  |
| **Runtime**          | Node.js 18+                 |
| **Framework**        | Express.js                  |
| **Database**         | AWS RDS MySQL               |
| **ORM**              | Prisma                      |
| **Cloud Storage**    | AWS S3                      |
| **Image Generation** | node-canvas                 |
| **HTTP Client**      | Axios                       |
| **Validation**       | Zod                         |
| **Deployment**       | AWS Elastic Beanstalk / EC2 |

## 📦 Installation & Local Setup

### Prerequisites

- Node.js (v16 or higher)
- MySQL (local or AWS RDS)
- AWS Account (for S3)
- npm or yarn
- Git

### Steps

1. **Clone the repository**

```bash
git clone https://github.com/abanicaisse/hng-be-stage-2.git
cd hng-be-stage-2
```

2. **Install dependencies**

```bash
npm install
```

3. **Set up environment variables**

Create a `.env` file in the root directory:

```bash
# Database (AWS RDS MySQL)
DATABASE_URL="mysql://admin:password@your-rds-endpoint.rds.amazonaws.com:3306/country_api"

# Server
PORT=8080
NODE_ENV=development

# External APIs
COUNTRIES_API_URL="https://restcountries.com/v2/all?fields=name,capital,region,population,flag,currencies"
EXCHANGE_RATE_API_URL="https://open.er-api.com/v6/latest/USD"
API_TIMEOUT=10000

# AWS Configuration
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="AKIA..."
AWS_SECRET_ACCESS_KEY="wJalr..."
AWS_S3_BUCKET_NAME="country-api-images-yourname"

# Image Storage (local or s3)
IMAGE_STORAGE="local"  # Use "s3" for production
```

4. **Set up the database**

```bash
# Generate Prisma Client
npx prisma generate

# Run database migrations
npx prisma migrate dev --name init

# (Optional) Open Prisma Studio
npx prisma studio
```

5. **Run the development server**

```bash
npm run dev
```

The server will start on `http://localhost:8080`

6. **Refresh country data**

```bash
curl -X POST http://localhost:8080/countries/refresh
```

This will fetch all countries and exchange rates, then cache them in your database.

## 🏗️ Build & Production

### Build for production

```bash
npm run build
```

This compiles TypeScript to JavaScript in the `dist/` directory and generates Prisma Client.

### Run production build

```bash
npm start
```

## 📂 Project Structure

```
backend-stage2-country-api/
├── src/
│   ├── index.ts                          # Main application entry
│   ├── config/
│   │   └── aws.config.ts                 # AWS SDK configuration
│   ├── routes/
│   │   └── countries.routes.ts           # API routes
│   ├── services/
│   │   ├── country.service.ts            # Country business logic
│   │   ├── exchange-rate.service.ts      # Exchange rate API client
│   │   ├── image-generator.service.ts    # Image generation logic
│   │   └── s3.service.ts                 # AWS S3 operations
│   ├── utils/
│   │   └── validators.ts                 # Request validation schemas
│   ├── types/
│   │   └── index.ts                      # TypeScript type definitions
│   └── middleware/
│       └── error-handler.ts              # Global error handler
├── prisma/
│   └── schema.prisma                     # Database schema
├── .ebextensions/                        # AWS Elastic Beanstalk config
│   ├── nodecommand.config
│   └── environment.config
├── cache/                                # Local image storage
├── dist/                                 # Compiled JavaScript
├── .env                                  # Environment variables (not in git)
├── .gitignore
├── tsconfig.json
├── package.json
└── README.md
```

## 📡 API Documentation

### Base URL

```
http://localhost:8080  (local)
http://countryapi.duckdns.org/    (production)
```

---

### 1. Refresh Countries

**Endpoint:** `POST /countries/refresh`

Fetches all countries from external API, gets exchange rates, computes estimated GDP, and caches everything in the database. Also generates a summary image.

**Success Response (200 OK):**

```json
{
  "message": "Countries refreshed successfully",
  "inserted": 45,
  "updated": 205,
  "total": 250
}
```

**Error Responses:**

- `503 Service Unavailable` - External API unavailable

```json
{
  "error": "External data source unavailable",
  "details": "Could not fetch data from Countries API"
}
```

**Example:**

```bash
curl -X POST http://localhost:8080/countries/refresh
```

---

### 2. Get All Countries

**Endpoint:** `GET /countries`

Get all countries from database with optional filtering and sorting.

**Query Parameters:**

| Parameter  | Type   | Description             | Example                                  |
| ---------- | ------ | ----------------------- | ---------------------------------------- |
| `region`   | string | Filter by region        | `Africa`, `Europe`, `Asia`               |
| `currency` | string | Filter by currency code | `NGN`, `USD`, `GBP`                      |
| `sort`     | string | Sort results            | `gdp_desc`, `population_asc`, `name_asc` |

**Sort Options:**

- `gdp_asc` - Ascending by GDP
- `gdp_desc` - Descending by GDP
- `population_asc` - Ascending by population
- `population_desc` - Descending by population
- `name_asc` - A-Z by name
- `name_desc` - Z-A by name
