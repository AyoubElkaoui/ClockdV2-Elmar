import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const users = [
    {
      email: "admin@clockd.nl",
      name: "Admin",
      password: "Clockd2024!",
      role: Role.ADMIN,
    },
    {
      email: "reviewer@clockd.nl",
      name: "Reviewer",
      password: "Review2024!",
      role: Role.REVIEWER,
    },
  ];

  for (const user of users) {
    const hashedPassword = await bcrypt.hash(user.password, 12);
    await prisma.cv2User.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        role: user.role,
        password: hashedPassword,
        isActive: true,
      },
      create: {
        email: user.email,
        name: user.name,
        password: hashedPassword,
        role: user.role,
        isActive: true,
      },
    });
    console.log(`✓ Upserted ${user.email} (${user.role})`);
  }

  const existingConfig = await prisma.cv2ClockwiseConfig.findFirst();
  if (!existingConfig) {
    await prisma.cv2ClockwiseConfig.create({
      data: {
        clientId: "",
        clientSecret: "",
        isActive: false,
      },
    });
    console.log("✓ Created placeholder Cv2ClockwiseConfig");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
