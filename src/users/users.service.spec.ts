import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;

  const prismaMock = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should reject login when user does not exist', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    await expect(
      service.authenticate('unknown@example.com', 'Password123'),
    ).rejects.toThrow(new UnauthorizedException('Invalid email or password'));
  });

  it('should reject login when password is incorrect', async () => {
    const hashedPassword = await bcrypt.hash('Password123', 10);

    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user-1',
      firstName: 'Clement',
      lastName: 'Eneh',
      email: 'clement@example.com',
      password: hashedPassword,
      phoneNumber: '08031234567',
      role: 'CUSTOMER',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      service.authenticate('clement@example.com', 'WrongPassword'),
    ).rejects.toThrow('Invalid email or password');
  });

  it('should authenticate a user with valid credentials', async () => {
    const hashedPassword = await bcrypt.hash('Password123', 10);

    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user-1',
      firstName: 'Clement',
      lastName: 'Eneh',
      email: 'clement@example.com',
      password: hashedPassword,
      phoneNumber: '08031234567',
      role: 'CUSTOMER',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.authenticate(
      'clement@example.com',
      'Password123',
    );

    expect(result).toEqual({
      id: 'user-1',
      firstName: 'Clement',
      lastName: 'Eneh',
      email: 'clement@example.com',
      phoneNumber: '08031234567',
      role: 'CUSTOMER',
      createdAt: expect.any(Date),
      updatedAt: expect.any(Date),
    });

    expect(result).not.toHaveProperty('password');
  });
});
