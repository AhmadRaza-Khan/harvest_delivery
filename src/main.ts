import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { UnauthorizedException, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import * as bodyParser from 'body-parser';
import * as express from 'express';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.use(cookieParser());
  app.use(bodyParser.json({ verify: (req: any, _res, buf) => {
    req.rawBody = buf;
  }}));
  (BigInt.prototype as any).toJSON = function () {
  return this.toString();
  };

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
  }));
    app.useStaticAssets(join(__dirname, '..', 'public'));
    app.useGlobalFilters({
    catch(exception, host) {
      const ctx = host.switchToHttp();
      const res = ctx.getResponse<express.Response>();

      if (exception instanceof UnauthorizedException) {
        return res.redirect('/auth/signin');
      }

      throw exception;
    },
  });
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
