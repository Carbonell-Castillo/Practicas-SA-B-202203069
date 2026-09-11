import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { Role } from './dto/validate.dto';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('health', () => {
    it('should report the service as healthy', () => {
      expect(appController.health()).toEqual({
        status: 'ok',
        service: 'authorization-service',
      });
    });
  });

  describe('validate', () => {
    it('should allow an admin on any route', () => {
      expect(appController.validate({ role: Role.ADMIN, route: 'ruta1' })).toEqual({
        allowed: true,
      });
    });

    it('should reject a client outside ruta2', () => {
      expect(appController.validate({ role: Role.CLIENT, route: 'ruta1' })).toEqual({
        allowed: false,
      });
    });
  });
});
