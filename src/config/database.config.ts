import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

export const getDatabaseConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => {
  const environment = configService.get<string>('environment', 'production');
  return {
    type: 'postgres',
    url: configService.get<string>('database.url'),
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    synchronize: ['development', 'test'].includes(environment),
    dropSchema: environment === 'test',
    logging: environment === 'development',
    migrations: [__dirname + '/../database/migrations/**/*{.ts,.js}'],
    // installExtensions: false, // Désactiver PostGIS temporairement
  };
};
