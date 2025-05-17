import { describe, expect, it, beforeAll, afterAll, jest } from '@jest/globals';
import { createMockRequest, mockPrisma } from '@/tests/utils/test-utils';
import { setupTestDatabase, teardownTestDatabase } from '@/tests/utils/db';
import { GET, POST, PUT, DELETE } from '@/app/api/admin/users/route';
import { NextRequest } from 'next/server';

describe('User Management API', () => {
  let testUser: any;
  let adminUser: any;

  beforeAll(async () => {
    await setupTestDatabase();
    
    // モックユーザーデータの設定
    adminUser = {
      id: 'admin-id',
      email: 'admin@example.com',
      role: 'ADMIN',
    };
    
    testUser = {
      id: 'user-id',
      email: 'user@example.com',
      role: 'USER',
    };

    // Prismaモックの設定
    mockPrisma.user.findUnique.mockResolvedValue(adminUser);
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  describe('GET /api/admin/users', () => {
    it('should return list of users for admin', async () => {
      const req = createMockRequest('GET');
      mockPrisma.user.findMany.mockResolvedValue([testUser, adminUser]);

      const response = await GET(req);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.users).toHaveLength(2);
    });

    it('should deny access for non-admin users', async () => {
      const req = createMockRequest('GET');
      mockPrisma.user.findUnique.mockResolvedValue(testUser);

      const response = await GET(req);
      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/admin/users', () => {
    it('should create a new user', async () => {
      const newUser = {
        email: 'new@example.com',
        name: 'New User',
        role: 'USER',
      };

      const req = createMockRequest('POST', newUser);
      mockPrisma.user.create.mockResolvedValue({ ...newUser, id: 'new-id' });

      const response = await POST(req);
      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data.user.email).toBe(newUser.email);
    });
  });

  describe('PUT /api/admin/users/:id', () => {
    it('should update user details', async () => {
      const updates = {
        name: 'Updated Name',
        role: 'ADMIN',
      };

      const req = createMockRequest('PUT', updates);
      mockPrisma.user.update.mockResolvedValue({ ...testUser, ...updates });

      const response = await PUT(req);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.user.name).toBe(updates.name);
    });
  });

  describe('DELETE /api/admin/users/:id', () => {
    it('should soft delete a user', async () => {
      const req = createMockRequest('DELETE');
      mockPrisma.user.update.mockResolvedValue({ ...testUser, deletedAt: new Date() });

      const response = await DELETE(req);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
    });
  });
}); 