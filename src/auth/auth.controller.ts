import { Controller, Post, Res, Body } from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { AuthDto } from './dto/auth.dto';
import { loginType } from './types/login.type';

@Controller('/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('/login')
  async login(
    @Body() loginDto: AuthDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<loginType> {
    const result = await this.authService.login(loginDto);

    res.cookie('access_token', result.token, {
      httpOnly: true,
      secure: false,
      expires: new Date(Date.now() + 1 * 24 * 60 * 1000),
    });

    return result;
  }

  @Post('/confirm')
  async confirmEmail(@Body() confirmDto: { token: string }) {
    return this.authService.confirmEmail(confirmDto.token);
  }
}
