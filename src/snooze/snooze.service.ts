import { Injectable } from '@nestjs/common';
import { join } from 'path';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SnoozeService {
    constructor(private prisma: PrismaService) {}

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
}
