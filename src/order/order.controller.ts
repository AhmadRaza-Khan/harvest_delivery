import { Body, Controller, Get, Post } from '@nestjs/common';
import { OrderService } from './order.service';
import { OdooWebhookDto } from './dto';

@Controller('order')
export class OrderController {
  constructor(private service: OrderService){}

  @Get("/test")
  async test() {
    return this.service.test();
  }

  @Post("/place")
  async placeOrder(@Body() payload: any){
    return await this.service.placeOrderWebhook(payload);
  }

  @Post("/cancel")
  async cancelOrder(@Body() payload: any){
    return await this.service.cancelOrderWebhook(payload);
  }

  @Post("loaded")
  async orderLoaded(@Body() dto: OdooWebhookDto){
    return await this.service.acceptOrderWebhook(dto);
  }

  @Post("rejected")
  async orderRejected(@Body() dto: OdooWebhookDto){
    return await this.service.rejectOrderWebhook(dto);
  }

  @Post("paid")
  async orderPaid(@Body() dto: OdooWebhookDto){
    return await this.service.readyForPickupWebhook(dto);
  }
}
