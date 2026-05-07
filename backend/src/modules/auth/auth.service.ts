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

  private async generateTokens(userId: string, email: string, tokenVersion: number) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { sub: userId, email },
        { secret: process.env.JWT_SECRET, expiresIn: '15m' }
      ),
      this.jwtService.signAsync(
        { sub: userId, email, tokenVersion },
        { secret: process.env.JWT_REFRESH_SECRET, expiresIn: '7d' }
      )
    ]);

    return { accessToken, refreshToken }
  }

  async refresh(userId: string, email: string, tokenVersion: number) {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      select: ['id', 'tokenVersion'],
    });
    if (!user) throw new UnauthorizedException('Token de atualização inválido');
    if (user.tokenVersion !== tokenVersion) {
      throw new UnauthorizedException('Token de atualização foi revogado');
    }
    const newVersion = tokenVersion + 1;
    await this.usersRepository.update({ id: userId }, { tokenVersion: newVersion });
    return this.generateTokens(userId, email, newVersion);
  }

  async register(dto: RegisterDto) {
    const user = await this.usersRepository.findOneBy({ email: dto.email });

    if (user) {
      throw new ConflictException('Este email já está em uso');
    }

    const hash = await bcrypt.hash(dto.password, 10);

    const newUser = await this.usersRepository.save({
      name: dto.name,
      email: dto.email,
      password: hash,
      tokenVersion: 0,
    });

    return this.generateTokens(newUser.id, newUser.email, newUser.tokenVersion)
  }

  async login(dto: LoginDto) {
    const user = await this.usersRepository.findOneBy({ email: dto.email });

    if (!user) {
      throw new UnauthorizedException('Email ou senha incorretos');
    }

    const correctPassword = await bcrypt.compare(dto.password, user.password);

    if (!correctPassword) {
      throw new UnauthorizedException('Email ou senha incorretos');
    }

    return this.generateTokens(user.id, user.email, user.tokenVersion);
  }
}
