import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

// 세션 타입 확장
declare module 'express-session' {
  interface SessionData {
    userId?: string;
  }
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Express 세션 설정 강화
app.use(session({
  secret: process.env.SESSION_SECRET || 'taskflow-master-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  name: 'taskflow.sid', // 세션 쿠키 이름 명시
  cookie: { 
    secure: false, // HTTPS가 아닌 환경에서 false
    httpOnly: true, // XSS 공격 방지
    maxAge: 24 * 60 * 60 * 1000, // 24시간
    sameSite: 'lax' // CSRF 공격 방지
  },
  rolling: true // 활동 시마다 세션 갱신
}));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Initialize configuration manager and data directory
  try {
    const { configManager } = await import("./config-manager");
    configManager.initializeDataDirectory();
    console.log("✅ 설정 관리자 초기화 완료");
  } catch (error) {
    console.error("❌ 설정 관리자 초기화 실패:", error);
  }

  // Initialize SQLite database tables
  try {
    const { initializeTables } = await import("./db");
    await initializeTables();
  } catch (error) {
    console.log("테이블 초기화 실패:", error);
  }

  // Initialize database with real employee data
  try {
    const { initializeDatabase } = await import("./init-db");
    await initializeDatabase();
    console.log("✅ 데이터베이스 초기화 및 샘플 데이터 생성 완료");
  } catch (error) {
    console.error("❌ 치명적 오류: 데이터베이스 초기화에 실패했습니다.");
    console.error("상세 오류:", error);
    console.error("서버를 안전하게 종료합니다...");
    process.exit(1); // 실패 시 즉시 서버 종료
  }

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  const nodeEnv = (process.env.NODE_ENV || "").trim();
  console.log("🔍 현재 NODE_ENV:", `"${nodeEnv}"`);
  console.log("🔍 개발 환경 여부:", nodeEnv === "development");
  
  if (nodeEnv === "development") {
    console.log("🔧 개발 환경 - Vite 설정 중...");
    await setupVite(app, server);
  } else {
    console.log("🏭 프로덕션 환경 - 정적 파일 서빙...");
    serveStatic(app);
  }

  // Server port for standard web environment
  const port = process.env.PORT || 3000;
  server.listen(port, "localhost", () => {
    log(`🚀 서버가 http://localhost:${port}에서 실행 중입니다`);
  });
})();
