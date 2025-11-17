import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

export const getDatabaseConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => {
  return {
    type: 'postgres',
    url: configService.get<string>('database.url'),
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    synchronize: configService.get<string>('environment') === 'development',
    logging: configService.get<string>('environment') === 'development',
    migrations: [__dirname + '/../database/migrations/**/*{.ts,.js}'],
    // installExtensions: false, // Désactiver PostGIS temporairement
  };
};
