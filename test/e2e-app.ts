import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

export interface E2EUsers {
  senderEmail: string;
  receiverEmail: string;
  password: string;
}

export async function createE2EApp(): Promise<{
  app: INestApplication;
  users: E2EUsers;
}> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  await app.init();

  const prisma = app.get(PrismaService);

  const password = 'Password123';

  const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const senderEmail = `e2e-sender-${uniqueId}@example.com`;

  const receiverEmail = `e2e-receiver-${uniqueId}@example.com`;

  const uniqueNumber = Date.now().toString().slice(-8);

  const senderPhone = `080${uniqueNumber}`;
  const receiverPhone = `081${uniqueNumber}`;

  await request(app.getHttpServer())
    .post('/auth/register')
    .send({
      firstName: 'E2E',
      lastName: 'Sender',
      email: senderEmail,
      phoneNumber: senderPhone.slice(0, 11),
      password,
    })
    .expect(201);

  await request(app.getHttpServer())
    .post('/auth/register')
    .send({
      firstName: 'E2E',
      lastName: 'Receiver',
      email: receiverEmail,
      phoneNumber: receiverPhone.slice(0, 11),
      password,
    })
    .expect(201);

  await prisma.user.update({
    where: {
      email: senderEmail,
    },
    data: {
      role: 'ADMIN',
    },
  });

  const senderLogin = await request(app.getHttpServer())
    .post('/auth/login')
    .send({
      email: senderEmail,
      password,
    })
    .expect(200);

  const senderToken = senderLogin.body.accessToken;

  await request(app.getHttpServer())
    .post('/transactions/deposit')
    .set('Authorization', `Bearer ${senderToken}`)
    .send({
      amount: 10000,
      description: 'E2E test funding',
    })
    .expect(201);

  return {
    app,
    users: {
      senderEmail,
      receiverEmail,
      password,
    },
  };
}
