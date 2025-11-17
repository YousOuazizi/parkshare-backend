import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../src/modules/users/entities/user.entity';
import { Repository } from 'typeorm';

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
          email: `test${Date.now()}@example.com`,
          password: 'StrongPassword123!',
          firstName: 'Test',
          lastName: 'User',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('email');
          expect(res.body).not.toHaveProperty('password');
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
      const email = `duplicate${Date.now()}@example.com`;

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

    it('should respect rate limiting (5 requests per minute)', async () => {
      const requests = [];

      // Make 6 requests rapidly
      for (let i = 0; i < 6; i++) {
        requests.push(
          request(app.getHttpServer())
            .post('/api/auth/register')
            .send({
              email: `ratelimit${i}@example.com`,
              password: 'Password123!',
              firstName: 'Test',
              lastName: 'User',
            }),
        );
      }

      const responses = await Promise.all(requests);

      // Last request should be rate limited
      const rateLimitedResponse = responses.find((res) => res.status === 429);
      expect(rateLimitedResponse).toBeDefined();
    }, 10000);
  });

  describe('/api/auth/login (POST)', () => {
    const testUser = {
      email: `logintest${Date.now()}@example.com`,
      password: 'LoginPassword123!',
    };

    beforeAll(async () => {
      // Create a test user
      await request(app.getHttpServer()).post('/api/auth/register').send({
        email: testUser.email,
        password: testUser.password,
        firstName: 'Login',
        lastName: 'Test',
      });
    });

    it('should login with correct credentials', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
          expect(res.body).toHaveProperty('user');
        });
    });

    it('should return 401 for incorrect password', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: testUser.email,
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
    let accessToken: string;

    beforeAll(async () => {
      // Register and login
      const registerRes = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: `profile${Date.now()}@example.com`,
          password: 'ProfilePassword123!',
          firstName: 'Profile',
          lastName: 'Test',
        });

      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: registerRes.body.email,
          password: 'ProfilePassword123!',
        });

      accessToken = loginRes.body.accessToken;
    });

    it('should return user profile with valid token', () => {
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
    let accessToken: string;

    beforeEach(async () => {
      const registerRes = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: `logout${Date.now()}@example.com`,
          password: 'LogoutPassword123!',
          firstName: 'Logout',
          lastName: 'Test',
        });

      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: registerRes.body.email,
          password: 'LogoutPassword123!',
        });

      accessToken = loginRes.body.accessToken;
    });

    it('should logout successfully with valid token', () => {
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
