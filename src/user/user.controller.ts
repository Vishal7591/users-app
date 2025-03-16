import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Param,
  Delete,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';

@Controller('/users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  //Get all users
  @Get()
  async getUsers(): Promise<CreateUserDto[]> {
    return await this.userService.getUsers();
  }

  //Get user by id
  @Get(':id')
  async findById(@Param('id') id: number): Promise<CreateUserDto> {
    return await this.userService.findById(id);
  }

  //Create user
  @Post()
  async create(@Body() user: CreateUserDto): Promise<CreateUserDto> {
    return await this.userService.create(user);
  }

  //Get user by id
  @Post('/manage')
  async saveUsers(@Body() users: CreateUserDto[]): Promise<CreateUserDto[]> {
    return await this.userService.saveUsers(users);
  }

  //Update user
  @Put(':id')
  async update(
    @Param('id') id: number,
    @Body() user: CreateUserDto,
  ): Promise<CreateUserDto | null> {
    return await this.userService.updateUser(id.toString(), user);
  }

  //Delete
  @Delete(':id')
  async delete(@Param('id') id: number): Promise<void> {
    return await this.userService.deleteUser(id.toString());
  }
}
