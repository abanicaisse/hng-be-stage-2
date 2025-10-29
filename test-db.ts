import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function testConnection() {
  try {
    await prisma.$connect();
    console.log("✅ Database connection successful!");

    const result = await prisma.$queryRaw`SELECT DATABASE() as db`;
    console.log("Connected to database:", result);

    await prisma.$disconnect();
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    process.exit(1);
  }
}

testConnection();
