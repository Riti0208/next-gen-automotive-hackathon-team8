import Link from "next/link";
import { Car, Users, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 p-4">
      <div className="w-full max-w-4xl space-y-12">
        {/* ヘッダーセクション */}
        <header className="text-center space-y-4">
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl">
            観光ナビゲーションサービス
          </h1>
          <p className="text-lg text-zinc-600 max-w-2xl mx-auto">
            地元の知識とつながる、新しい観光体験
          </p>
        </header>

        {/* 選択カードセクション */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* ドライバーカード */}
          <Card className="hover:shadow-lg transition-shadow flex flex-col">
            <CardHeader className="space-y-4 flex-grow">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Car className="w-6 h-6 text-blue-600" />
              </div>
              <CardTitle className="text-2xl">ドライバーモード</CardTitle>
              <CardDescription className="text-base">
                観光客として地元のサポートを受けながらナビゲーション
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild size="lg" className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                <Link href="/driver">
                  開始する
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* サポーターカード */}
          <Card className="hover:shadow-lg transition-shadow flex flex-col">
            <CardHeader className="space-y-4 flex-grow">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <Users className="w-6 h-6 text-green-600" />
              </div>
              <CardTitle className="text-2xl">サポーターモード</CardTitle>
              <CardDescription className="text-base">
                地元の知識を活かして観光客をサポート
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild size="lg" className="w-full bg-green-600 hover:bg-green-700 text-white">
                <Link href="/supporter">
                  開始する
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
