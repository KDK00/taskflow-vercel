// 🔐 초기 테스트 계정 3개 (기본값)

import { TestAccount } from "../types/auth";

export const testAccounts: TestAccount[] = [
  {
    id: "admin",
    name: "김동규",
    department: "개발자",
    role: "manager",
    username: "admin",
    password: "admin",
    email: "admin@nara.go.kr"
  },
  {
    id: "nara0",
    name: "관리자",
    department: "경영지원팀",
    role: "manager",
    username: "nara0",
    password: "nara0",
    email: "manager@nara.go.kr"
  },
  {
    id: "nara1", 
    name: "송나영",
    department: "경영지원팀",
    role: "employee",
    username: "nara1",
    password: "nara1",
    email: "employee@nara.go.kr"
  }
]; 