import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { McpController } from './controller/mcp.controller';
import { McpService } from './service/mcp.service';
import { ChatController } from './controller/chat.controller';
import { ChatService } from './service/chat.service';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
  ],
  controllers: [McpController, ChatController],
  providers: [McpService, ChatService],
})
export class AppModule { }
