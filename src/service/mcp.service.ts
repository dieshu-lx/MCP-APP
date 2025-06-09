import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { Injectable, OnModuleInit, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import OpenAI from "openai";

// 定义接口
interface MCPToolCall {
  tool: string;
  input: Record<string, any>;
}

interface MCPToolResponse {
  tools: MCPToolCall[] | null;
  reason?: string;
}

interface MCPCompletionResult {
  content: string;
  error?: string;
}

@Injectable()
export class McpService implements OnModuleInit { 
  private readonly logger = new Logger(McpService.name);
  private mcpClient: Client;
  private isConnected: boolean = false;
  private readonly openai: OpenAI;

  constructor(private configService: ConfigService) {
    // 使用默认的 API Key
    const apiKey = this.configService.get<string>('OPENAI_API_KEY') || 'sk-56a5d3d32fe44816ab0ba61b8ca6d987';
    const baseURL = this.configService.get<string>('OPENAI_BASE_URL') || 'https://dashscope.aliyuncs.com/compatible-mode/v1';

    this.openai = new OpenAI({
      apiKey,
      baseURL,
    });

    this.mcpClient = new Client({
      name: this.configService.get<string>('MCP_CLIENT_NAME', 'mcp-client'),
      version: this.configService.get<string>('MCP_CLIENT_VERSION', '1.0.0')
    });
  }

  async onModuleInit() {
    try {
      await this.connecteMcpServer();
    } catch (error) {
      this.logger.error('Failed to connect to MCP server on init', error);
    }
  }

  async connecteMcpServer() {
    try {
      const mcpServerUrl = this.configService.get<string>('MCP_SERVER_URL', 'http://localhost:3000/sse');
      const transport = new SSEClientTransport(new URL(mcpServerUrl));
      await this.mcpClient.connect(transport);
      this.isConnected = true;
      this.logger.log('Successfully connected to MCP server');
    } catch (error) {
      this.isConnected = false;
      this.logger.error('Failed to connect to MCP server', error);
      throw error;
    }
  }

  private async ensureConnection() {
    if (!this.isConnected) {
      await this.connecteMcpServer();
    }
  }

  async getListResources() {
    try {
      await this.ensureConnection();
      return await this.mcpClient.listResources();
    } catch (error) {
      this.logger.error('Failed to get resources', error);
      throw error;
    }
  }

  async getTools() {
    try {
      await this.ensureConnection();
      return await this.mcpClient.listTools();
    } catch (error) {
      this.logger.error('Failed to get tools', error);
      throw error;
    }
  }

  async callTool(toolName: string, args: Record<string, any>) {
    try {
      await this.ensureConnection();
      return await this.mcpClient.callTool({
        name: toolName,
        arguments: args
      });
    } catch (error) {
      this.logger.error(`Failed to call tool: ${toolName}`, error);
      throw error;
    }
  }

  async callMultipleTools(tools: MCPToolCall[]) {
    try {
      await this.ensureConnection();
      const results = [];
      for (const tool of tools) {
        const result = await this.mcpClient.callTool({
          name: tool.tool,
          arguments: tool.input
        });
        results.push(result);
      }
      return results;
    } catch (error) {
      this.logger.error('Failed to call multiple tools', error);
      throw error;
    }
  }

  async createMCPCompletion(
    input: Record<string, any>
  ): Promise<MCPCompletionResult> {
    try {
      const completion = await this.openai.chat.completions.create({
        model: this.configService.get<string>('OPENAI_MODEL', 'qwen-plus'),
        messages: [
          {
            role: 'system',
            content:
              `根据用户的输入，判断用户想要做什么，判断给出的 tool 中是否存在可用的tool,
              如果给出的 tool 中不存在可用的tool，则自行处理一下用户的问题，并返回以下格式的数据：
              {
                "tools": null,
                "reason": "你的看法"
              },
              如果存在可用的 tool，返回一个或多个需要调用的工具，并且根据用户的需求和tool的描述生成对应的参数，返回格式为：
              {
                "tools": [
                  {
                    "tool": "tool_name1",
                    "input": {
                      [key]: "value"
                    }
                  },
                  {
                    "tool": "tool_name2",
                    "input": {
                      [key]: "value"
                    }
                  }
                ]
              }
              `,
          },
          { role: 'user', content: JSON.stringify(input) },
        ],
        stream: false,
      });

      return {
        content: completion.choices[0]?.message?.content || '',
      };
    } catch (error) {
      this.logger.error('Failed to create MCP completion', error);
      return {
        content: '',
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  async summaryMCPResults(results: any[]): Promise<MCPCompletionResult> {
    try {
      const completion = await this.openai.chat.completions.create({
        model: this.configService.get<string>('OPENAI_MODEL', 'qwen-plus'),
        messages: [
          { 
            role: 'system',
            content: '分析多个工具的返回结果，并返回一个综合的简洁总结，不要返回额外的内容，包括前缀'
          },
          { role: 'user', content: JSON.stringify(results) }
        ],
      });

      return {
        content: completion.choices[0]?.message?.content || ''
      };
    } catch (error) {
      this.logger.error('Failed to summarize MCP results', error);
      return {
        content: '',
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }
}