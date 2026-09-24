import 'reflect-metadata';
import { TimesheetsController } from './timesheets.controller.js';
import { describe, it, expect } from 'vitest';

describe('TimesheetsController - Role Metadata (RBAC)', () => {
  it('18. MANAGER can approve authorized managed-team timesheet', () => {
    const roles = Reflect.getMetadata('roles', TimesheetsController.prototype.approve);
    expect(roles).toContain('MANAGER');
    expect(roles).toContain('ADMIN');
  });

  it('20. EMPLOYEE cannot approve timesheet', () => {
    const roles = Reflect.getMetadata('roles', TimesheetsController.prototype.approve);
    expect(roles).not.toContain('EMPLOYEE');
  });

  it('19. MANAGER can reject authorized managed-team timesheet', () => {
    const roles = Reflect.getMetadata('roles', TimesheetsController.prototype.reject);
    expect(roles).toContain('MANAGER');
    expect(roles).toContain('ADMIN');
  });

  it('21. EMPLOYEE cannot reject timesheet', () => {
    const roles = Reflect.getMetadata('roles', TimesheetsController.prototype.reject);
    expect(roles).not.toContain('EMPLOYEE');
  });
});
