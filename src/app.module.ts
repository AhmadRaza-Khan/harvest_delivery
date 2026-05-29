import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { OrderModule } from './order/order.module';
import { MenuModule } from './menu/menu.module';
import { SnoozeModule } from './snooze/snooze.module';
import { HandlerModule } from './handler/handler.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    AuthModule, 
    PrismaModule,
    OrderModule,
    MenuModule,
    SnoozeModule,
    HandlerModule,
  ],
  providers: [],
  controllers: [],
})
export class AppModule {}
