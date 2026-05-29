import { IsNotEmpty, IsString } from "class-validator";


export class OdooWebhookDto {

    @IsString()
    @IsNotEmpty()
    order_id: string;

    @IsString()
    @IsNotEmpty()
    order_name: string;

    @IsString()
    @IsNotEmpty()
    status: string;
}