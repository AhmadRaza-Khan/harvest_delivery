import { Injectable, BadRequestException } from '@nestjs/common';
import { join } from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { HandlerService } from '../handler/handler.service'
import { branchConfig } from '../order/CONSTANTS';

const BRANCH_FIELD: Record<string, 'isSnoozedPearl' | 'isSnoozedWestWalk'> = {
    'The Pearl': 'isSnoozedPearl',
    'West Walk': 'isSnoozedWestWalk',
};

const BRANCH_NAMES: string[] = Object.keys(BRANCH_FIELD);

@Injectable()
export class SnoozeService {
    constructor(private prisma: PrismaService, private handler: HandlerService) {}

    index(res) {
        return res.sendFile(join(process.cwd(), 'public', 'home.html'));
    }

    private branchField(branch: string) {
        const field = BRANCH_FIELD[branch];
        if (!field) throw new BadRequestException(`Unknown branch: ${branch}`);
        return field;
    }

    async test(): Promise<any> {
        const requestPayload = {
        "id": "019dd37d-d762-7786-8e75-74812789c87c",
        "isActive": true,
        "posId": "019dd371-0ab8-7b36-a768-c4fc7039737b"
        }
        const response = await this.handler.apiHandler("/api/v1/channels/status", "PUT", requestPayload)
        console.log(response);
        return response;
    }

    async listProductsForBranch(branch: string): Promise<any> {
        const field = this.branchField(branch);
        const products = await this.prisma.product.findMany( { where: { isSynced: true }, orderBy: { productId: 'asc' } });

        return products.map((product) => ({
            ...product,
            isSnoozed: product[field],
            attributes: ((product.attributes as any[]) ?? []).map((group: any) => ({
                ...group,
                values: (group.values ?? []).map((value: any) => ({
                    ...value,
                    isSnoozed: !!value[field],
                })),
            })),
        }));
    }

    async listAddonsForBranch(branch: string): Promise<any> {
        const field = this.branchField(branch);
        const products = await this.prisma.product.findMany({ orderBy: { productId: 'asc' } });

        const addonMap = new Map<number, any>();
        for (const product of products) {
            for (const group of (product.attributes as any[]) ?? []) {
                for (const value of group.values ?? []) {
                    if (!addonMap.has(value.id)) {
                        addonMap.set(value.id, {
                            id: value.id,
                            ptavId: value.ptav_id,
                            name: value.name,
                            priceExtra: value.price_extra ?? 0,
                            attributeName: group.attribute_name,
                            productIds: [],
                            isSnoozed: !!value[field],
                        });
                    }
                    addonMap.get(value.id).productIds.push(product.productId);
                }
            }
        }

        return Array.from(addonMap.values());
    }

    async listBranches(): Promise<any> {
        const names = [...new Set(BRANCH_NAMES)];
        const rows = await this.prisma.branch.findMany({ where: { name: { in: names } } });
        const byName = new Map(rows.map(r => [r.name, r]));

        return names.map(name => ({
            name,
            isSnoozed: byName.get(name)?.isSnoozed ?? false,
        }));
    }

    async snoozeBranch(branch: string): Promise<any> {
        const branchData = branchConfig.find(b => b.name === branch && b.partner === 'Avo');
        if (!branchData) return { success: false, message: `Unknown branch: ${branch}` };
        try {
            await this.handler.AvoApiHandler("/SnoozeBranchFromOdoo", "POST", { branchId: branchData.channelId })

            const branchData2 = branchConfig.find(b => b.name === branch && b.partner === 'Snoonu');

            const requestPayload = {
                "id": branchData2?.channelId,
                "isActive": false,
                "posId": "019dd371-0ab8-7b36-a768-c4fc7039737b"
            }

            await this.handler.apiHandler("/api/v1/channels/status", "PUT", requestPayload)

            await this.prisma.branch.upsert({
                where: { name: branch },
                create: { name: branch, isSnoozed: true },
                update: { isSnoozed: true },
            });

            return { success: true, message: "Branch Snoozed"}
        } catch (error: any) {
            console.log("Snoozing branch in Avo failed dur to: ", error.message)
            return { success: false, message: `Branch snoozing failed in Avo due to: ${error.message}` }
        }
    }

    async unSnoozeBranch(branch: string): Promise<any> {
        const branchData = branchConfig.find(b => b.name === branch && b.partner === 'Avo');
        if (!branchData) return { success: false, message: `Unknown branch: ${branch}` };
        try {
            await this.handler.AvoApiHandler("/UnsnoozeBranchFromOdoo", "POST", { branchId: branchData.channelId });

            const branchData2 = branchConfig.find(b => b.name === branch && b.partner === 'Snoonu');

            const requestPayload = {
                "id": branchData2?.channelId,
                "isActive": true,
                "posId": "019dd371-0ab8-7b36-a768-c4fc7039737b"
            }
            await this.handler.apiHandler("/api/v1/channels/status", "PUT", requestPayload)
            await this.prisma.branch.upsert({
                where: { name: branch },
                create: { name: branch, isSnoozed: false },
                update: { isSnoozed: false },
            });
            return { success: true, message: "Branch unsnoozed"}
        } catch (error: any) {
            console.log("Unsnoozing branch in Avo failed dur to: ", error.message)
            return { success: false, message: `Branch unsnoozing failed in Avo due to: ${error.message}` }
        }
    }

    async snoozeProduct(productId: number, branch: string, isAddon: boolean): Promise<any> {
        const branchData = branchConfig.find(b => b.name === branch && b.partner === 'Avo');
        if (!branchData) return { success: false, message: `Unknown branch: ${branch}` };
        try {
            const requestPayload = {
                "branchId": branchData.channelId,
                "itemPosId": productId,
                "isAddon": isAddon
                };
                console.log("Request Payload for snoozing product: ", requestPayload);
            const response = await this.handler.AvoApiHandler("/SnoozeItemFromOdoo", "POST", requestPayload)
            console.log(response);
            await this.setSnoozeState(productId, branch, isAddon, true);
            return { success: true, message: isAddon ? "Add-on Snoozed" : "Product Snoozed" }
        } catch (error: any) {
            console.log("Snoozing product in Avo failed dur to: ", error.message)
            return { success: false, message: `Product snoozing failed in Avo due to: ${error.message}` }
        }
    }

    async unSnoozeProduct(productId: number, branch: string, isAddon: boolean): Promise<any> {
        const branchData = branchConfig.find(b => b.name === branch && b.partner === 'Avo');
        if (!branchData) return { success: false, message: `Unknown branch: ${branch}` };
        try {
            const requestPayload = {
                "branchId": branchData.channelId,
                "itemPosId": productId,
                "isAddon": isAddon
                };
                console.log("Request Payload for unsnoozing product: ", requestPayload);
            const response = await this.handler.AvoApiHandler("/UnsnoozeItemFromOdoo", "POST", requestPayload)
            console.log(response);
            await this.setSnoozeState(productId, branch, isAddon, false);
            return { success: true, message: isAddon ? "Add-on unsnoozed" : "Product unsnoozed" }
        } catch (error: any) {
            console.log("Unsnoozing Product in Avo failed dur to: ", error.message)
            return { success: false, message: `Product unsnoozing failed in Avo due to: ${error.message}` }
        }
    }

    private async setSnoozeState(itemId: number, branch: string, isAddon: boolean, isSnoozed: boolean): Promise<void> {
        const field = this.branchField(branch);

        if (!isAddon) {
            await this.prisma.product.update({ where: { productId: itemId }, data: { [field]: isSnoozed } });
            return;
        }

        const products = await this.prisma.product.findMany({});
        for (const product of products) {
            const attributes = (product.attributes as any[]) ?? [];
            let changed = false;
            const updatedAttributes = attributes.map((group: any) => ({
                ...group,
                values: (group.values ?? []).map((value: any) => {
                    if (value.id !== itemId) return value;
                    changed = true;
                    return { ...value, [field]: isSnoozed };
                }),
            }));

            if (changed) {
                await this.prisma.product.update({ where: { id: product.id }, data: { attributes: updatedAttributes } });
            }
        }
    }
}
