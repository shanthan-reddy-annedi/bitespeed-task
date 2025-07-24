import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContactModule } from './contact/contact.module';
import { getDatabaseConfig } from './config/database.config';

@Module({
  imports: [TypeOrmModule.forRoot(getDatabaseConfig()), ContactModule],
})
export class AppModule {}
