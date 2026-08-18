import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { PrometheusController } from '@willsoto/nestjs-prometheus';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';

@Controller()
@AllowAnonymous()
export class PublicMetricsController extends PrometheusController {
  @Get()
  index(@Res({ passthrough: true }) response: Response) {
    return super.index(response);
  }
}
