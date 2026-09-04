import { JwtStrategy } from './jwt.strategy';

process.env.JWT_SECRET = 'test-secret';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  beforeEach(() => {
    strategy = new JwtStrategy();
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  it('should return the JWT payload from validate', async () => {
    const payload = {
      sub: 'user-1',
      email: 'clement@example.com',
      role: 'CUSTOMER',
    };

    const result = await strategy.validate(payload);

    expect(result).toEqual(payload);
  });
});
