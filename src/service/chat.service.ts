import { Injectable, Logger } from "@nestjs/common";
import { McpService } from "./mcp.service";

interface ChatResponse {
  message: string;
  error?: string;
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(private readonly mcpService: McpService) { }

  async chat(question: string): Promise<ChatResponse> {
    try {
      const { tools } = await this.mcpService.getTools();
      const messages = [
        {
          role: 'system',
          content: '你是一个专业的助手，请根据用户的问题，给出相应的回答。'
        },
        {
          role: 'system',
          content:
            `以下是可用的工具和描述：${JSON.stringify(tools)}`
        },
        {
          role: 'system',
          content:
            `根据用户的输入以及可用的工具，判断用户想要做什么，如果不需要调用工具或者无法完成用户的需求，则自行处理一下用户的问题，并返回以下格式的数据：
              {
                "steps": [],
                "content": "你的回答"
              },
              如果需要调用工具或者分步处理，应该返回一个或多个步骤，每个步骤包含一个可用的工具或者是大模型调用，在调用工具后，应该立即调用大模型进行分析下一步的输入，返回格式为：
              {
                "steps": [
                  {
                    "type": "tool",
                    "tool": "tool_name",
                    "input": {
                      "key": "value"
                    }
                  },
                  {
                    "type": "model",
                    "input": {
                      "messages": [
                        {
                          "role": "user",
                          "content": "需要输入的问题"
                        }
                      ]
                    }
                  }
                ]
              }
              除了以上内容，不要返回任何其他内容
              `,
        },
        {
          role: 'user',
          content: question
        }
      ];

      // 询问大模型问题的解决方案
      const mcpCompletionResult = await this.mcpService.callLLM(messages);

      if (mcpCompletionResult.error) {
        return {
          message: '抱歉，处理您的请求时出现错误',
          error: mcpCompletionResult.error
        };
      }

      const McpParams = JSON.parse(mcpCompletionResult.content);

      this.logger.log('McpParams', McpParams);

      // 如果需要调用工具或者分步处理
      if (McpParams.steps && McpParams.steps.length > 0) {
        // 调用工具
        const mcpResults = await this.mcpService.callMultipleSteps(McpParams.steps);
        // 总结调用结果
        const summaryResult = await this.mcpService.summaryMCPResults(mcpResults, question);

        if (summaryResult.error) {
          return {
            message: '抱歉，总结结果时出现错误',
            error: summaryResult.error
          };
        }

        this.logger.log('summaryResult', summaryResult.content);

        return {
          message: summaryResult.content
        };
      }

      return {
        message: McpParams.content || '无法找到合适的工具处理您的请求'
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