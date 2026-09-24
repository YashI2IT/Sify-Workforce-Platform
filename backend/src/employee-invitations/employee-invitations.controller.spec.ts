import { Test, TestingModule } from '@nestjs/testing';
import { EmployeeInvitationsController } from './employee-invitations.controller.js';
import { EmployeeInvitationsService } from './employee-invitations.service.js';

describe('EmployeeInvitationsController', () => {
  let controller: EmployeeInvitationsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmployeeInvitationsController],
      providers: [
        {
          provide: EmployeeInvitationsService,
          useValue: {}
        }
      ]
    }).compile();

    controller = module.get<EmployeeInvitationsController>(EmployeeInvitationsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
