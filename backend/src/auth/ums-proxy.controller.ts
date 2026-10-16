import { All, Controller, Req, Res, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';

@Controller('user')
export class UmsProxyController {
  private readonly logger = new Logger('UmsProxy');
  private readonly umsBase = (process.env.UMS_BASE_URL || 'https://apidev.sifymodernization.digital/user-mgt/api').replace(/\/$/, '');
  private readonly appId = process.env.UMS_APP_ID || 'Project-Management';

  @All('*')
  async handleProxy(@Req() req: Request, @Res() res: Response) {
    return this.forward(req, res);
  }

  @All()
  async handleRoot(@Req() req: Request, @Res() res: Response) {
    return this.forward(req, res);
  }

  private async forward(req: Request, res: Response) {
    try {
      const userIndex = req.originalUrl.indexOf('/user');
      const subpath = userIndex !== -1 ? req.originalUrl.substring(userIndex) : '/user';
      const targetUrl = `${this.umsBase}${subpath}`;

      const headers: Record<string, string> = {
        'x-app-id': this.appId,
      };

      if (req.headers['content-type']) {
        headers['Content-Type'] = req.headers['content-type'] as string;
      } else if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
        headers['Content-Type'] = 'application/json';
      }

      if (req.headers['authorization']) {
        headers['Authorization'] = req.headers['authorization'] as string;
      }

      const hasBody = ['POST', 'PUT', 'PATCH'].includes(req.method) && req.body && Object.keys(req.body).length > 0;

      const umsResponse = await fetch(targetUrl, {
        method: req.method,
        headers,
        body: hasBody ? JSON.stringify(req.body) : undefined,
      });

      const responseText = await umsResponse.text();
      let responseData: any = null;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = responseText;
      }

      const contentType = umsResponse.headers.get('content-type') || 'application/json';
      res.setHeader('Content-Type', contentType);
      res.status(umsResponse.status);

      if (typeof responseData === 'object' && responseData !== null) {
        return res.json(responseData);
      }
      return res.send(responseData);
    } catch (err: any) {
      this.logger.error(`UMS proxy error: ${err.message}`);
      return res.status(502).json({
        statusCode: 502,
        message: 'Failed to communicate with authentication service',
        error: err.message,
      });
    }
  }
}
