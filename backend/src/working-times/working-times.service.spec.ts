import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import { Test, TestingModule } from '@nestjs/testing';
import { WorkingTimesService } from './working-times.service.js';

describe('WorkingTimesService', () => {
  let service: WorkingTimesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WorkingTimesService, { provide: AuditLogsService, useValue: { logEvent: vi.fn(), getOrganizationLogs: vi.fn() } }],
    }).compile();

    service = module.get<WorkingTimesService>(WorkingTimesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
