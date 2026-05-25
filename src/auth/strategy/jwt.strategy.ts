import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../prisma/prisma.service";
import type { Request } from "express";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt',) {
  constructor(config: ConfigService, private prisma: PrismaService) {
    super({
        jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => {
          let token = null;
          if (req && req.cookies) {
            token = req.cookies['jwt'];
          }
          return token;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: config.get("JWT_SECRET")!,
    });
  }

  async validate(payload: { sub: number; username: string }) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: payload.sub,
      },
      select: {
      id: true,
      username: true,
    },
    });
    return user;
  }
}
