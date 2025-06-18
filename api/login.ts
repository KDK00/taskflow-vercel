import { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcryptjs';
import { getDb } from './_utils/db';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';
import { generateToken } from './_utils/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: '사용자명과 비밀번호를 입력해주세요.'
      });
    }

    const db = getDb();
    
    // 사용자 조회
    const userResult = await db.select().from(users).where(eq(users.username, username)).limit(1);
    
    if (userResult.length === 0) {
      return res.status(401).json({
        success: false,
        message: '사용자명 또는 비밀번호가 올바르지 않습니다.'
      });
    }

    const user = userResult[0];

    // 비밀번호 확인
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: '사용자명 또는 비밀번호가 올바르지 않습니다.'
      });
    }

    // JWT 토큰 생성
    const authenticatedUser = {
      id: user.username,
      username: user.username,
      email: user.email,
      role: user.role as 'employee' | 'manager' | 'developer',
      department: user.department || undefined,
      name: user.name
    };

    const token = generateToken(authenticatedUser);

    console.log(`🔐 로그인 성공: ${username} (${user.name})`);

    return res.status(200).json({
      success: true,
      user: {
        id: user.username,
        username: user.username,
        email: user.email,
        role: user.role,
        department: user.department,
        name: user.name
      },
      token
    });

  } catch (error) {
    console.error('로그인 처리 중 오류:', error);
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.'
    });
  }
} 