import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HandlerService } from '../handler/handler.service';
import { PrismaService } from '../prisma/prisma.service';
import { branchConfig, channels } from './CONSTANTS';

@Injectable()
export class OrderService {
  private readonly channelId: string;
  private readonly posId: string;
  constructor(private readonly config: ConfigService, private readonly handler: HandlerService, private readonly prisma: PrismaService){
          this.channelId = this.config.get<string>("CHANNELL_ID")!;
          this.posId = this.config.get<string>("POS_ID")!;
  }

  async test(){
    const response = await this.handler.odooApiHandler('/api/pos/configs', 'GET');
    return response;
  }

  delay (ms: number){ new Promise(resolve => setTimeout(resolve, ms)) };

  async placeOrderWebhook(payload: any): Promise<any> {
    console.log("Avo Payload: ", payload);
    const channelId = payload.branch_id;
    const channel = branchConfig.find(c => c.channelId === channelId);

    if(channel?.partner === "Avo"){
      console.log(`[Avo][PlaceOrder] Received place order webhook for order_id: ${payload.order_id}, channelId: ${channelId}`);
      try {
        const phone = payload.customer?.phone?.split(":::")?.pop() ?? payload.customer?.phone;
        const email = payload.customer?.email?.split(":::")?.pop() ?? payload.customer?.email;
        console.log(`[Avo][PlaceOrder] Customer: name=${payload.customer?.name}, phone=${phone}, email=${email}`);

        const lines = (payload.items as any[]).map((item: any) => ({
          product_id: item.product_pos_id,
          name: item.product_name,
          qty: item.quantity,
          price_unit: item.unit_price,
          attribute_value_ids: (item.additions ?? []).map((a: any) => a.addition_pos_id),
        }));
        console.log(`[Avo][PlaceOrder] Mapped ${lines.length} order line(s):`, JSON.stringify(lines));

        const data = {
          partner_ref: `Avo-${payload.order_id}`,
          config_id: channel.branchId,
          customer_name: payload.customer.name,
          phone,
          email,
          street: payload.delivery_address ?? "",
          city: "",
          amount_tax: 0,
          amount_total: payload.total_amount,
          amount_paid: payload.total_amount,
          amount_return: 0,
          pos_reference: `Avo-${payload.order_id}`,
          pickup_time: payload.scheduled_time,
          lines,
        };

        const response = await this.handler.odooApiHandler('/api/pos/create-order', 'POST', data);
        console.log("odoo response: ", response)
        console.log(`[Avo][PlaceOrder] Odoo response:`, JSON.stringify(response));

        if (response && response.status == "success") {
          console.log(`[Avo][PlaceOrder] Order created in Odoo with odoo_id: ${response.order_id}. Saving to database...`);
          await this.prisma.order.create({
            data: {
              partnerId: String(payload.order_id),
              odoo_id: String(response.order_id),
              status: "received",
            },
          });
          console.log(`[Avo][PlaceOrder] Order ${payload.order_id} saved to database successfully with status "received".`);
          return { success: true, message: "Order received successfully!" };
        } else {
          console.log(`[Avo][PlaceOrder] Failed to create order in Odoo. Response:`, response);
          return { success: false, message: "Failed to validate order" };
        }
      } catch (error: any) {
        console.error(`[Avo][PlaceOrder] Error placing order ${payload.order_id}:`, error.message);
        return { success: false, message: "Failed to place order" };
      }
    }

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

    const data =  {
      "partner_ref": "Snoono-" + payload.orderId,
      "config_id": channel?.branchId,
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
          partnerId: String(payload.orderId),
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
    const channel = branchConfig.find(c => c.channelId === payload.branch_id);
    if(channel?.partner === "Avo"){
      try {
      if (!payload.orderId) {
        console.warn(`[Avo][CancelOrder] Missing orderId in payload.`);
        return { success: false, message: "Order ID is required for cancellation" };
      }

      if (payload.branch_id !== channel?.channelId) {
        console.warn(`[Avo][CancelOrder] Invalid channelId: ${payload.branch_id}. Expected: ${channel}`);
        return { success: false, message: "Invalid channel ID" };
      }

      console.log(`[Avo][CancelOrder] Looking up order ${payload.orderId} in database...`);
      const order = await this.prisma.order.findUnique({ where: { partnerId: String(payload.orderId) } });
      if (!order) {
        console.warn(`[Avo][CancelOrder] Order ${payload.orderId} not found in database.`);
        return { success: false, message: `Order ${payload.orderId} not found in database` };
      }
      console.log(`[Avo][CancelOrder] Order found: odoo_id=${order.odoo_id}, current status=${order.status}`);

      console.log(`[Avo][CancelOrder] Sending cancel request to Odoo for orderId: ${payload.orderId}, reason: ${payload.cancellationReason}`);
      const response = await this.handler.odooApiHandler('/api/pos/order/cancel', 'POST', { partner_ref: `Avo-${payload.orderId}`, "reason": payload.cancellationReason });
      console.log(`[Avo][CancelOrder] Odoo response:`, JSON.stringify(response));

      if (response && response.status === "success") {
        console.log(`[Avo][CancelOrder] Order ${payload.orderId} successfully cancelled in Odoo. Updating database...`);
        await this.prisma.order.update({
          where: { partnerId: String(payload.orderId) },
          data: { status: "cancelled" },
        });
        console.log(`[Avo][CancelOrder] Order ${payload.orderId} status updated to "cancelled" in database.`);
        return { success: true, message: "Order cancelled successfully" };
      }
      console.log(`[Avo][CancelOrder] Failed to cancel order ${payload.orderId} in Odoo. Response:`, response);
      return { success: false, message: "Failed to cancel order in Odoo" };
    } catch (error: any) {
      console.error(`[Avo][CancelOrder] Error cancelling order ${payload.orderId}:`, error.message);
      return { success: false, message: "Failed to cancel order" };
    }
  } else {
    try {
      if (!payload.orderId) return { success: false, message: "Order ID is required for cancellation" };

      if (payload.channelId !== this.channelId) {
        return { success: false, message: "Invalid channel ID" };
      }

      const order = await this.prisma.order.findUnique({ where: { partnerId: String(payload.orderId) } });
      if (!order) return { success: false, message: `Order ${payload.orderId} not found in database` };

      const response = await this.handler.odooApiHandler('/api/pos/order/cancel', 'POST', { partner_ref: `Snoono-${payload.order_id}`, "reason": payload.cancellationReason });
      if (response && response.status === "success") {
        console.log('Order successfully cancelled in Odoo with response:', response);
        await this.prisma.order.update({
          where: { partnerId: String(payload.orderId) },
          data: { status: "cancelled" },
        });
        console.log(`Order with Partner ID ${payload.orderId} has been cancelled in the database.`);
        return { success: true, message: "Order cancelled successfully" };
      }
      return { success: false, message: "Failed to cancel order in Odoo" };
    } catch (error: any) {
      console.error("Error cancelling order:", error.message);
      return { success: false, message: "Failed to cancel order" };
    }
  }
  }

  async cancelOrderWebhookFromAvo(payload: any): Promise<any> {
    const channelId = payload.branch_id;
    const channel = branchConfig.find(c => c.channelId === channelId);
    console.log(`[Avo][CancelOrder] Received cancel order webhook for orderId: ${payload.orderId}, channelId: ${payload.branch_id}`);
    try {
      if (!payload.orderId) {
        console.warn(`[Avo][CancelOrder] Missing orderId in payload.`);
        return { success: false, message: "Order ID is required for cancellation" };
      }

      if (payload.branch_id !== channel?.channelId) {
        console.warn(`[Avo][CancelOrder] Invalid channelId: ${payload.branch_id}. Expected: ${channel}`);
        return { success: false, message: "Invalid channel ID" };
      }

      console.log(`[Avo][CancelOrder] Looking up order ${payload.orderId} in database...`);
      const order = await this.prisma.order.findUnique({ where: { partnerId: String(payload.orderId) } });
      if (!order) {
        console.warn(`[Avo][CancelOrder] Order ${payload.orderId} not found in database.`);
        return { success: false, message: `Order ${payload.orderId} not found in database` };
      }
      console.log(`[Avo][CancelOrder] Order found: odoo_id=${order.odoo_id}, current status=${order.status}`);

      console.log(`[Avo][CancelOrder] Sending cancel request to Odoo for orderId: ${payload.orderId}, reason: ${payload.cancellationReason}`);
      const response = await this.handler.odooApiHandler('/api/pos/order/cancel', 'POST', { snoonu_ref: payload.orderId, "reason": payload.cancellationReason });
      console.log(`[Avo][CancelOrder] Odoo response:`, JSON.stringify(response));

      if (response && response.status === "success") {
        console.log(`[Avo][CancelOrder] Order ${payload.orderId} successfully cancelled in Odoo. Updating database...`);
        await this.prisma.order.update({
          where: { partnerId: String(payload.orderId) },
          data: { status: "cancelled" },
        });
        console.log(`[Avo][CancelOrder] Order ${payload.orderId} status updated to "cancelled" in database.`);
        return { success: true, message: "Order cancelled successfully" };
      }
      console.log(`[Avo][CancelOrder] Failed to cancel order ${payload.orderId} in Odoo. Response:`, response);
      return { success: false, message: "Failed to cancel order in Odoo" };
    } catch (error: any) {
      console.error(`[Avo][CancelOrder] Error cancelling order ${payload.orderId}:`, error.message);
      return { success: false, message: "Failed to cancel order" };
    }
  }

  async rejectOrderWebhook(payload: any): Promise<any> {
    let partner = payload.order_name.split("-")[0];
    if(partner === "Avo"){
      try {
        const response = await this.webhookHandlerForAvo(payload, "rejected", "/UpdateOdooOrderStatus", "Pos rejected Order");
        return {success: true, message: "Webhook received for order rejection"};
      } catch (error: any) {
        console.error("Error rejecting order:", error.message);
        return { success: false, message: "Failed to reject order" };
      }
    } else{
    try {
      const webhook = await this.webhookHandler(payload, "rejected", `/api/v1/orders/reject`, 7);
      console.log(`Order ${payload.order_name} with ID ${payload.order_id} has been rejected.`);
      return { success: true, message: "Webhook received for order rejection" };
    } catch (error: any) {
      console.error("Error rejecting order:", error.message);
      return { success: false, message: "Failed to reject order" };
    }
  }
  }

  

  async acceptOrderWebhook(payload: any): Promise<any> {
    let partner = payload.order_name.split("-")[0];
    if(partner === "Avo"){
      try {
        const response = await this.webhookHandlerForAvo(payload, "accepted", "/UpdateOdooOrderStatus", "Pos accepted Order");
        return {success: true, message: "Webhook received for order acceptance"};
      } catch (error: any) {
        console.error("Error accepting order:", error.message);
        return { success: false, message: "Failed to accept order" };
      }
    } else{
    try {      
      await this.webhookHandler(payload, "accepted", `/api/v1/orders/accept`, 2);
      await this.delay(3000);
      await this.webhookHandler(payload, "preparing", `/api/v1/orders/prepare`, 3);
      console.log(`Order ${payload.order_name} with ID ${payload.order_id} has been accepted.`);
      return { success: true, message: "Webhook received for order acceptance" };
    } catch (error: any) {
      console.error("Error accepting order:", error.message);
      return { success: false, message: "Failed to accept order" };
    }
    }
  }

  async readyForPickupWebhook(payload: any): Promise<any> {
    let partner = payload.order_name.split("-")[0];
    if(partner === "Avo"){
      try {
        const response = await this.webhookHandlerForAvo(payload, "readyForPickup", "/UpdateOdooOrderStatus", "Pos ready for pickup Order");
        return {success: true, message: "Webhook received for order ready for pickup"};
      } catch (error: any) {
        console.error("Error ready for pickup order:", error.message);
        return { success: false, message: "Failed to ready for pickup order" };
      }
    } else{
    try {
      await this.webhookHandler(payload, "ready", `/api/v1/orders/ready`, 8);
      console.log(`Order ${payload.order_name} with ID ${payload.order_id} is ready for pickup.`);
    return { success: true, message: "Webhook received for order ready for pickup" };
    } catch (error: any) {
      console.error("Error processing ready for pickup webhook:", error.message);
      return { success: false, message: "Failed to process ready for pickup webhook" };
    }
  }
  }

  async webhookHandler(payload: any, webhookType: string, endpoint: string, status: number): Promise<any> {
    try {
      const { order_id, order_name } = payload;
      const order = await this.prisma.order.findUnique({ where: { odoo_id: String(order_id) } });
      const requestData = {
        "orderId": order?.partnerId,
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

    async webhookHandlerForAvo(payload: any, webhookType: string, endpoint: string, reason: string | null = null): Promise<any> {
    try {
      const { order_id, order_name } = payload;
      const order = await this.prisma.order.findUnique({ where: { odoo_id: String(order_id) } });
      const requestData = {
        "orderId": order?.partnerId,
        "status": webhookType,
        "reason": reason
      }
      await this.handler.AvoApiHandler(endpoint, 'PUT', requestData);

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

  async registerWebhook(): Promise<any> {
    const BASE_URL = "https://baristrosnoonu.cyberboost.io";
    try {
      const payload = {
        "id": this.posId,
        "webhooks": {
          "orderCreateWebhook": `${BASE_URL}/order/place`,
          "orderCancelWebhook": `${BASE_URL}/order/cancel`,
          "menuSyncStatusWebhook": `${BASE_URL}/menu/sync-status`,
          "orderUpdateWebhook": `${BASE_URL}/order/update`,
          "orderStatusUpdateWebhook": `${BASE_URL}/order/status`,
          "loginWebhook": null
        }
      }
      const response = await this.handler.apiHandler('/api/v1/pos/register-webhooks', 'POST', payload);
      console.log('Webhook registration response is :', response);
      return { success: true, message: response };
    } catch (error: any) {
      console.error("Error registering webhooks:", error.message);
      return { success: false, message: "Failed to register webhooks" };
    }
  }
}
