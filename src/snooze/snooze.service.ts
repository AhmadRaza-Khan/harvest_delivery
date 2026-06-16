import { Injectable } from '@nestjs/common';
import { join } from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { HandlerService } from '../handler/handler.service'

@Injectable()
export class SnoozeService {
    constructor(private prisma: PrismaService, private handler: HandlerService) {}

    index(res) {
        return res.sendFile(join(process.cwd(), 'public', 'home.html'));
    }

    async getProducts(): Promise<any> {
        return this.prisma.product.findMany({ orderBy: { productId: 'asc' } });
    }

    async toggleProductSnooze(productId: number): Promise<any> {
        const product = await this.prisma.product.findUnique({ where: { productId } });
        if (!product) return { success: false, message: 'Product not found' };

        const updated = await this.prisma.product.update({
            where: { productId },
            data: { isSnoozed: !product.isSnoozed },
        });
        return { success: true, isSnoozed: updated.isSnoozed };
    }

    async snoozeBranch(branchId: string): Promise<any> {
        try {
            const response = await this.handler.AvoApiHandler("/SnoozeBranchFromOdoo", "POST", branchId)
            console.log(response);
            return { success: true, message: "Branch Snoozed"}
        } catch (error: any) {
            console.log("Snoozing branch in Avo failed dur to: ", error.message)
            return { success: false, message: `Branch snoozing failed in Avo due to: ${error.message}` }
        }
    } 

    async unSnoozeBranch(branchId: string): Promise<any> {
        try {
            const response = await this.handler.AvoApiHandler("/UnsnoozeBranchFromOdoo", "POST", branchId)
            console.log(response);
            return { success: true, message: "Branch unsnoozed"}
        } catch (error: any) {
            console.log("Unsnoozing branch in Avo failed dur to: ", error.message)
            return { success: false, message: `Branch unsnoozing failed in Avo due to: ${error.message}` }
        }
    } 
}
