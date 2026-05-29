import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { HandlerModule } from '../handler/handler.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [ConfigModule, HandlerModule, PrismaModule],
  controllers: [OrderController],
  providers: [OrderService]
})
export class OrderModule {}
