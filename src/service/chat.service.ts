import { Injectable, Logger } from "@nestjs/common";
import { McpService } from "./mcp.service";

interface ChatResponse {
  message: string;
  error?: string;
}

interface MCPToolCall {
  tool: string;
  input: Record<string, any>;
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  
  constructor(private readonly mcpService: McpService) { }

  async chat(message: string): Promise<ChatResponse> {
    try {
      const toolList = await this.mcpService.getTools();
      const params = {
        question: message,
        availableTools: toolList
      };

      const mcpCompletionResult = await this.mcpService.createMCPCompletion(params);
      
      if (mcpCompletionResult.error) {
        return {
          message: '抱歉，处理您的请求时出现错误',
          error: mcpCompletionResult.error
        };
      }

      const McpParams = JSON.parse(mcpCompletionResult.content);

      this.logger.log('McpParams', McpParams);
      
      if (McpParams.tools && McpParams.tools.length > 0) {
        const mcpResults = await this.mcpService.callMultipleTools(McpParams.tools);
        const summaryResult = await this.mcpService.summaryMCPResults(mcpResults);
        
        if (summaryResult.error) {
          return {
            message: '抱歉，总结结果时出现错误',
            error: summaryResult.error
          };
        }

        return {
          message: summaryResult.content
        };
      }

      return {
        message: McpParams.reason || '无法找到合适的工具处理您的请求'
      };
    } catch (error) {
      this.logger.error('Chat processing failed', error);
      return {
        message: '抱歉，处理您的请求时出现错误',
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }
}