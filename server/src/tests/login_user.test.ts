
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginUserInput } from '../schema';
import { loginUser } from '../handlers/login_user';

// Test data
const testUserData = {
  email: 'test@example.com',
  password: 'password123',
  name: 'Test User'
};

const testLoginInput: LoginUserInput = {
  email: 'test@example.com',
  password: 'password123'
};

// Helper function to decode JWT payload
const decodeJWTPayload = (token: string) => {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format');
  }
  
  const payload = parts[1];
  const decoded = atob(payload);
  return JSON.parse(decoded);
};

describe('loginUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should login user with valid credentials', async () => {
    // Create test user with hashed password
    const passwordHash = await Bun.password.hash(testUserData.password);
    await db.insert(usersTable)
      .values({
        email: testUserData.email,
        password_hash: passwordHash,
        name: testUserData.name
      })
      .execute();

    const result = await loginUser(testLoginInput);

    // Verify user data
    expect(result.user.email).toEqual(testUserData.email);
    expect(result.user.name).toEqual(testUserData.name);
    expect(result.user.id).toBeDefined();
    expect(result.user.created_at).toBeInstanceOf(Date);

    // Verify token exists
    expect(result.token).toBeDefined();
    expect(typeof result.token).toBe('string');
    expect(result.token.length).toBeGreaterThan(0);

    // Verify password hash is not returned
    expect((result.user as any).password_hash).toBeUndefined();
  });

  it('should throw error for non-existent email', async () => {
    const invalidInput: LoginUserInput = {
      email: 'nonexistent@example.com',
      password: 'password123'
    };

    await expect(loginUser(invalidInput)).rejects.toThrow(/invalid email or password/i);
  });

  it('should throw error for incorrect password', async () => {
    // Create test user
    const passwordHash = await Bun.password.hash(testUserData.password);
    await db.insert(usersTable)
      .values({
        email: testUserData.email,
        password_hash: passwordHash,
        name: testUserData.name
      })
      .execute();

    const invalidInput: LoginUserInput = {
      email: testUserData.email,
      password: 'wrongpassword'
    };

    await expect(loginUser(invalidInput)).rejects.toThrow(/invalid email or password/i);
  });

  it('should verify JWT token contains correct user data', async () => {
    // Create test user
    const passwordHash = await Bun.password.hash(testUserData.password);
    const users = await db.insert(usersTable)
      .values({
        email: testUserData.email,
        password_hash: passwordHash,
        name: testUserData.name
      })
      .returning()
      .execute();

    const result = await loginUser(testLoginInput);

    // Verify JWT token can be decoded and contains correct data
    const payload = decodeJWTPayload(result.token);

    expect(payload.sub).toEqual(users[0].id.toString());
    expect(payload.email).toEqual(testUserData.email);
    expect(payload.name).toEqual(testUserData.name);
    expect(payload.exp).toBeDefined();
    expect(payload.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it('should generate valid JWT format', async () => {
    // Create test user
    const passwordHash = await Bun.password.hash(testUserData.password);
    await db.insert(usersTable)
      .values({
        email: testUserData.email,
        password_hash: passwordHash,
        name: testUserData.name
      })
      .execute();

    const result = await loginUser(testLoginInput);

    // Verify JWT has correct format (3 parts separated by dots)
    const parts = result.token.split('.');
    expect(parts).toHaveLength(3);

    // Verify header
    const header = JSON.parse(atob(parts[0]));
    expect(header.alg).toEqual('HS256');
    expect(header.typ).toEqual('JWT');

    // Verify payload structure
    const payload = JSON.parse(atob(parts[1]));
    expect(payload.sub).toBeDefined();
    expect(payload.email).toBeDefined();
    expect(payload.name).toBeDefined();
    expect(payload.exp).toBeDefined();
  });
});
