import { Module } from '@nestjs/common';
import { SnoozeController } from './snooze.controller';
import { SnoozeService } from './snooze.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SnoozeController],
  providers: [SnoozeService],
})
export class SnoozeModule {}
