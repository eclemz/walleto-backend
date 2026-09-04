import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { WalletsService } from '../wallets/wallets.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  const usersServiceMock = {
    authenticate: jest.fn(),
    create: jest.fn(),
  };

  const walletsServiceMock = {
    create: jest.fn(),
  };

  const prismaMock = {
    $transaction: jest.fn(),
  };

  const jwtServiceMock = {
    signAsync: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,

        {
          provide: UsersService,
          useValue: usersServiceMock,
        },

        {
          provide: WalletsService,
          useValue: walletsServiceMock,
        },

        {
          provide: PrismaService,
          useValue: prismaMock,
        },

        {
          provide: JwtService,
          useValue: jwtServiceMock,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should login and return an access token', async () => {
    usersServiceMock.authenticate.mockResolvedValue({
      id: 'user-1',
      email: 'clement@example.com',
      role: 'CUSTOMER',
      firstName: 'Clement',
      lastName: 'Eneh',
    });

    jwtServiceMock.signAsync.mockResolvedValue('fake-jwt-token');

    const result = await service.login({
      email: 'clement@example.com',
      password: 'Password123',
    });

    expect(usersServiceMock.authenticate).toHaveBeenCalledWith(
      'clement@example.com',
      'Password123',
    );

    expect(jwtServiceMock.signAsync).toHaveBeenCalledWith({
      sub: 'user-1',
      email: 'clement@example.com',
      role: 'CUSTOMER',
    });

    expect(result).toEqual({
      accessToken: 'fake-jwt-token',
    });
  });
});
