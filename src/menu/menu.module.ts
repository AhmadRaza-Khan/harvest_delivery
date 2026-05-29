import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MenuController } from './menu.controller';
import { MenuService } from './menu.service';
import { HandlerModule } from '../handler/handler.module';

@Module({
  imports: [ConfigModule, HandlerModule],
  controllers: [MenuController],
  providers: [MenuService]
})
export class MenuModule {}
