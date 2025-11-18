import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../src/modules/users/entities/user.entity';
import { Repository } from 'typeorm';

// Helper to generate unique email
const uniqueEmail = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let userRepository: Repository<User>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Appliquer les mêmes configurations que dans main.ts
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );

    app.setGlobalPrefix('api');

    await app.init();

    userRepository = moduleFixture.get<Repository<User>>(
      getRepositoryToken(User),
    );
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/api/auth/register (POST)', () => {
    it('should register a new user with valid data', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: uniqueEmail('test'),
          password: 'StrongPassword123!',
          firstName: 'Test',
          lastName: 'User',
        })
        .expect((res) => {
          if (res.status !== 201) {
            console.error('Registration failed:', res.status, res.body);
          }
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('user');
          expect(res.body.user).toHaveProperty('id');
          expect(res.body.user).toHaveProperty('email');
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
          expect(res.body).toHaveProperty('verification');
        });
    });

    it('should return 400 for invalid email', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: 'Password123!',
          firstName: 'Test',
          lastName: 'User',
        })
        .expect(400);
    });

    it('should return 400 for weak password', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: '123',
          firstName: 'Test',
          lastName: 'User',
        })
        .expect(400);
    });

    it('should return 409 for duplicate email', async () => {
      const email = uniqueEmail('duplicate');

      // First registration
      await request(app.getHttpServer()).post('/api/auth/register').send({
        email,
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
      });

      // Second registration with same email
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email,
          password: 'Password123!',
          firstName: 'Test',
          lastName: 'User',
        })
        .expect(409);
    });
  });

  describe('/api/auth/login (POST)', () => {
    it('should login with correct credentials', async () => {
      const email = uniqueEmail('logintest');
      const password = 'LoginPassword123!';

      // Create a test user
      const registerRes = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email,
          password,
          firstName: 'Login',
          lastName: 'Test',
        })
        .expect(201);

      // Verify registration succeeded
      expect(registerRes.body.user).toHaveProperty('email', email);

      // Login with the created user
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email,
          password,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
          expect(res.body).toHaveProperty('user');
        });
    });

    it('should return 401 for incorrect password', async () => {
      const email = uniqueEmail('wrongpwd');

      // Create user first
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email,
          password: 'CorrectPassword123!',
          firstName: 'Test',
          lastName: 'User',
        })
        .expect(201);

      // Try to login with wrong password
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email,
          password: 'WrongPassword123!',
        })
        .expect(401);
    });

    it('should return 401 for non-existent user', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Password123!',
        })
        .expect(401);
    });
  });

  describe('/api/auth/profile (GET)', () => {
    it('should return user profile with valid token', async () => {
      // Register and get token
      const registerRes = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: uniqueEmail('profile'),
          password: 'ProfilePassword123!',
          firstName: 'Profile',
          lastName: 'Test',
        })
        .expect(201);

      const accessToken = registerRes.body.accessToken;
      expect(accessToken).toBeDefined();

      // Get profile with token
      return request(app.getHttpServer())
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('email');
          expect(res.body).not.toHaveProperty('password');
        });
    });

    it('should return 401 without token', () => {
      return request(app.getHttpServer()).get('/api/auth/profile').expect(401);
    });

    it('should return 401 with invalid token', () => {
      return request(app.getHttpServer())
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('/api/auth/logout (POST)', () => {
    it('should logout successfully with valid token', async () => {
      const registerRes = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: uniqueEmail('logout'),
          password: 'LogoutPassword123!',
          firstName: 'Logout',
          lastName: 'Test',
        })
        .expect(201);

      const accessToken = registerRes.body.accessToken;
      expect(accessToken).toBeDefined();

      return request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);
    });

    it('should return 401 without token', () => {
      return request(app.getHttpServer()).post('/api/auth/logout').expect(401);
    });
  });
});
