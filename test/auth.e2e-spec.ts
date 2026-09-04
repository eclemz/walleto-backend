import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createE2EApp, E2EUsers } from './e2e-app';

describe('Authentication (e2e)', () => {
  let app: INestApplication;
  let users: E2EUsers;

  beforeAll(async () => {
    const result = await createE2EApp();

    app = result.app;
    users = result.users;
  });

  afterAll(async () => {
    await app.close();
  });

  it('should login successfully', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: users.senderEmail,
        password: users.password,
      })
      .expect(200);

    expect(response.body).toHaveProperty('accessToken');
  });

  it('should reject invalid login credentials', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: users.senderEmail,
        password: 'WrongPassword',
      })
      .expect(401);
  });
});
