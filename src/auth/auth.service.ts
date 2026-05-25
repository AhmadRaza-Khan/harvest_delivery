import { ForbiddenException, Injectable } from '@nestjs/common';
import { SignInDto, SignUpDto } from './dto';
import * as argon from 'argon2';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { join } from 'path';

@Injectable()
export class AuthService {
    private readonly clientEmail: string;
    private readonly clientPassword: string;
    private readonly snoonuApiUrl: string;
    constructor(private prisma: PrismaService, private config: ConfigService, private jwt: JwtService) {
        this.clientEmail = this.config.get<string>('CLIENT_EMAIL')!;
        this.clientPassword = this.config.get<string>('CLIENT_PASSWORD')!;
        this.snoonuApiUrl = this.config.get<string>('SNOONU_API_URL')!;
    }
    async signUp(dto: SignUpDto){
        try {
            const hash = await argon.hash(dto.password);
            dto.password = hash;
            const newUser = await this.prisma.user.create({
                data: {
                    username: dto.username,
                    password: dto.password,
                },
            });
            return this.signToken(newUser.id, newUser.username);
        } catch (error) {
            if (error instanceof PrismaClientKnownRequestError){
                if (error.code === 'P2002'){
                    throw new ForbiddenException("Username already exists");
                }
            }
            throw error;
        }
    }

    loginForm(res) {
            return res.sendFile(join(process.cwd(), 'public', 'login.html'));
        }

    async signIn(dto: SignInDto){
        const user = await this.prisma.user.findUnique({
            where: {username: dto.username}
        });
        if (!user) throw new ForbiddenException("Credentials incorrect");
        const pwMatches = await argon.verify(user.password, dto.password);
        if (!pwMatches) throw new ForbiddenException("Credentials incorrect");
        return this.signToken(user.id, user.username);
    }
    async signToken(userId: number, username: string): Promise<{access_token: string}>{
        const payload = {
            sub: userId,
            username
        }
        const secret = this.config.get("JWT_SECRET");
        const token = await this.jwt.signAsync(payload, {
            expiresIn: '60m',
            secret
        })
        return { access_token: token }
    }

    async logout(res) {

        res.clearCookie('jwt', {
        httpOnly: true,
        secure: false,
        sameSite: 'strict',
        });
    }

    async getToken(): Promise<any> {
        const token = await this.prisma.token.findFirst({
            where: {
                email: this.clientEmail,
                expiration: {
                    gt: new Date(Date.now() + 5 * 60 * 1000),
                },
            },
        });
        if (token) {
            return token.accessToken;
        }
        return this.getSnoonuAccessToken();
    }

    async getSnoonuAccessToken(): Promise<any> {
        try {
            const response = await fetch(`${this.snoonuApiUrl}/api/v1/users/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: this.clientEmail, password: this.clientPassword }),
            });

            if (!response.ok) {
                throw new Error(`Snoonu login HTTP error: ${response.status} ${response.statusText}`);
            }

            const body = await response.json();

            if (!body.isSuccess || !body.data?.accessToken) {
                throw new Error(`Snoonu login failed: ${JSON.stringify(body)}`);
            }

            const { accessToken } = body.data;

            const serverExpiration = new Date(Date.now() + 3 * 60 * 60 * 1000);

            await this.prisma.token.upsert({
                where: { email: this.clientEmail },
                update: { accessToken, expiration: serverExpiration },
                create: { email: this.clientEmail, accessToken, expiration: serverExpiration },
            });

            console.log(`Snoonu token refreshed. Expires at: ${serverExpiration.toISOString()}`);
            return accessToken;
        } catch (error: any) {
            console.error(`Failed to fetch Snoonu access token: ${error.message}`);
            throw new Error(`Failed to fetch Snoonu access token: ${error.message}`);
        }
    }

}
