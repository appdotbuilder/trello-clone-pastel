
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type RegisterUserInput } from '../schema';
import { registerUser } from '../handlers/register_user';
import { eq } from 'drizzle-orm';

// Simple JWT verification function for testing
const verifyJWT = async (token: string, secret: string): Promise<any> => {
  const [headerB64, payloadB64, signatureB64] = token.split('.');
  
  const data = `${headerB64}.${payloadB64}`;
  const expectedSignature = await crypto.subtle.sign(
    'HMAC',
    await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    ),
    new TextEncoder().encode(data)
  );
  
  const expectedSignatureB64 = btoa(String.fromCharCode(...new Uint8Array(expectedSignature)));
  
  if (signatureB64 !== expectedSignatureB64) {
    throw new Error('Invalid JWT signature');
  }
  
  return JSON.parse(atob(payloadB64));
};

// Test input data
const testInput: RegisterUserInput = {
  email: 'test@example.com',
  password: 'password123',
  name: 'Test User'
};

describe('registerUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should register a new user successfully', async () => {
    const result = await registerUser(testInput);

    // Validate returned user data
    expect(result.user.email).toEqual('test@example.com');
    expect(result.user.name).toEqual('Test User');
    expect(result.user.id).toBeDefined();
    expect(result.user.created_at).toBeInstanceOf(Date);
    expect(result.token).toBeDefined();
    expect(typeof result.token).toBe('string');
    expect(result.token.length).toBeGreaterThan(0);
  });

  it('should save user to database with hashed password', async () => {
    const result = await registerUser(testInput);

    // Query database to verify user was created
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.user.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].email).toEqual('test@example.com');
    expect(users[0].name).toEqual('Test User');
    expect(users[0].password_hash).toBeDefined();
    expect(users[0].password_hash).not.toEqual('password123'); // Password should be hashed
    expect(users[0].password_hash.length).toBeGreaterThan(10); // Hashed password should be longer
    expect(users[0].created_at).toBeInstanceOf(Date);
  });

  it('should verify password hash is valid', async () => {
    const result = await registerUser(testInput);

    // Get the stored user
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.user.id))
      .execute();

    const storedUser = users[0];

    // Verify password hash using Bun's built-in password verification
    const isValid = await Bun.password.verify('password123', storedUser.password_hash);
    expect(isValid).toBe(true);

    // Verify wrong password fails
    const isInvalid = await Bun.password.verify('wrongpassword', storedUser.password_hash);
    expect(isInvalid).toBe(false);
  });

  it('should generate valid JWT token', async () => {
    const result = await registerUser(testInput);

    // Verify JWT token can be decoded
    const payload = await verifyJWT(
      result.token, 
      process.env['JWT_SECRET'] || 'fallback-secret-key'
    );

    expect(payload).toBeDefined();
    expect(payload.user_id).toEqual(result.user.id);
    expect(payload.email).toEqual(result.user.email);
    expect(payload.exp).toBeDefined();
    expect(payload.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it('should reject duplicate email registration', async () => {
    // Register first user
    await registerUser(testInput);

    // Attempt to register second user with same email
    const duplicateInput: RegisterUserInput = {
      email: 'test@example.com', // Same email
      password: 'differentpassword',
      name: 'Different User'
    };

    await expect(registerUser(duplicateInput)).rejects.toThrow(/already exists/i);
  });

  it('should handle different valid email formats', async () => {
    const emailFormats = [
      'user@domain.com',
      'user.name@domain.co.uk',
      'user+tag@domain.org',
      'user123@sub.domain.com'
    ];

    for (let i = 0; i < emailFormats.length; i++) {
      const input: RegisterUserInput = {
        email: emailFormats[i],
        password: 'password123',
        name: `User ${i}`
      };

      const result = await registerUser(input);
      expect(result.user.email).toEqual(emailFormats[i]);
      expect(result.user.name).toEqual(`User ${i}`);
      expect(result.token).toBeDefined();
    }
  });

  it('should handle minimum length password', async () => {
    const inputWithMinPassword: RegisterUserInput = {
      email: 'minpass@example.com',
      password: '123456', // Exactly 6 characters (minimum)
      name: 'Min Password User'
    };

    const result = await registerUser(inputWithMinPassword);
    expect(result.user.email).toEqual('minpass@example.com');
    expect(result.token).toBeDefined();

    // Verify password was stored correctly
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.user.id))
      .execute();

    const isValid = await Bun.password.verify('123456', users[0].password_hash);
    expect(isValid).toBe(true);
  });
});
