import { Test, TestingModule } from '@nestjs/testing';
import { AuthorizationClientService } from './authorization-client.service';

describe('AuthorizationClientService', () => {
  let service: AuthorizationClientService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthorizationClientService],
    }).compile();

    service = module.get<AuthorizationClientService>(AuthorizationClientService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
