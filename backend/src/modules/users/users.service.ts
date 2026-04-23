import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { User } from "./entities/user.entity";
import { Repository } from "typeorm";
import { UpdateUserDto } from "./dto/update-user.dto";

@Injectable()
export class UsersService {
  constructor (
    @InjectRepository(User)
    private usersRepository: Repository<User>
  ) {}

  async findById(id: string) {
    const user = await this.usersRepository.findOneBy({ id: id });

    if (!user) {
      throw new NotFoundException('User ID not found.'); 
    }

    return user;
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.findById(id);

    return this.usersRepository.update({ id: id }, dto);
  }

  async search(query: string) {
    return this.usersRepository
      .createQueryBuilder('user')
      .where('user.name ILIKE :query OR user.email ILIKE :query', { query: `%${query}%` })
      .getMany();
  }
}