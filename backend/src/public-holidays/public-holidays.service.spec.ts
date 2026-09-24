import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import { Test, TestingModule } from '@nestjs/testing';
import { PublicHolidaysService } from './public-holidays.service.js';

describe('PublicHolidaysService', () => {
  let service: PublicHolidaysService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PublicHolidaysService, { provide: AuditLogsService, useValue: { logEvent: vi.fn(), getOrganizationLogs: vi.fn() } }],
    }).compile();

    service = module.get<PublicHolidaysService>(PublicHolidaysService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
