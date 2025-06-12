import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { Injectable, OnModuleInit, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import OpenAI from "openai";

// 定义接口
interface MCPToolCall {
  type?: string;
  tool?: string;
  input?: Record<string, any>;
  messages?: any[];
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
  // private readonly mcpServerUrl: string = 'http://localhost:3000/sse';
  private readonly mcpServerUrl: string = 'https://mcp.amap.com/sse?key=2256fe2967988af58fdd9879b9e83c1e';

  constructor() {
    const apiKey = 'sk-56a5d3d32fe44816ab0ba61b8ca6d987';
    const baseURL = 'https://dashscope.aliyuncs.com/compatible-mode/v1';

    this.openai = new OpenAI({
      apiKey,
      baseURL,
    });

    this.mcpClient = new Client({
      name: 'mcp-client',
      version: '1.0.0'
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
      const transport = new SSEClientTransport(new URL(this.mcpServerUrl));
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

  async callMultipleSteps(steps: MCPToolCall[]) {
    try {
      await this.ensureConnection();
      const results = [];
      for (const step of steps) {
        if (step.type === 'tool') {
          const result = await this.mcpClient.callTool({
            name: step.tool,
            arguments: step.input
          });
          results.push(JSON.stringify(result.content));
        } else if (step.type === 'model') {
          const result = await this.createMCPCompletion(step, results);
          results.push(result);
        }
      }
      return results;
    } catch (error) {
      this.logger.error('Failed to call multiple tools', error);
      throw error;
    }
  }

  async callLLM(messages) {
    console.error(messages);
    try {
      const completion = await this.openai.chat.completions.create({
        model: 'qwen-max',
        messages,
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

  async createMCPCompletion(
    input: MCPToolCall,
    results?: any[]
  ): Promise<MCPCompletionResult> {
    try {
      const messages = [
        { role: 'system', content: results ? JSON.stringify(results) : '' },
        { role: 'system', content: '根据系统信息进行总结，尝试回答用户问题，如果无法回答，则返回系统信息中对用户问题有帮助的内容' },
        { role: 'user', content: JSON.stringify(input) }
      ];

      const res = await this.callLLM(messages);

      return {
        content: res.content || '',
      };
    } catch (error) {
      this.logger.error('Failed to create MCP completion', error);
      return {
        content: '',
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  async summaryMCPResults(results: any[], originalQuestion: string): Promise<MCPCompletionResult> {
    try {
      const messages = [
        {
          role: 'system',
          content: '分析用户输入的问题,根据系统信息进行回答，返回一个简洁的总结，不要改变原有的意思，不要返回用户的问题，不要返回额外的内容，包括前缀；'
        },
        {
          role: 'system',
          content: '例如：用户输入：如果明天天气好的话，我想去北京。系统信息：北京明天天气晴，气温25度，适合出行。返回：明天北京天气晴朗，气温25摄氏度，适合出行，需要我帮助你规划行程吗？。'
        },
        { role: 'system', content: JSON.stringify(results) },
        { role: 'user', content: `用户输入：${originalQuestion}` },
      ]
      const result = await this.callLLM(messages);
      return {
        content: result.content
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