export interface AuthenticatedContext {
  userId: string;
  employeeId: string;
  organizationId: string;
  roles: string[];
}
