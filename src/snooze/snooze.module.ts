import { Module } from '@nestjs/common';
import { SnoozeController } from './snooze.controller';
import { SnoozeService } from './snooze.service';
import { PrismaModule } from '../prisma/prisma.module';
import { HandlerModule } from '../handler/handler.module';

@Module({
  imports: [PrismaModule, HandlerModule],
  controllers: [SnoozeController],
  providers: [SnoozeService],
})
export class SnoozeModule {}
