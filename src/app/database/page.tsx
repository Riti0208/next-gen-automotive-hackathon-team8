import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { Card } from "@/components/ui/card";

// 動的レンダリングを強制（ビルド時の静的生成をスキップ）
export const dynamic = "force-dynamic";

async function getDatabaseData() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not defined");
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
    });
    return { users };
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

export default async function DatabasePage() {
  const { users } = await getDatabaseData();

  return (
    <div className="container mx-auto py-8">
      <h1 className="mb-6 text-3xl font-bold">データベース管理</h1>

      <div className="mb-8">
        <h2 className="mb-4 text-xl font-semibold">開発者向け情報</h2>
        <Card className="p-4">
          <div className="space-y-2 text-sm">
            <p>
              <strong>Migration作成:</strong>{" "}
              <code className="rounded bg-muted px-2 py-1">
                npx prisma migrate dev --name マイグレーション名
              </code>
            </p>
            <p>
              <strong>Seeder実行:</strong>{" "}
              <code className="rounded bg-muted px-2 py-1">
                npx prisma db seed
              </code>
            </p>
            <p>
              <strong>Prisma Studio:</strong>{" "}
              <code className="rounded bg-muted px-2 py-1">
                pnpm db:studio
              </code>
            </p>
          </div>
        </Card>
      </div>

      <div className="space-y-6">
        <div>
          <h2 className="mb-4 text-xl font-semibold">
            Userテーブル ({users.length}件)
          </h2>
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium">
                      ID
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium">
                      Created At
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-8 text-center text-muted-foreground"
                      >
                        データがありません
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user.id} className="border-b">
                        <td className="px-4 py-3 text-sm">{user.id}</td>
                        <td className="px-4 py-3 text-sm">{user.email}</td>
                        <td className="px-4 py-3 text-sm">
                          {user.name || "-"}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {new Date(user.createdAt).toLocaleString("ja-JP")}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
