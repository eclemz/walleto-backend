import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createE2EApp, E2EUsers } from './e2e-app';

describe('Transactions (e2e)', () => {
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

  it('should transfer money between two users', async () => {
    const senderLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: users.senderEmail,
        password: users.password,
      })
      .expect(200);

    const senderToken = senderLogin.body.accessToken;

    const receiverLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: users.receiverEmail,
        password: users.password,
      })
      .expect(200);

    const receiverToken = receiverLogin.body.accessToken;

    const senderWalletResponse = await request(app.getHttpServer())
      .get('/wallet')
      .set('Authorization', `Bearer ${senderToken}`)
      .expect(200);

    const receiverWalletResponse = await request(app.getHttpServer())
      .get('/wallet')
      .set('Authorization', `Bearer ${receiverToken}`)
      .expect(200);

    const senderWallet = senderWalletResponse.body;

    const receiverWallet = receiverWalletResponse.body;

    const senderBalance = Number(senderWallet.balance);

    const receiverBalance = Number(receiverWallet.balance);

    const transferAmount = 1000;

    const transferResponse = await request(app.getHttpServer())
      .post('/transactions/transfer')
      .set('Authorization', `Bearer ${senderToken}`)
      .send({
        receiverWalletNumber: receiverWallet.walletNumber,
        amount: transferAmount,
        description: 'E2E test transfer',
      })
      .expect(201);

    expect(transferResponse.body.transaction).toHaveProperty('id');

    expect(transferResponse.body.transaction.type).toBe('TRANSFER');

    expect(transferResponse.body.transaction.status).toBe('COMPLETED');

    const updatedSenderResponse = await request(app.getHttpServer())
      .get('/wallet')
      .set('Authorization', `Bearer ${senderToken}`)
      .expect(200);

    const updatedReceiverResponse = await request(app.getHttpServer())
      .get('/wallet')
      .set('Authorization', `Bearer ${receiverToken}`)
      .expect(200);

    const updatedSender = updatedSenderResponse.body;

    const updatedReceiver = updatedReceiverResponse.body;

    expect(Number(updatedSender.balance)).toBe(senderBalance - transferAmount);

    expect(Number(updatedReceiver.balance)).toBe(
      receiverBalance + transferAmount,
    );
  });

  it('should reject a transfer when balance is insufficient', async () => {
    // Login sender
    const senderLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: users.senderEmail,
        password: users.password,
      })
      .expect(200);

    const senderToken = senderLogin.body.accessToken;

    // Login receiver
    const receiverLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: users.receiverEmail,
        password: users.password,
      })
      .expect(200);

    const receiverToken = receiverLogin.body.accessToken;

    // Get sender wallet BEFORE transfer
    const senderWalletResponse = await request(app.getHttpServer())
      .get('/wallet')
      .set('Authorization', `Bearer ${senderToken}`)
      .expect(200);

    // Get receiver wallet BEFORE transfer
    const receiverWalletResponse = await request(app.getHttpServer())
      .get('/wallet')
      .set('Authorization', `Bearer ${receiverToken}`)
      .expect(200);

    const senderBalanceBefore = Number(senderWalletResponse.body.balance);

    const receiverBalanceBefore = Number(receiverWalletResponse.body.balance);

    const receiverWallet = receiverWalletResponse.body;

    // Attempt to transfer more money than sender has
    await request(app.getHttpServer())
      .post('/transactions/transfer')
      .set('Authorization', `Bearer ${senderToken}`)
      .send({
        receiverWalletNumber: receiverWallet.walletNumber,
        amount: 20000,
        description: 'Insufficient balance test',
      })
      .expect(400);

    // Get sender wallet AFTER failed transfer
    const updatedSenderResponse = await request(app.getHttpServer())
      .get('/wallet')
      .set('Authorization', `Bearer ${senderToken}`)
      .expect(200);

    // Get receiver wallet AFTER failed transfer
    const updatedReceiverResponse = await request(app.getHttpServer())
      .get('/wallet')
      .set('Authorization', `Bearer ${receiverToken}`)
      .expect(200);

    // Verify sender balance did NOT change
    expect(Number(updatedSenderResponse.body.balance)).toBe(
      senderBalanceBefore,
    );

    // Verify receiver balance did NOT change
    expect(Number(updatedReceiverResponse.body.balance)).toBe(
      receiverBalanceBefore,
    );
  });

  it('should reject a transfer to the same wallet', async () => {
    // Login
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: users.senderEmail,
        password: users.password,
      })
      .expect(200);

    const token = loginResponse.body.accessToken;

    // Get own wallet
    const walletResponse = await request(app.getHttpServer())
      .get('/wallet')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const wallet = walletResponse.body;

    // Attempt to send money to own wallet
    await request(app.getHttpServer())
      .post('/transactions/transfer')
      .set('Authorization', `Bearer ${token}`)
      .send({
        receiverWalletNumber: wallet.walletNumber,
        amount: 1000,
        description: 'Self transfer test',
      })
      .expect(400);
  });

  it('should reject a transfer to a nonexistent wallet', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: users.senderEmail,
        password: users.password,
      })
      .expect(200);

    const token = loginResponse.body.accessToken;

    await request(app.getHttpServer())
      .post('/transactions/transfer')
      .set('Authorization', `Bearer ${token}`)
      .send({
        receiverWalletNumber: '9999999999',
        amount: 1000,
        description: 'Invalid receiver test',
      })
      .expect(400);
  });

  it('should reject an unauthenticated transfer', async () => {
    await request(app.getHttpServer())
      .post('/transactions/transfer')
      .send({
        receiverWalletNumber: '9999999999',
        amount: 1000,
        description: 'Unauthenticated transfer test',
      })
      .expect(401);
  });
});
