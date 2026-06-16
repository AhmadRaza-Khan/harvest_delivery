import { Controller, Get, Patch, Param, Res, UseGuards, Body, Post } from '@nestjs/common';
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

    @Get('snooze/products')
    async getProducts() {
        return this.service.getProducts();
    }

    @Patch('snooze/products/:id/snooze')
    async toggleSnooze(@Param('id') id: string) {
        return this.service.toggleProductSnooze(+id);
    }
    @Post('/snooze/snooze-branch')
    async snoozeBranch(@Body() branchId: string) {
        return await this.service.snoozeBranch(branchId);
    }

    @Post('/snooze/unsnooze-branch')
    async unSnoozeBranch(@Body() branchId: string) {
        return await this.service.unSnoozeBranch(branchId);
    }
}
