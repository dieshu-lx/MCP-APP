import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from './filters/all-exceptions.filter';
import { LoggingInterceptor } from './filters/logging.interceptor';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
  // 启用CORS
  app.enableCors();
  
  // 配置静态文件服务
  app.useStaticAssets(join(__dirname, '..', 'public'));
  
  // 使用 express.urlencoded 中间件处理 URL 编码的请求
  app.use(express.urlencoded({ extended: true }));
  
  // 全局验证管道
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
    validationError: {
      target: false,
      value: false,
    },
    stopAtFirstError: true,
  }));
  
  // 全局异常过滤器
  app.useGlobalFilters(new AllExceptionsFilter());
  
  // 全局日志拦截器
  app.useGlobalInterceptors(new LoggingInterceptor());
  
  await app.listen(10000);
}
bootstrap();
