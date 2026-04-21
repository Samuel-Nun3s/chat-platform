import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { RegisterDto } from "./dto/register.dto";
import { Repository } from "typeorm";
import { User } from "../users/entities/user.entity";
import * as bcrypt from "bcrypt";
import { JwtService } from "@nestjs/jwt";
import { LoginDto } from "./dto/login.dto";

@Injectable()
export class AuthService {
  constructor (
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private jwtService: JwtService
  ) {}

  private async generateTokens(userId: string, email: string) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { sub: userId, email },
        { secret: process.env.JWT_SECRET, expiresIn: '15m' }
      ),
      this.jwtService.signAsync(
        { sub: userId, email },
        { secret: process.env.JWT_REFRESH_SECRET, expiresIn: '7d' }
      )
    ]);

    return { accessToken, refreshToken }
  }

  async refresh(userId: string, email: string) {
    return this.generateTokens(userId, email);
  }

  async register(dto: RegisterDto) {
    const user = await this.usersRepository.findOneBy({ email: dto.email });

    if (user) {
      throw new ConflictException('Email already in use');
    }

    const hash = await bcrypt.hash(dto.password, 10);

    const newUser = await this.usersRepository.save({
      name: dto.name,
      email: dto.email,
      password: hash
    });

    return this.generateTokens(newUser.id, newUser.email)
  }

  async login(dto: LoginDto) {
    const user = await this.usersRepository.findOneBy({ email: dto.email });

    if (!user) {
      throw new UnauthorizedException('Incorrect email or password');
    }

    const correctPassword = await bcrypt.compare(dto.password, user.password);

    if (!correctPassword) {
      throw new UnauthorizedException('Incorrect email or password');
    }

    return this.generateTokens(user.id, user.email);

  }
}