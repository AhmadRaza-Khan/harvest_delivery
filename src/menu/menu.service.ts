import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { HandlerService } from '../handler/handler.service';
import { channels } from '../order/CONSTANTS';

@Injectable()
export class MenuService {
    private readonly brandId: string;
    constructor(
        private handler: HandlerService, private prisma: PrismaService, private config: ConfigService
    ) {
        this.brandId = this.config.get<string>('BRAND_ID')!;
    }

    async saveCategoriesToDB(): Promise<any> {
        const response = await this.handler.odooApiHandler("/api/pos/categs", "GET");
        try {
            const categories: { category_id: number; category_name: any; products: any[] }[] = response?.data ?? [];

            for (const cat of categories) {
                await this.prisma.category.upsert({
                    where: { categoryId: cat.category_id },
                    create: { categoryId: cat.category_id, categoryEng: cat.category_name.en, categoryArb: cat.category_name.ar, products: cat.products },
                    update: { categoryEng: cat.category_name.en, categoryArb: cat.category_name.ar, products: cat.products },
                });
            }

            return { success: true, saved: categories.length };
        } catch (error: any) {
            console.log(`Error occurred during saving categories to database: \n ${error.message}`);
            return { success: false, message: `Error occurred during saving categories to database: \n ${error.message}` }
        }
    }

    async saveProductsToDB(): Promise<any> {
        try {
            const response = await this.handler.odooApiHandler("/api/pos/products", "GET");
            return response;

            // await Promise.all((response?.products ?? []).map(async (product: any)=> {
            //     await this.prisma.product.create({
            //         data: {
            //             productId: product.id,
            //             imageUrl: product.image,
            //             variants: product.variants as any,
            //             attributes: product.attributes as any,
            //             productNameEn: product.name.en,
            //             productNameAr: product.name.ar
            //         }
            //     })
            // }))



            // return { success: true, saved: (response?.products ?? []).length };

            await Promise.all((response?.products ?? []).map(async (product: any) => {
                const attributes = product.attributes || [];

                await this.prisma.product.updateMany({
                    where: { productId: product.id },
                    data: { attributes, productNameEn: product.name.en, productNameAr: product.name.ar, imageUrl: product.image_url, variants: product.variants},
                });
            }));

            return { success: true };
        } catch (error: any) {
            console.log(`Error occurred during saving products to database: \n ${error.message}`);
            return { success: false, message: `Error occurred during saving products to database: \n ${error.message}` }
        }
    }

    async saveMenuToAVO(): Promise<any> {
        const dbProducts = await this.prisma.product.findMany({});
        const payload = {
            brandId: 23,
            products: dbProducts.map(product => ({
                name: product.productNameEn,
                posId: product.productId,
                price: product.variants?.[0]?.price || 0,
                additions: product?.attributes ? (product.attributes as any[]).flatMap((attribute: any) =>
                attribute.values.map(value => ({
                    name: value.name.en,
                    posId: value.id,
                    price: value.price_extra || 0,
                }))
                ) : [],
            })),
            };
            return payload;
        const response = await this.handler.AvoApiHandler("/ReceiveMenuFromOdoo", "POST", payload);
        console.log("Response from AVO API after syncing menu: ", response);
        return response;
    }

    async saveMenu(): Promise<any> {
        // await this.prisma.product.updateMany({where: {isSynced: true}, data: { isSynced: false}})
        // return "hello"
        try {
            const channelId = "019dd37a-3afb-7823-b033-8d542494ec1a";
            const posId = this.config.get<string>('POS_ID')!;
            const menuName = this.config.get<string>('MENU_NAME') ?? 'Menu';
            const menuNameAr = this.config.get<string>('MENU_NAME_AR') ?? 'قائمة';
            const menuImageUrl = this.config.get<string>('MENU_IMAGE_URL') ?? '';
            const config: any = [];
            channels.map((c) => {
                config.push({ channelId: c.channelId, snoozed: false });
            });

            const [allProducts, categories] = await Promise.all([
                this.prisma.product.findMany({ where: { isSynced: true } }),
                this.prisma.category.findMany({}),
            ]);

            const isBilingual = (en: string, ar: string) =>
                !!en && !!ar && en.trim() !== ar.trim();

            const products = allProducts.filter(p => {
                if (!p.imageUrl) return false;
                if (!isBilingual(p.productNameEn, p.productNameAr)) return false;

                const variants = (p.variants as any[]) ?? [];
                if (!variants.length) return false;
                if (!variants.every((v: any) => isBilingual(v.name?.en, v.name?.ar))) return false;

                const attrs = (p.attributes as any[]) ?? [];
                return attrs.every((a: any) =>
                    isBilingual(a.attribute_name?.en, a.attribute_name?.ar) &&
                    (a.values ?? []).every((v: any) => isBilingual(v.name?.en, v.name?.ar))
                );
            });

            if (products.length === 0) {
                const report = allProducts.map(p => {
                    const reasons: string[] = [];

                    if (!p.imageUrl) reasons.push('Missing product image');
                    if (!isBilingual(p.productNameEn, p.productNameAr))
                        reasons.push(`Product name missing Arabic or same as English (en: "${p.productNameEn}", ar: "${p.productNameAr}")`);

                    const variants = (p.variants as any[]) ?? [];
                    if (!variants.length) {
                        reasons.push('No variants found');
                    } else {
                        variants.forEach((v: any, i: number) => {
                            if (!isBilingual(v.name?.en, v.name?.ar))
                                reasons.push(`Variant[${i}] name missing Arabic or same as English (en: "${v.name?.en}", ar: "${v.name?.ar}")`);
                        });
                    }

                    const attrs = (p.attributes as any[]) ?? [];
                    attrs.forEach((a: any) => {
                        if (!isBilingual(a.attribute_name?.en, a.attribute_name?.ar))
                            reasons.push(`Attribute "${a.attribute_name?.en}" (id: ${a.attribute_id}) missing Arabic or same as English`);
                        (a.values ?? []).forEach((v: any) => {
                            if (!isBilingual(v.name?.en, v.name?.ar))
                                reasons.push(`Attribute "${a.attribute_name?.en}" → value "${v.name?.en}" (id: ${v.id}) missing Arabic or same as English`);
                        });
                    });

                    return { productId: p.productId, name: p.productNameEn, reasons };
                });

                return { success: false, message: 'No eligible products to sync', products: report };
            }

            const modGroupMap = new Map<string, any>();
            const modifierMap = new Map<string, any>();

            for (const product of products) {
                for (const attrGroup of (product.attributes as any[]) ?? []) {
                    const groupNameEn = attrGroup.attribute_name?.en || '';
                    const groupNameAr = attrGroup.attribute_name?.ar || '';
                    if (!groupNameEn || !groupNameAr || groupNameEn === groupNameAr) continue;

                    const modGroupId = `modgroup${attrGroup.attribute_id}`;
                    const modifierIds: string[] = [];

                    for (const val of attrGroup.values ?? []) {
                        const modNameEn = val.name?.en || '';
                        const modNameAr = val.name?.ar || '';
                        if (!modNameEn || !modNameAr || modNameEn === modNameAr) continue;

                        const modId = `mod${val.id}`;
                        modifierIds.push(modId);

                        if (!modifierMap.has(modId)) {
                            modifierMap.set(modId, {
                                modId,
                                imageUrl: product.imageUrl,
                                name: [
                                    { language: 0, value: modNameEn },
                                    { language: 1, value: modNameAr },
                                ],
                                description: [
                                    { language: 0, value: '' },
                                    { language: 1, value: '' },
                                ],
                                price: Number(val.price_extra ?? 0),
                                snoozed: false,
                                channelConfigurations: [{ channelId, snoozed: false }],
                            });
                        }
                    }

                    if (modifierIds.length > 0 && !modGroupMap.has(modGroupId)) {
                        modGroupMap.set(modGroupId, {
                            modGroupId,
                            name: [
                                { language: 0, value: groupNameEn },
                                { language: 1, value: groupNameAr },
                            ],
                            description: [
                                { language: 0, value: '' },
                                { language: 1, value: '' },
                            ],
                            max: 0,
                            min: 0,
                            modifierIds,
                            snoozed: false,
                            channelConfigurations: config,
                        });
                    }
                }
            }

            const validModifierIds = new Set(modifierMap.keys());
            const finalModGroups = Array.from(modGroupMap.values())
                .map((g: any) => ({
                    ...g,
                    modifierIds: g.modifierIds.filter((id: string) => validModifierIds.has(id)),
                }))
                .filter((g: any) => g.modifierIds.length > 0);

            const finalModGroupIds = new Set(finalModGroups.map((g: any) => g.modGroupId));
            const eligibleProductIdSet = new Set(products.map(p => String(p.productId)));

            const formattedProducts = products.map((product, i) => {
                const attrs = (product.attributes as any[]) ?? [];
                const variants = (product.variants as any[]) ?? [];
                const price = Number(variants[0]?.price ?? 0);
                const modifierGroups = attrs
                    .map((a: any) => `modgroup${a.attribute_id}`)
                    .filter((id: string) => finalModGroupIds.has(id));

                return {
                    productId: String(product.productId),
                    imageUrl: product.imageUrl,
                    name: [
                        { language: 0, value: product.productNameEn },
                        { language: 1, value: product.productNameAr },
                    ],
                    description: [
                        { language: 0, value: variants[0]?.description?.en ?? '' },
                        { language: 1, value: variants[0]?.description?.ar ?? '' },
                    ],
                    price,
                    defaultDiscount: 0,
                    sortOrder: i + 1,
                    modifierGroups,
                    snoozed: product.isSnoozed,
                    channelConfigurations: [
                        {
                            channelId,
                            snoozed: product.isSnoozed,
                            snoozedUntil: null,
                            price: null,
                            discount: null,
                        },
                    ],
                };
            });

            const formattedCategories = categories
                .map((cat, i) => {
                    const catProducts = ((cat.products as any[]) ?? [])
                        .map((p: any) => String(p.id))
                        .filter((pid: string) => eligibleProductIdSet.has(pid));

                    return {
                        categoryId: String(cat.categoryId),
                        name: [
                            { language: 0, value: cat.categoryEng },
                            { language: 1, value: cat.categoryArb },
                        ],
                        description: [
                            { language: 0, value: '' },
                            { language: 1, value: '' },
                        ],
                        imageUrl: '',
                        products: catProducts,
                        snoozed: cat.isSnoozed,
                        sortOrder: i + 1,
                        channelConfigurations: [{ channelId, snoozed: false }],
                    };
                })
                .filter(cat => cat.products.length > 0);

            const menu = {
                menuId: posId,
                menuName: [
                    { language: 0, value: menuName },
                    { language: 1, value: menuNameAr },
                ],
                description: [
                    { language: 0, value: '' },
                    { language: 1, value: '' },
                ],
                menuImageUrl,
                currency: 'QR',
                categories: formattedCategories,
                products: formattedProducts,
                modifierGroups: finalModGroups,
                modifiers: Array.from(modifierMap.values()),
            };


            const result = await this.handler.apiHandler(`/api/v1/menu/save`, 'POST', menu);
            await this.prisma.product.updateMany({
                where: { productId: { in: products.map(p => p.productId) } },
                data: { isSynced: true },
            });
            return { success: true, result };
        } catch (error: any) {
            console.error('Error saving menu:', error);
            return { success: false, message: error.message };
        }
    }

    async listProducts(): Promise<any> {
        return this.prisma.product.findMany({ orderBy: { productId: 'asc' } });
    }

    async deleteProduct(productId: number): Promise<any> {
        const existing = await this.prisma.product.findUnique({ where: { productId } });
        if (!existing) return { success: false, message: 'Product not found' };
        await this.prisma.product.delete({ where: { productId } });
        return { success: true };
    }

    async listCategories(): Promise<any> {
        return this.prisma.category.findMany({ orderBy: { categoryId: 'asc' } });
    }

    async deleteCategory(categoryId: number): Promise<any> {
        const existing = await this.prisma.category.findUnique({ where: { categoryId } });
        if (!existing) return { success: false, message: 'Category not found' };
        await this.prisma.category.delete({ where: { categoryId } });
        return { success: true };
    }

    async getChannelIds(): Promise<any> {
        try {
            const response = await this.handler.apiHandler("/api/v1/channels/list", "POST");
            return response;
        } catch (error) {
            console.error('Error saving menu:', error);
            throw error;
        }
    }

    async test(){
        const requestId1 = "019eac3d-29f0-7500-89d5-42ec5942d256";
        const requestId2 = "019f227f-b7b0-7796-9c9c-505030e239be";

        const channelId = "019dd37a-3afb-7823-b033-8d542494ec1a";
        const response =  await this.handler.apiHandler(`/api/v1/menu/${requestId2}/status`, "GET");
        console.log(response);
        return {response}
    }
}
