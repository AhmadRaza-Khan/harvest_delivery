import { Body, Controller, Get, Post, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignInDto, SignUpDto } from './dto';
import type { Response } from 'express';

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) {}
    @Post('signup')
    async signUp(@Body() dto: SignUpDto, @Res() res: Response){
        const result = await this.authService.signUp(dto);
        const access_token = result.access_token;
        res.cookie('jwt', access_token, {
            httpOnly: true,
            secure: false, 
            sameSite: 'lax', 
            maxAge: 1000 * 60 * 60,
            });
        return res.json({ success: true, status:200, message: 'Signed up successfully' });
    }

    @Post('signin')
    async signIn(@Body() dto: SignInDto, @Res() res: Response){
        const result = await this.authService.signIn(dto);
        const access_token = result.access_token;
        res.cookie('jwt', access_token, {
            httpOnly: true,
            secure: false, 
            sameSite: 'lax', 
            maxAge: 1000 * 60 * 60,
            });
        return res.json({ success: true, status:200, message: 'Logged in successfully' });
    }

    @Get("/signin")
    signInPage(@Res() res: Response){
        return this.authService.loginForm(res)
    }

    @Post('logout')
    async logout(@Res() res: Response){
        this.authService.logout(res);
        return res.json({  success: true, status:200, message: 'Logged out successfully' });
    }

    @Get("/test")
    async getToken(){
        return this.authService.getToken();
    }
}
