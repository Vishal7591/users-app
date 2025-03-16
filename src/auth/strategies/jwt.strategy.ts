import { UserService } from '../../user/user.service';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private readonly userService: UserService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: 'JWT_SECRET',
      // configService.get<string>('JWT_SECRET'),
      key: 'JWT_SECRET',
      // configService.get<string>('JWT_SECRET'),
      secretOrPrivateKey: 'JWT_SECRET',
    } as any);
  }
  async validate(payload: any) {
    return this.userService.findById(payload.id);
  }
}
