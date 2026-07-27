import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { join } from 'path';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as fs from 'fs';
import * as path from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.setGlobalPrefix('api/v1');

  app.use(helmet());
  app.use(cookieParser());

  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads',
  });

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const isLocalhostSubdomain = /^https?:\/\/[a-zA-Z0-9-]+\.localhost:3000$/.test(origin);
      const isVercelDomain = /\.vercel\.app$/.test(origin);
      if (origin === frontendUrl || origin === 'http://localhost:3000' || isLocalhostSubdomain || isVercelDomain) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Configure Swagger OpenAPI spec
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Sina Learn API')
    .setDescription('Sina Learn LMS Platform API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  // Write openapi.json to the workspace root for the frontend schema generator
  fs.writeFileSync(
    path.join(process.cwd(), '../openapi.json'),
    JSON.stringify(document, null, 2),
  );

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`Sina Learn API running on port ${port}`);
}

bootstrap();
