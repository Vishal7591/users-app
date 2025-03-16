import { CreateUserDto } from './dto/create-user.dto';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { User } from './entity/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
  ) {}

  async create(userDto: CreateUserDto): Promise<User> {
    const { email } = userDto;
    const user = await this.userRepository.findOne({ where: { email: email } });
    if (user) {
      throw new ConflictException('Email already in use');
    }
    const hashedPassword = await bcrypt.hash(userDto.password, 10);
    const newUser = this.userRepository.create({
      ...userDto,
      isActive: true,
      password: hashedPassword,
    });
    return await this.userRepository.save(newUser);
  }

  async getUsers(): Promise<CreateUserDto[]> {
    return this.userRepository.find();
  }

  async findById(id: number): Promise<CreateUserDto> {
    const user = await this.userRepository.findOne({ where: { id: id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findByEmail(email: string): Promise<CreateUserDto> {
    const user = await this.userRepository.findOne({ where: { email: email } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async deleteUser(id: string) {
    const user = await this.userRepository.findOne({
      where: { id: parseInt(id) },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    user.isActive = false;
    user.isDeleted = true;
    await this.userRepository.save(user);
  }

  async activateUser(email: string) {
    return this.userRepository.update(
      { email },
      {
        isActive: true,
      },
    );
  }

  async updateUser(id: string, userDto: CreateUserDto) {
    const update_user = await this.userRepository.findOne({
      where: { id: parseInt(id) },
    });
    if (!update_user) {
      throw new NotFoundException('User not found');
    }

    if ('password' in userDto) {
      const hashedPassword = await bcrypt.hash(userDto.password, 10);
      userDto = { ...userDto, password: hashedPassword };
    }

    await this.userRepository.update(id, userDto);
    return await this.userRepository.findOne({
      where: { id: parseInt(id) },
    });
  }

  async saveUsers(users: CreateUserDto[]): Promise<CreateUserDto[]> {
    const usersCollection = await Promise.all(
      users.map(async (user) => {
        const hashedPassword = await bcrypt.hash(user.password, 10);
        return { ...user, password: hashedPassword } as CreateUserDto;
      }),
    );

    await this.userRepository.upsert(usersCollection, ['email']);
    await this.userRepository.query(`
      DELETE FROM "users"
      WHERE "email" NOT IN (${users.map((u) => `'${u.email}'`).join(',')});
    `);

    return await this.userRepository.find();
  }
}
