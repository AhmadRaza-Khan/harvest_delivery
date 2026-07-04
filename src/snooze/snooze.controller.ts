import { Controller, Get, Patch, Param, Res, UseGuards, Body, Post, Query } from '@nestjs/common';
import { SnoozeService } from './snooze.service';
import { JwtGuard } from '../auth/guard';

// @UseGuards(JwtGuard)
@Controller('/')
export class SnoozeController {
    constructor(private readonly service: SnoozeService) {}

    @Get('/')
    async home(@Res() res) {
        await this.service.index(res);
    }

    @Get('/snooze/test')
    async test() {
        return await this.service.test();
    }

    @Get('/snooze/branches')
    async listBranches() {
        return await this.service.listBranches();
    }

    @Post('/snooze/snooze-branch')
    async snoozeBranch(@Query('branch') branch: string) {
        return await this.service.snoozeBranch(branch);
    }

    @Post('/snooze/unsnooze-branch')
    async unSnoozeBranch(@Query('branch') branch: string) {
        return await this.service.unSnoozeBranch(branch);
    }

    @Get('/snooze/products')
    async listProducts(@Query('branch') branch: string) {
        return await this.service.listProductsForBranch(branch);
    }

    @Get('/snooze/addons')
    async listAddons(@Query('branch') branch: string) {
        return await this.service.listAddonsForBranch(branch);
    }

    @Get("/snooze/product")
    async snoozeProduct(@Query('id') id: string, @Query('branch') branch: string, @Query('isAddon') isAddon: string){
        return await this.service.snoozeProduct(+id, branch, isAddon === 'true');
    }

    @Get("/unsnooze/product")
    async unSnoozeProduct(@Query('id') id: string, @Query('branch') branch: string, @Query('isAddon') isAddon: string){
        return await this.service.unSnoozeProduct(+id, branch, isAddon === 'true');
    }
}
