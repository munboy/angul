import { Reflector } from '@nestjs/core';
import { ForbiddenException } from '@nestjs/common';
import { ExecutionContext } from '@nestjs/common';
import { RolesGuard } from './roles.guard';
import { ROLES_KEY } from '../decorators/roles.decorator';

const mockContext = (userRole: string | undefined, requiredRoles: string[]): ExecutionContext => {
  const mockReflector = {
    getAllAndOverride: jest.fn().mockReturnValue(requiredRoles),
  } as unknown as Reflector;

  const request = { user: userRole !== undefined ? { role: userRole } : undefined };

  return {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    _reflector: mockReflector, 
  } as unknown as ExecutionContext;
};

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Reflector>;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;

    guard = new RolesGuard(reflector);
  });

  const buildContext = (userRole: string | undefined, requiredRoles: string[]): ExecutionContext => {
    reflector.getAllAndOverride.mockReturnValue(requiredRoles);
    const request = { user: userRole !== undefined ? { role: userRole } : undefined };
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
  };

  it('allows access when route has no @Roles() decorator', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined as any);
    const ctx = buildContext('user', []);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('allows admin user on an admin-only route', () => {
    const ctx = buildContext('admin', ['admin']);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('denies regular user on an admin-only route', () => {
    const ctx = buildContext('user', ['admin']);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('throws ForbiddenException when request has no user at all', () => {
    const ctx = buildContext(undefined, ['admin']);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('allows access when user role matches one of multiple required roles', () => {
    const ctx = buildContext('admin', ['admin', 'superuser']);
    expect(guard.canActivate(ctx)).toBe(true);
  });
});
