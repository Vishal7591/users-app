import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './entity/user.entity';
import { Repository } from 'typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';

jest.mock('bcrypt'); // mock bcrypt library

describe('UserService', () => {
  let service: UserService;
  let repo: jest.Mocked<Repository<User>>;

  const mockUserRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
    upsert: jest.fn(),
    query: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    repo = module.get(getRepositoryToken(User));

    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should throw conflict if email exists', async () => {
      repo.findOne.mockResolvedValue({ id: 1 } as User);

      await expect(
        service.create({
          email: 'test@test.com',
          password: 'pass',
        } as CreateUserDto),
      ).rejects.toThrow(ConflictException);
    });

    it('should hash password and save new user', async () => {
      repo.findOne.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      repo.create.mockReturnValue({} as User);
      repo.save.mockResolvedValue({ id: 1 } as User);

      const result = await service.create({
        email: 'new@test.com',
        password: 'pass',
      } as CreateUserDto);

      expect(bcrypt.hash).toHaveBeenCalledWith('pass', 10);
      expect(repo.create).toHaveBeenCalled();
      expect(repo.save).toHaveBeenCalled();
      expect(result).toEqual({ id: 1 });
    });
  });

  describe('getUsers', () => {
    it('should return all users', async () => {
      const users = [{ id: 1 }, { id: 2 }];
      repo.find.mockResolvedValue(users as User[]);

      const result = await service.getUsers();
      expect(result).toEqual(users);
      expect(repo.find).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should find user by id', async () => {
      const user = { id: 1 };
      repo.findOne.mockResolvedValue(user as User);

      const result = await service.findById(1);
      expect(result).toEqual(user);
    });

    it('should throw if user not found', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.findById(1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      const user = { email: 'test@test.com' };
      repo.findOne.mockResolvedValue(user as User);

      const result = await service.findByEmail('test@test.com');
      expect(result).toEqual(user);
    });

    it('should throw if user not found by email', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.findByEmail('no@test.com')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deleteUser', () => {
    it('should mark user as deleted', async () => {
      const user = { id: 1, isActive: true, isDeleted: false };
      repo.findOne.mockResolvedValue(user as User);
      repo.save.mockResolvedValue({
        ...user,
        isActive: false,
        isDeleted: true,
      } as User);

      await service.deleteUser('1');

      expect(repo.save).toHaveBeenCalledWith({
        id: 1,
        isActive: false,
        isDeleted: true,
      });
    });

    it('should throw if user not found on delete', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.deleteUser('1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('activateUser', () => {
    it('should activate a user by email', async () => {
      repo.update.mockResolvedValue(undefined as any);

      await service.activateUser('test@test.com');

      expect(repo.update).toHaveBeenCalledWith(
        { email: 'test@test.com' },
        { isActive: true },
      );
    });
  });

  describe('updateUser', () => {
    it('should throw if user not found', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(
        service.updateUser('1', {} as CreateUserDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update user and hash password if present', async () => {
      const existingUser = { id: 1, email: 'test@test.com' };
      repo.findOne.mockResolvedValueOnce(existingUser as User);
      repo.findOne.mockResolvedValueOnce({
        id: 1,
        email: 'test@test.com',
      } as User);
      (bcrypt.hash as jest.Mock).mockResolvedValue('newHashedPassword');
      repo.update.mockResolvedValue(undefined as any);

      const result = await service.updateUser('1', {
        password: 'newpassword',
      } as CreateUserDto);

      expect(bcrypt.hash).toHaveBeenCalledWith('newpassword', 10);
      expect(repo.update).toHaveBeenCalled();
      expect(result).toEqual({ id: 1, email: 'test@test.com' });
    });
  });

  describe('saveUsers', () => {
    it('should save multiple users with hashed passwords', async () => {
      const users = [
        { email: 'a@test.com', password: 'pass1' },
        { email: 'b@test.com', password: 'pass2' },
      ];

      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPass');
      repo.upsert.mockResolvedValue(undefined as any);
      repo.query.mockResolvedValue(undefined);
      repo.find.mockResolvedValue([
        { email: 'a@test.com' },
        { email: 'b@test.com' },
      ] as User[]);

      const result = await service.saveUsers(users as CreateUserDto[]);

      expect(bcrypt.hash).toHaveBeenCalledTimes(2);
      expect(repo.upsert).toHaveBeenCalled();
      expect(repo.query).toHaveBeenCalled();
      expect(result).toEqual([
        { email: 'a@test.com' },
        { email: 'b@test.com' },
      ]);
    });
  });
});
