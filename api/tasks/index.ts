import { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../_utils/db';
import { dailyTasks, users } from '../../shared/schema';
import { requireAuth, sendAuthError } from '../_utils/auth';
import { eq, and, gte, lte, desc } from 'drizzle-orm';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return await handleGetTasks(req, res);
  }

  if (req.method === 'POST') {
    return await handleCreateTask(req, res);
  }

  return res.status(405).json({ success: false, message: 'Method not allowed' });
}

async function handleGetTasks(req: VercelRequest, res: VercelResponse) {
  try {
    const user = await requireAuth(req);
    if (!user) {
      return sendAuthError(res);
    }

    const db = getDb();
    const { date, status, assignedTo, category, page = '1', limit = '50' } = req.query;

    let query = db.select({
      id: dailyTasks.id,
      title: dailyTasks.title,
      description: dailyTasks.description,
      category: dailyTasks.category,
      status: dailyTasks.status,
      priority: dailyTasks.priority,
      progress: dailyTasks.progress,
      workDate: dailyTasks.workDate,
      startTime: dailyTasks.startTime,
      endTime: dailyTasks.endTime,
      estimatedHours: dailyTasks.estimatedHours,
      actualHours: dailyTasks.actualHours,
      memo: dailyTasks.memo,
      assignedTo: dailyTasks.assignedTo,
      createdBy: dailyTasks.createdBy,
      isFollowUpTask: dailyTasks.isFollowUpTask,
      parentTaskId: dailyTasks.parentTaskId,
      followUpType: dailyTasks.followUpType,
      completedAt: dailyTasks.completedAt,
      createdAt: dailyTasks.createdAt,
      updatedAt: dailyTasks.updatedAt,
      assignedUserName: users.name,
      assignedUserRole: users.role,
    }).from(dailyTasks)
      .leftJoin(users, eq(dailyTasks.assignedTo, users.id))
      .orderBy(desc(dailyTasks.createdAt));

    // 권한별 필터링
    if (user.role === 'employee') {
      query = query.where(eq(dailyTasks.assignedTo, parseInt(user.id)));
    }

    // 필터 적용
    const conditions = [];
    
    if (date) {
      conditions.push(eq(dailyTasks.workDate, date as string));
    }
    
    if (status) {
      conditions.push(eq(dailyTasks.status, status as string));
    }
    
    if (assignedTo) {
      conditions.push(eq(dailyTasks.assignedTo, parseInt(assignedTo as string)));
    }
    
    if (category) {
      conditions.push(eq(dailyTasks.category, category as string));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // 페이징
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    const tasks = await query.limit(limitNum).offset(offset);

    console.log(`👑 ${user.role} 권한: 전체 업무 조회 (${tasks.length}개)`);
    console.log(`✅ 업무 목록 API 성공: ${tasks.length}개 업무 (사용자 ID: ${user.id})`);

    return res.status(200).json({
      success: true,
      tasks,
      meta: {
        total: tasks.length,
        page: pageNum,
        limit: limitNum,
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('업무 목록 조회 중 오류:', error);
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.'
    });
  }
}

async function handleCreateTask(req: VercelRequest, res: VercelResponse) {
  try {
    const user = await requireAuth(req);
    if (!user) {
      return sendAuthError(res);
    }

    const db = getDb();
    const taskData = req.body;

    // 새 업무 생성
    const newTask = await db.insert(dailyTasks).values({
      ...taskData,
      createdBy: parseInt(user.id),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }).returning();

    console.log(`✅ 새 업무 생성: ${newTask[0].title} (생성자: ${user.name})`);

    return res.status(201).json({
      success: true,
      task: newTask[0],
      message: '업무가 성공적으로 생성되었습니다.'
    });

  } catch (error) {
    console.error('업무 생성 중 오류:', error);
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.'
    });
  }
} 