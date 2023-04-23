import { Module } from '@nestjs/common';
import { FileModule } from './modules/file/file.module';

@Module({
  imports: [FileModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
