import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;
    const url = request.url;
    const query = request.query;
    const now = Date.now();

    console.log(`[Request] ${method} ${url}`);
    console.log('Query parameters:', query);

    return next.handle().pipe(
      tap((response) => {
        const responseObj = context.switchToHttp().getResponse();
        const delay = Date.now() - now;
        console.log(
          `[Response] ${method} ${url} ${responseObj.statusCode} - ${delay}ms`,
        );
        console.log('Response body:', response);
      }),
    );
  }
} 