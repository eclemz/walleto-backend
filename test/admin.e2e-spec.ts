import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createE2EApp, E2EUsers } from './e2e-app';

describe('Admin (e2e)', () => {
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

  it('should reject a customer from admin routes', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: users.receiverEmail,
        password: users.password,
      })
      .expect(200);

    const token = loginResponse.body.accessToken;

    await request(app.getHttpServer())
      .get('/admin/test')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  it('should allow an admin to access admin routes', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: users.senderEmail,
        password: users.password,
      })
      .expect(200);

    const token = loginResponse.body.accessToken;

    await request(app.getHttpServer())
      .get('/admin/test')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });
});
