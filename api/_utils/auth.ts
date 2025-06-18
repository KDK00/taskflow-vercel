import { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { users } from '../../shared/schema';
import { getDb } from './db';
import { eq } from 'drizzle-orm';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secure-jwt-secret-2024-mmsolutions';

export interface AuthenticatedUser {
  id: string;
  username: string;
  email: string;
  role: 'employee' | 'manager' | 'developer';
  department?: string;
  name: string;
}

export async function verifyToken(token: string): Promise<AuthenticatedUser | null> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // 데이터베이스에서 사용자 정보 조회
    const db = getDb();
    const user = await db.select().from(users).where(eq(users.username, decoded.username)).limit(1);
    
    if (user.length === 0) {
      return null;
    }
    
    return {
      id: user[0].username,
      username: user[0].username,
      email: user[0].email,
      role: user[0].role as 'employee' | 'manager' | 'developer',
      department: user[0].department || undefined,
      name: user[0].name
    };
  } catch (error) {
    return null;
  }
}

export function generateToken(user: AuthenticatedUser): string {
  return jwt.sign(
    { 
      username: user.username,
      role: user.role,
      name: user.name
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

export async function requireAuth(req: VercelRequest): Promise<AuthenticatedUser | null> {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.substring(7);
  return await verifyToken(token);
}

export async function requireManager(req: VercelRequest): Promise<AuthenticatedUser | null> {
  const user = await requireAuth(req);
  
  if (!user || (user.role !== 'manager' && user.role !== 'developer')) {
    return null;
  }
  
  return user;
}

export function sendAuthError(res: VercelResponse, message: string = '인증이 필요합니다.') {
  return res.status(401).json({
    success: false,
    message
  });
}

export function sendPermissionError(res: VercelResponse, message: string = '권한이 부족합니다.') {
  return res.status(403).json({
    success: false,
    message
  });
} 