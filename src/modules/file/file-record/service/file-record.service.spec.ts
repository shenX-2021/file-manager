import { Test, TestingModule } from '@nestjs/testing';
import { FileRecordService } from './file-record.service';

describe('FileRecordService', () => {
  let service: FileRecordService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FileRecordService],
    }).compile();

    service = module.get<FileRecordService>(FileRecordService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
