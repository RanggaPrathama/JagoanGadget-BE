import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';

describe('AppController', () => {
  let controller: AppController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const values: Record<string, string> = {
                'app.name': 'NestJS API',
                'app.environment': 'test',
              };
              return values[key] ?? null;
            }),
          },
        },
      ],
    }).compile();

    controller = module.get(AppController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getHome', () => {
    it('should return page title and app name', () => {
      const result = controller.getHome();
      expect(result).toEqual({
        pageTitle: 'Home',
        appName: 'NestJS API',
        year: expect.any(Number),
        nestVersion: '11',
        NODE_ENV: 'test',
      });
    });
  });
});
