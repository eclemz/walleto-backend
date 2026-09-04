import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createE2EApp, E2EUsers } from './e2e-app';

describe('Wallet (e2e)', () => {
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

  it('should retrieve the authenticated user wallet', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: users.senderEmail,
        password: users.password,
      })
      .expect(200);

    const token = loginResponse.body.accessToken;

    const response = await request(app.getHttpServer())
      .get('/wallet')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('walletNumber');
    expect(response.body).toHaveProperty('balance');
    expect(response.body).toHaveProperty('userId');
  });
});

describe('Wallet (e2e)', () => {
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

  it('should retrieve the authenticated user wallet', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: users.senderEmail,
        password: users.password,
      })
      .expect(200);

    const token = loginResponse.body.accessToken;

    const response = await request(app.getHttpServer())
      .get('/wallet')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('walletNumber');
    expect(response.body).toHaveProperty('balance');
    expect(response.body).toHaveProperty('userId');
  });
});
