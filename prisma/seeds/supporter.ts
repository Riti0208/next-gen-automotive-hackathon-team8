import { PrismaClient } from "@prisma/client";

export async function seedSupporters(prisma: PrismaClient) {
  const supporters = [
    {
      id: "supporter_001",
      name: "田中太郎",
      facilityId: "facility_tokyo_001",
      isOnline: true,
    },
    {
      id: "supporter_002",
      name: "佐藤花子",
      facilityId: "facility_osaka_001",
      isOnline: false,
    },
    {
      id: "supporter_003",
      name: "鈴木一郎",
      facilityId: "facility_tokyo_002",
      isOnline: true,
    },
  ];

  for (const supporter of supporters) {
    await prisma.supporter.upsert({
      where: { id: supporter.id },
      update: supporter,
      create: supporter,
    });
  }

  console.log(`✅ Seeded ${supporters.length} supporters`);
}
