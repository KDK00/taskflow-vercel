const Database = require('better-sqlite3');

const db = new Database('./taskflow.db');

console.log('📊 TaskFlow 데이터베이스 스키마 분석');
console.log('='.repeat(60));

// 모든 테이블 목록 조회
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();

console.log('\n🗂️  존재하는 테이블 목록:');
tables.forEach((table, index) => {
  console.log(`${index + 1}. ${table.name}`);
});

console.log('\n📋 각 테이블의 스키마:');
console.log('='.repeat(60));

tables.forEach(table => {
  console.log(`\n📌 테이블: ${table.name}`);
  console.log('-'.repeat(40));
  
  // 테이블 스키마 조회
  const schema = db.prepare(`PRAGMA table_info(${table.name})`).all();
  
  schema.forEach(column => {
    console.log(`  ${column.name} (${column.type}) ${column.notnull ? 'NOT NULL' : ''} ${column.pk ? 'PRIMARY KEY' : ''} ${column.dflt_value ? `DEFAULT ${column.dflt_value}` : ''}`);
  });
  
  // 데이터 개수 확인
  try {
    const count = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get();
    console.log(`  📊 데이터 개수: ${count.count}개`);
  } catch (error) {
    console.log(`  ❌ 데이터 조회 실패: ${error.message}`);
  }
});

console.log('\n🔍 스키마 불일치 검사:');
console.log('='.repeat(60));

// 필수 테이블 확인
const requiredTables = ['users', 'daily_tasks', 'weekly_tasks', 'notifications', 'comments', 'attachments'];
const existingTableNames = tables.map(t => t.name);

requiredTables.forEach(tableName => {
  if (existingTableNames.includes(tableName)) {
    console.log(`✅ ${tableName} - 존재함`);
  } else {
    console.log(`❌ ${tableName} - 누락됨`);
  }
});

// daily_tasks 테이블 상세 검사
if (existingTableNames.includes('daily_tasks')) {
  console.log('\n📋 daily_tasks 테이블 상세 분석:');
  const dailyTasksSchema = db.prepare("PRAGMA table_info(daily_tasks)").all();
  
  const requiredColumns = [
    'id', 'title', 'description', 'assigned_to', 'created_by', 'category', 
    'status', 'priority', 'progress', 'work_date', 'start_time', 'end_time',
    'estimated_hours', 'actual_hours', 'memo', 'weekly_task_id', 'completed_at',
    'created_at', 'updated_at'
  ];
  
  const existingColumns = dailyTasksSchema.map(col => col.name);
  
  requiredColumns.forEach(colName => {
    if (existingColumns.includes(colName)) {
      console.log(`  ✅ ${colName} - 존재함`);
    } else {
      console.log(`  ❌ ${colName} - 누락됨`);
    }
  });
}

db.close();
console.log('\n✅ 스키마 분석 완료'); 