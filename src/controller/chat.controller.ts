import { Controller, Get, Query, HttpException, HttpStatus } from "@nestjs/common";
import { ChatService } from "../service/chat.service";
import { IsString, IsNotEmpty } from 'class-validator';
import { Transform } from 'class-transformer';

export class ChatQueryDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value ? decodeURIComponent(value) : '')
  message: string;
}

interface ChatResponse {
  message: string;
  error?: string;
}

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) { }

  @Get()
  async chat(@Query() query: ChatQueryDto): Promise<ChatResponse> {
    
    if (!query.message?.trim()) {
      throw new HttpException('消息内容不能为空', HttpStatus.BAD_REQUEST);
    }

    const result = await this.chatService.chat(query.message);
    
    if (result.error) {
      throw new HttpException(result.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    return result;
  }
}