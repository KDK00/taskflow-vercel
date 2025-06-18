import { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from './_utils/db';
import { users } from '../shared/schema';
import { requireAuth, sendAuthError } from './_utils/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const user = await requireAuth(req);
    if (!user) {
      return sendAuthError(res);
    }

    const db = getDb();
    
    // 사용자 목록 조회 (비밀번호 제외)
    const userList = await db.select({
      id: users.id,
      username: users.username,
      email: users.email,
      role: users.role,
      name: users.name,
      department: users.department,
      createdAt: users.createdAt,
    }).from(users);

    console.log(`✅ 사용자 목록 조회: ${userList.length} 명`);

    return res.status(200).json({
      success: true,
      users: userList
    });

  } catch (error) {
    console.error('사용자 목록 조회 중 오류:', error);
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.'
    });
  }
} 