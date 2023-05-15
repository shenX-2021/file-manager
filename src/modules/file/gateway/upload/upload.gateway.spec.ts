import { Test, TestingModule } from '@nestjs/testing';
import { UploadGateway } from './upload.gateway';

describe('UploadGateway', () => {
  let gateway: UploadGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UploadGateway],
    }).compile();

    gateway = module.get<UploadGateway>(UploadGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});
