import { Body, Controller, Get, Post } from "@nestjs/common";
import { McpService } from "../service/mcp.service";

interface IToolParams {
  toolName: string;
  input: any;
}

@Controller()
export class McpController { 
  constructor(private readonly mcpService: McpService) { }

  @Get('/resources')
  getResources() {
    return this.mcpService.getListResources()
  }

  @Get('/tools')
  getTools() {
    return this.mcpService.getTools()
  }

  @Post('/callTool')
  callTool(@Body() toolParams: IToolParams) {
    return this.mcpService.callTool(toolParams.toolName, toolParams.input)
  }
}