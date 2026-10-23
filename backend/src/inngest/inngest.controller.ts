import { All, Controller, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { serve } from 'inngest/express';
import { inngest } from './inngest.client.js';
import { createRecurringTasksFunction } from './recurring-tasks.function.js';
import { RecurrenceGeneratorService } from '../tasks/recurrence/recurrence-generator.service.js';

@Controller('inngest')
export class InngestController {
  private readonly handler: (req: Request, res: Response) => Promise<any>;

  constructor(private readonly generatorService: RecurrenceGeneratorService) {
    const recurringTasksFunction = createRecurringTasksFunction(this.generatorService);
    this.handler = serve({
      client: inngest,
      functions: [recurringTasksFunction],
      servePath: '/api/v1/inngest',
    }) as unknown as (req: Request, res: Response) => Promise<any>;
  }

  @All()
  async handle(@Req() req: Request, @Res() res: Response) {
    return this.handler(req, res);
  }
}
