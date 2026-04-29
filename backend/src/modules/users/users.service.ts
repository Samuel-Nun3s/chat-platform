import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { User } from "./entities/user.entity";
import { Repository } from "typeorm";
import { UpdateUserDto } from "./dto/update-user.dto";

const USER_SELECT: (keyof User)[] = ['id', 'name', 'email', 'avatarUrl', 'createdAt'];

@Injectable()
export class UsersService {
  constructor (
    @InjectRepository(User)
    private usersRepository: Repository<User>
  ) {}

  async findById(id: string) {
    const user = await this.usersRepository.findOne({
      where: { id },
      select: USER_SELECT
    });

    if (!user) {
      throw new NotFoundException('User ID not found.');
    }

    return user;
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.findById(id);
    return this.usersRepository.update({ id }, dto);
  }

  async search(query: string) {
    return this.usersRepository
      .createQueryBuilder('user')
      .select(USER_SELECT.map(f => `user.${f}`))
      .where('user.name ILIKE :query OR user.email ILIKE :query', { query: `%${query}%` })
      .getMany();
  }
}