import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.ADMIN_EMAIL || "admin@ytmp.app").toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "admin123!";
  const hash = await bcrypt.hash(password, 10);

  await prisma.admin.upsert({
    where: { email },
    update: { passwordHash: hash },
    create: { email, passwordHash: hash },
  });

  await prisma.appConfig.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      value: JSON.stringify({
        plans: {
          trial: { label: "Trial", priceDisplay: "Free", days: 7 },
          monthly: { label: "Monthly", priceDisplay: "$5/mo", days: 30 },
          yearly: { label: "Yearly", priceDisplay: "$49/yr", days: 365 },
        },
        downloadUrl: process.env.DOWNLOAD_URL || "",
        supportEmail: process.env.SUPPORT_EMAIL || "",
      }),
    },
  });

  await prisma.coupon.upsert({
    where: { code: "WELCOME7" },
    update: { active: true },
    create: {
      code: "WELCOME7",
      type: "free_days",
      value: 7,
      maxUses: 0,
      active: true,
    },
  });

  console.log(`Seeded admin ${email} / (password from ADMIN_PASSWORD)`);
  console.log("Seeded coupon WELCOME7 (+7 free days)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
