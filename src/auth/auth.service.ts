import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { WalletsService } from '../wallets/wallets.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly walletsService: WalletsService,
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}
  async register(registerDto: RegisterDto) {
    return this.prisma.$transaction(async (tx) => {
      const user = await this.usersService.create(registerDto, tx);

      const wallet = await this.walletsService.create(user.id, tx);

      return {
        user,
        wallet,
      };
    });
  }

  async login(loginDto: LoginDto) {
    const user = await this.usersService.authenticate(
      loginDto.email,
      loginDto.password,
    );

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
    };
  }
}
