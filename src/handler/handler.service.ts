import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class HandlerService {
    private readonly snoonuApiUrl: string;
    private readonly baseUrl: string;
    private readonly apiKey: string;
    constructor(private config: ConfigService, private authService: AuthService) {
        this.snoonuApiUrl = this.config.get<string>('SNOONU_API_URL')!;
        this.baseUrl = this.config.get<string>('ODOO_URL')!;
        this.apiKey = this.config.get<string>('ODOO_API_KEY')!;
    }
    async apiHandler(endpoint: string, method: string, payload: any = null): Promise<any> {
        try {
            const url = `${this.snoonuApiUrl.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`;

            const token = await this.authService.getToken();
            const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            };

            const options: RequestInit = {
            method: method.toUpperCase(),
            headers,
            };

            if (payload && !['GET', 'HEAD'].includes(method.toUpperCase())) {
            options.body = JSON.stringify(payload);
            }

            const response = await fetch(url, options);

            const contentType = response.headers.get('content-type');

            const data = contentType?.includes('application/json')
            ? await response.json()
            : await response.text();

            if (!response.ok) {
            throw new Error(
                `Snoonu API Error ${response.status}: ${JSON.stringify(data)}`,
            );
            }

            return data;
        } catch (error: any) {
            throw new Error(`apiHandler failed: ${error.message}`);
        }
}

    async odooApiHandler(endpoint: string, method: string, payload: any = null): Promise<any> {
    try {

        const url = `${this.baseUrl}${endpoint}`;

        const headers: Record<string, string> = {
        'Content-Type': 'application/json',

        'X-API-KEY': this.apiKey,
        };

        const options: RequestInit = {
        method: method.toUpperCase(),
        headers,
        };

        if (payload && !['GET', 'HEAD'].includes(method.toUpperCase())) {
        options.body = JSON.stringify(payload);
        }

        const response = await fetch(url, options);

        const contentType = response.headers.get('content-type');

        const data =
        contentType?.includes('application/json')
            ? await response.json()
            : await response.text();

        if (!response.ok) {
        throw new Error(
            `Odoo API Error ${response.status}: ${JSON.stringify(data)}`,
        );
        }

        return data;
    } catch (error: any) {
        throw new Error(`odooApiHandler failed: ${error.message}`);
    }
    }
}
