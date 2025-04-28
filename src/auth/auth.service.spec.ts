import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, HttpException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let userService: jest.Mocked<UserService>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;

  const mockUserService = {
    findByEmail: jest.fn(),
    activateUser: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserService, useValue: mockUserService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);

    userService = module.get(UserService);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);

    jest.clearAllMocks();
  });

  describe('validateUser', () => {
    it('should return user without password if credentials are valid', async () => {
      const user = {
        id: 1,
        email: 'test@example.com',
        password: 'hashed',
        role: 'User',
      };
      userService.findByEmail.mockResolvedValue(user as any);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

      const result = await service.validateUser('test@example.com', 'password');

      expect(result).toEqual({
        id: 1,
        email: 'test@example.com',
        role: 'User',
      });
      expect(userService.findByEmail).toHaveBeenCalled();
    });

    it('should return null if credentials are invalid', async () => {
      const user = { id: 1, email: 'test@example.com', password: 'hashed' };
      userService.findByEmail.mockResolvedValue(user as any);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      const result = await service.validateUser(
        'test@example.com',
        'wrongpassword',
      );

      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    it('should throw HttpException if user validation fails', async () => {
      jest.spyOn(service, 'validateUser').mockResolvedValue(null);

      await expect(
        service.login({ email: 'x', password: 'x' }),
      ).rejects.toThrow(HttpException);
    });

    it('should return token for normal user', async () => {
      const user = { id: 1, email: 'test@example.com', role: 'User' };
      jest.spyOn(service, 'validateUser').mockResolvedValue(user as any);
      jwtService.sign.mockReturnValue('signed-token');

      const result = await service.login({
        email: 'test@example.com',
        password: 'password',
      });

      expect(result).toEqual({
        user: { id: 1, email: 'test@example.com' },
        token: 'signed-token',
      });
    });

    it('should not return token for Admin user', async () => {
      const user = { id: 1, email: 'admin@example.com', role: 'Admin' };
      jest.spyOn(service, 'validateUser').mockResolvedValue(user as any);

      const result = await service.login({
        email: 'admin@example.com',
        password: 'password',
      });

      expect(result).toEqual({
        user: { id: 1, email: 'admin@example.com' },
      });
    });
  });

  describe('confirmEmail', () => {
    it('should throw BadRequestException if email is already confirmed', async () => {
      jest.spyOn(service, 'decodeToken').mockResolvedValue('test@example.com');
      userService.findByEmail.mockResolvedValue({ isActive: true } as any);

      await expect(service.confirmEmail('token')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should activate user and return success message', async () => {
      jest.spyOn(service, 'decodeToken').mockResolvedValue('test@example.com');
      userService.findByEmail.mockResolvedValue({ isActive: false } as any);

      const result = await service.confirmEmail('token');

      expect(userService.activateUser).toHaveBeenCalledWith('test@example.com');
      expect(result).toEqual({ message: 'Email confirmed successfully' });
    });
  });

  describe('decodeToken', () => {
    it('should return email if token is valid', async () => {
      jwtService.verify.mockResolvedValue({
        email: 'test@example.com',
      } as never);

      configService.get.mockReturnValue('test-secret');

      const email = await service.decodeToken('token');

      expect(email).toBe('test@example.com');
    });

    it('should throw BadRequestException if token expired', async () => {
      const error = { name: 'TokenExpiredError' };
      jwtService.verify.mockRejectedValue(error as never);

      await expect(service.decodeToken('token')).rejects.toThrow(
        new BadRequestException('Email confirmation token expired'),
      );
    });

    it('should throw BadRequestException if token is bad', async () => {
      jwtService.verify.mockRejectedValue(new Error('Invalid token') as never);

      await expect(service.decodeToken('token')).rejects.toThrow(
        new BadRequestException('Bad confirmation token'),
      );
    });
  });
});
