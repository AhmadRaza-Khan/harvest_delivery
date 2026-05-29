import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HandlerController } from './handler.controller';
import { HandlerService } from './handler.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [ConfigModule, AuthModule],
  controllers: [HandlerController],
  providers: [HandlerService],
  exports: [HandlerService]
})
export class HandlerModule {}
