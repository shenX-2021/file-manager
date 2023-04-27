import { Test, TestingModule } from '@nestjs/testing';
import { FileRecordController } from './file-record.controller';

describe('FileRecordController', () => {
  let controller: FileRecordController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FileRecordController],
    }).compile();

    controller = module.get<FileRecordController>(FileRecordController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
