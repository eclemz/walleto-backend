import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  const createContext = (user: any) =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({
          user,
        }),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as Reflector;

    guard = new RolesGuard(reflector);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should allow an admin user to access an admin route', () => {
    reflector.getAllAndOverride = jest.fn().mockReturnValue(['ADMIN']);

    const context = createContext({
      id: 'admin-1',
      email: 'admin@example.com',
      role: 'ADMIN',
    });

    const result = guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('should reject a customer from an admin route', () => {
    reflector.getAllAndOverride = jest.fn().mockReturnValue(['ADMIN']);

    const context = createContext({
      id: 'customer-1',
      email: 'customer@example.com',
      role: 'CUSTOMER',
    });

    const result = guard.canActivate(context);

    expect(result).toBe(false);
  });
});
