import { mastra } from "@/lib/mastra";

export class ChatService {
  static async generateResponse(message: string): Promise<string> {
    const agent = mastra.getAgent("assistant");
    const result = await agent.generate(message);
    return result.text;
  }
}
