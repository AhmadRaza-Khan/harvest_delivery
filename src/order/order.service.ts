import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HandlerService } from '../handler/handler.service';
import { OdooWebhookDto } from './dto';
import { PrismaService } from '../prisma/prisma.service';
import { channels } from '../menu/CONSTANTS';

@Injectable()
export class OrderService {
  private readonly channelId: string;

  constructor(private readonly config: ConfigService, private readonly handler: HandlerService, private readonly prisma: PrismaService){
          this.channelId = this.config.get<string>("CHANNELL_ID")!;
  }

  async test(){
    const response = await this.handler.odooApiHandler('/api/pos/configs', 'GET');
    return response;
  }

  delay (ms: number){ new Promise(resolve => setTimeout(resolve, ms)) };
  
  async placeOrderWebhook(payload: any): Promise<any> {
    const channelId = payload.channelId;
    const configId = channels.find(c => c.channelId === channelId)?.branchId;

    try {
      const products = payload.products.map((product: any) => {
        const modifiers = (product.modifierGroups ?? []).flatMap((group: any) => group.modifiers ?? []);
        const price = product.price / 100;
        const discount = product.discountAmount / 100;
        return {
          product_id: Number(product.productId),
          qty: product.quantity,
          price_unit: price,
          discount: discount,
          price_subtotal: price * product.quantity - discount,
          price_subtotal_incl: price * product.quantity - discount,
          attribute_value_ids: modifiers.map((modifier: any) => Number(modifier.id)),
        };
      });
// outgoing_payload_example = {
    //   "snoonu_ref": "003",
    //   "customer_name": "Ahamad",
    //   "phone": "+923177518507",
    //   "email": "ahmad@test.com",
    //   "street": "Abc, Raji Mansion",
    //   "city": "Doha",

    //   "amount_tax": 1,
    //   "amount_total": 91,
    //   "amount_paid": 91,
    //   "amount_return": 0,

    //   "pos_reference": "SNOONU-001",

    //   "lines": [
    //     {
    //       "product_id": 618,
    //       "qty": 1,
    //       "price_unit": 120.0,
    //       "discount": 10.0,
    //       "price_subtotal": 110.0,
    //       "price_subtotal_incl": 110.0,
    //       "attribute_value_ids": [15, 22]
    //     }
    //   ]
    // }

// incoming_payload_example =
// {
//   "channelName" : "externalname",
//   "channelId" : "channelId",
//   "orderId" : 10084452,
//   "by" : "SN",
//   "orderType" : 1,
//   "note" : null,
//   "isScheduler" : false,
//   "createdAt" : "2025-04-30T10:53:01.487734Z",
//   "pickupTime" : "2025-04-30T11:08:01.487734Z",
//   "isDeliveryBySnoonu" : true,
//   "customer" : {
//     "name" : "test",
//     "phoneNumber" : "+97421343339",
//     "email" : "test@gmail.com",
//     "carDetail" : null
//   },
//   "deliveryAddress" : {
//     "description" : "Gharrafat Al Rayyan, Ar-Rayyan, Zone 51, Al Rayyan Municipality, Qatar. , B12",
//     "state" : "Ad Dawhah",
//     "country" : "Qatar",
//     "notes" : "",
//     "flatNumber" : null,
//     "building" : null,
//     "coordinate" : {
//       "latitude" : 25.3325814,
//       "longitude" : 51.44670929999999
//     }
//   },
//   "payment" : {
//     "amount" : 11600,
//     "totalPaid" : 0,
//     "totalUnPaid" : 11600,
//     "types" : [ 0 ],
//     "currency" : "QAR"
//   },
//   "products" : [ {
//     "productId" : "",
//     "name" : "2 For 40 Mighty Steakhouse Meal",
//     "price" : 0,
//     "originalPrice": 0,
//     "discountAmount": 0,
//     "quantity" : 2,
//     "remark" : "",
//     "modifierGroups" : [ {
//       "id" : "",
//       "name" : "Your Choice of Meal",
//       "modifiers" : [ {
//         "id" : "",
//         "name" : "2 Steakhouse Meal",
//         "price" : 4000,
//         "quantity" : 1
//       } ]
//     }, {
//       "id" : "",
//       "name" : "Size It Your Way for Meal 1",
//       "modifiers" : [ {
//         "id" : "",
//         "name" : "Go XXL",
//         "price" : 400,
//         "quantity" : 1
//       } ]
//     }, {
//       "id" : "",
//       "name" : "Size It Your Way for Meal 2",
//       "modifiers" : [ {
//         "id" : "",
//         "name" : "Go XXL",
//         "price" : 400,
//         "quantity" : 1
//       } ]
//     }, {
//       "id" : "",
//       "name" : "Your Choice Of Drinks For Meal 1",
//       "modifiers" : [ {
//         "id" : "",
//         "name" : "Fanta Orange",
//         "price" : 0,
//         "quantity" : 1
//       } ]
//     }, {
//       "id" : "",
//       "name" : "Your Choice Of Drinks For Meal 2",
//       "modifiers" : [ {
//         "id" : "",
//         "name" : "Fanta Orange",
//         "price" : 0,
//         "quantity" : 1
//       } ]
//     } ]
//   } ],
//   "totalDiscount" : 0,
//   "deliveryFee" : 2000,
//   "promotions" : [ {
//     "code" : "PIPETEST",
//     "amountBeforePromotion" : 4800,
//     "amountAfterPromotion" : 3550,
//     "type" : 1 //Order
//   }, {
//     "code" : "PIPETEST",
//     "amountBeforePromotion" : 2000,
//     "amountAfterPromotion" : 2000,
//     "type" : 0 //DeliveryFee
//   } ]
// }


    const data =  {
      "snoonu_ref": payload.orderId,
      "config_id": configId,
      "customer_name": payload.customer.name,
      "phone": payload.customer.phoneNumber,
      "email": payload.customer.email,
      "street": payload.deliveryAddress.description,
      "city": payload.deliveryAddress.state,

      "amount_tax": 0,
      "amount_total": payload.payment.amount,
      "amount_paid": payload.payment.totalPaid,
      "amount_return": 0,

      "pos_reference": `SNOONU-${payload.orderId}`,
      "pickup_time": payload.pickupTime,

      "lines": products
    }

    const response = await this.handler.odooApiHandler('/api/pos/create-order', 'POST', data);
    if (response && response.status == "success"){
      await this.webhookHandler({order_id: response.order_id, order_name: response.order_name}, "validated", `/api/v1/orders/validate`, 1);
      console.log('Order successfully created in Odoo with response:', response);

      await this.prisma.order.create({
        data: {
          snoonu_id: String(payload.orderId),
          odoo_id: String(response.order_id),
          status: "validated"
        }
      });
      return { success: true, message: "Order validdated successfully!" };
    } else {
      console.log('Failed to create order in Odoo. Response:', response);
      return { success: false, message: "Failed to validate order" };
    }
    } catch (error: any) {
      console.log("Error placing order:", error.message);
      return { success: false, message: "Failed to place order" };
    }
  }

  async cancelOrderWebhook(payload: any): Promise<any> {
    try {
      if (!payload.orderId) return { success: false, message: "Order ID is required for cancellation" };

      if (payload.channelId !== this.channelId) {
        return { success: false, message: "Invalid channel ID" };
      }

      const order = await this.prisma.order.findUnique({ where: { snoonu_id: String(payload.orderId) } });
      if (!order) return { success: false, message: `Order ${payload.orderId} not found in database` };

      const response = await this.handler.odooApiHandler('/api/pos/order/cancel', 'POST', { snoonu_ref: payload.orderId, "reason": payload.cancellationReason });
      if (response && response.status === "success") {
        console.log('Order successfully cancelled in Odoo with response:', response);
        await this.prisma.order.update({
          where: { snoonu_id: String(payload.orderId) },
          data: { status: "cancelled" },
        });
        return { success: true, message: "Order cancelled successfully" };
      }
      return { success: false, message: "Failed to cancel order in Odoo" };
    } catch (error: any) {
      console.error("Error cancelling order:", error.message);
      return { success: false, message: "Failed to cancel order" };
    }
  }

  async rejectOrderWebhook(payload: OdooWebhookDto): Promise<any> {
    try {
      const webhook = await this.webhookHandler(payload, "rejected", `/api/v1/orders/reject`, 7);
      return { success: true, message: "Webhook received for order rejection" };
    } catch (error: any) {
      console.error("Error rejecting order:", error.message);
      return { success: false, message: "Failed to reject order" };
    }
  }

  async acceptOrderWebhook(payload: OdooWebhookDto): Promise<any> {
    try {      
      await this.webhookHandler(payload, "accepted", `/api/v1/orders/accept`, 2);
      await this.delay(3000);
      await this.webhookHandler(payload, "preparing", `/api/v1/orders/prepare`, 3);
      return { success: true, message: "Webhook received for order acceptance" };
    } catch (error: any) {
      console.error("Error accepting order:", error.message);
      return { success: false, message: "Failed to accept order" };
    }
  }

  async readyForPickupWebhook(payload: OdooWebhookDto): Promise<any> {
    const { order_id, order_name } = payload;
    console.log(`Order ${order_name} with ID ${order_id} is ready for pickup.`);
    return { success: true, message: "Webhook received for order ready for pickup" };
  }

  async webhookHandler(payload: any, webhookType: string, endpoint: string, status: number): Promise<any> {
    try {
      const { order_id, order_name } = payload;
      const order = await this.prisma.order.findUnique({ where: { odoo_id: String(order_id) } });
      const requestData = {
        "orderId": order?.snoonu_id,
        "status": status,
        "channelId": this.channelId,
      }
      await this.handler.apiHandler(endpoint, 'POST', requestData);

      await this.prisma.order.update({
        where: { odoo_id: String(order_id) },
        data: { status: webhookType },
      });
  
      console.log(`Order ${order_name} with ID ${order_id} has been ${webhookType}.`);
      return { success: true, message: `Webhook received for order ${webhookType}` };
    } catch (error: any) {
      console.error("Error rejecting order:", error.message);
      return { success: false, message: "Failed to reject order" };
    }
  }
}
