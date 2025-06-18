import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import bcrypt from "bcryptjs";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  // 세션 설정 강화
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "your-secret-key-2024-taskflow",
      resave: false,
      saveUninitialized: false,
      name: "taskflow.sid", // 세션 쿠키 이름 명시
      cookie: {
        secure: false, // HTTP에서도 작동
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24시간
        sameSite: "lax" // CSRF 보호를 위한 설정
      },
      rolling: true // 활동 시마다 세션 갱신
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  // Express 요청 파싱 미들웨어를 세션 이전에 설정
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,UPDATE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept');
    
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
    } else {
      next();
    }
  });

  // Local Strategy 설정
  passport.use(
    new LocalStrategy(
      {
        usernameField: "username",
        passwordField: "password",
      },
      async (username, password, done) => {
        try {
          console.log(`🔐 인증 시도: ${username}`);
          
          const user = await storage.getUserByUsername(username);
          if (!user) {
            console.log(`❌ 사용자 없음: ${username}`);
            return done(null, false, { message: "사용자를 찾을 수 없습니다." });
          }

          // 비밀번호 확인
          const isValidPassword = await bcrypt.compare(password, user.password);
          if (!isValidPassword) {
            console.log(`❌ 비밀번호 불일치: ${username}`);
            return done(null, false, { message: "비밀번호가 일치하지 않습니다." });
          }

          console.log(`✅ 로그인 성공: ${username} (ID: ${user.id})`);
          
          // 비밀번호 필드 제거 후 반환
          const { password: _, ...userWithoutPassword } = user;
          return done(null, userWithoutPassword);
        } catch (error) {
          console.error("❌ 인증 오류:", error);
          return done(error);
        }
      }
    )
  );

  // 세션 직렬화/역직렬화
  passport.serializeUser((user: any, done) => {
    console.log(`📝 세션 직렬화: ${user.username} (ID: ${user.id})`);
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      console.log(`📖 세션 역직렬화: ID ${id}`);
      const user = await storage.getUserById(id);
      if (!user) {
        console.log(`❌ 세션 사용자 없음: ID ${id}`);
        return done(null, false);
      }
      
      const { password: _, ...userWithoutPassword } = user;
      console.log(`✅ 세션 사용자 복원: ${user.username}`);
      done(null, userWithoutPassword);
    } catch (error) {
      console.error(`❌ 세션 역직렬화 오류: ID ${id}`, error);
      done(error);
    }
  });

  // 로그인 엔드포인트 설정
  app.post("/api/login", (req, res, next) => {
    console.log("🚪 로그인 요청:", req.body.username);
    console.log("🔍 현재 세션 ID:", req.sessionID);
    console.log("🔍 현재 인증 상태:", req.isAuthenticated());
    
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        console.error("❌ 로그인 인증 오류:", err);
        return res.status(500).json({ 
          message: "서버 오류가 발생했습니다.",
          error: err.message 
        });
      }
      
      if (!user) {
        console.log("❌ 로그인 실패:", info?.message || "인증 실패");
        return res.status(401).json({ 
          success: false,
          message: info?.message || "로그인에 실패했습니다." 
        });
      }

      // 세션에 사용자 정보 저장
      req.logIn(user, (err) => {
        if (err) {
          console.error("❌ 세션 저장 오류:", err);
          return res.status(500).json({ 
            message: "세션 저장에 실패했습니다.",
            error: err.message 
          });
        }
        
        console.log(`✅ 로그인 완료: ${user.username}, 세션 ID: ${req.sessionID}`);
        console.log(`✅ 인증 상태: ${req.isAuthenticated()}`);
        res.json({ 
          success: true,
          message: "로그인 성공", 
          user: user,
          sessionId: req.sessionID
        });
      });
    })(req, res, next);
  });

  // 로그아웃 엔드포인트 개선
  app.post("/api/logout", (req, res) => {
    const username = req.user?.username || "Unknown";
    const sessionId = req.sessionID;
    console.log(`🚪 로그아웃 요청: ${username}, 세션 ID: ${sessionId}`);
    
    // 1단계: Passport 로그아웃
    req.logout((err) => {
      if (err) {
        console.error("❌ Passport 로그아웃 오류:", err);
        return res.status(500).json({ 
          message: "로그아웃에 실패했습니다.",
          error: err.message 
        });
      }
      
      console.log(`✅ Passport 로그아웃 완료: ${username}`);
      
      // 2단계: 세션 완전 삭제
      req.session.destroy((err) => {
        if (err) {
          console.error("❌ 세션 삭제 오류:", err);
          // 세션 삭제 실패해도 쿠키는 삭제
          res.clearCookie("taskflow.sid");
          return res.status(500).json({ 
            message: "세션 삭제에 실패했습니다.",
            error: err.message 
          });
        }
        
        console.log(`✅ 세션 삭제 완료: ${username}`);
        
        // 3단계: 쿠키 완전 삭제
        res.clearCookie("taskflow.sid", {
          path: '/',
          httpOnly: true,
          sameSite: 'lax'
        });
        
        console.log(`✅ 쿠키 삭제 완료: ${username}`);
        console.log(`✅ 로그아웃 전체 과정 완료: ${username}`);
        
        res.json({ 
          success: true,
          message: "로그아웃 성공",
          sessionId: sessionId 
        });
      });
    });
  });

  // 현재 사용자 정보 조회 엔드포인트
  app.get("/api/me", (req, res) => {
    console.log(`👤 사용자 정보 요청, 세션 ID: ${req.sessionID}`);
    console.log(`👤 인증 상태: ${req.isAuthenticated()}`);
    console.log(`👤 사용자: ${req.user?.username || 'None'}`);
    
    if (req.isAuthenticated() && req.user) {
      res.json({ 
        success: true,
        user: req.user 
      });
    } else {
      res.status(401).json({ 
        success: false,
        message: "인증되지 않은 사용자입니다." 
      });
    }
  });

  // 회원가입 엔드포인트
  app.post("/api/register", async (req, res) => {
    try {
      const { username, email, password, name, department, role } = req.body;
      console.log(`📝 회원가입 요청: ${username}`);

      // 사용자 중복 확인
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        console.log(`❌ 중복 사용자: ${username}`);
        return res.status(400).json({ 
          message: "이미 존재하는 사용자명입니다." 
        });
      }

      // 비밀번호 해시화
      const hashedPassword = await bcrypt.hash(password, 12);

      // 사용자 생성
      const userId = await storage.createUser({
        username,
        email,
        password: hashedPassword,
        name,
        department,
        role,
      });

      console.log(`✅ 회원가입 성공: ${username} (ID: ${userId})`);

      // 자동 로그인
      const user = await storage.getUserById(userId);
      if (user) {
        const { password: _, ...userWithoutPassword } = user;
        req.logIn(userWithoutPassword, (err) => {
          if (err) {
            console.error("❌ 자동 로그인 오류:", err);
            return res.status(201).json({ 
              message: "회원가입은 성공했지만 자동 로그인에 실패했습니다. 수동으로 로그인해주세요.",
              user: userWithoutPassword 
            });
          }
          
          console.log(`✅ 회원가입 + 자동 로그인 완료: ${username}`);
          res.status(201).json({ 
            message: "회원가입 및 로그인 성공", 
            user: userWithoutPassword 
          });
        });
      }
    } catch (error: any) {
      console.error("❌ 회원가입 오류:", error);
      res.status(500).json({ 
        message: "회원가입에 실패했습니다.",
        error: error.message 
      });
    }
  });

  console.log("🔐 인증 시스템 초기화 완료");
}
