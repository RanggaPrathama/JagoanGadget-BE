import { Controller, Get, Render } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';

@ApiTags('App')
@Controller()
export class AppController {
  constructor(private readonly configService: ConfigService) {}

  @AllowAnonymous()
  @Get('/')
  @Render('index')
  @ApiExcludeEndpoint()
  getHome() {
    return {
      pageTitle: 'Home',
      appName: this.configService.get<string>('app.name'),
      year: new Date().getFullYear(),
      nestVersion: '11',
      NODE_ENV: this.configService.get<string>('app.environment'),
    };
  }
}
