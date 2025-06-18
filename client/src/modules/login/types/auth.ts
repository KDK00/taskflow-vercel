// 🔐 인증 관련 타입 정의

export interface User {
  id: string;
  username: string;
  name: string;
  department: string;
  role: 'employee' | 'manager';
  email: string;
}

export interface LoginData {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  name: string;
  department: string;
  role: 'employee' | 'manager';
}

export interface AuthResponse {
  success: boolean;
  user: User;
  message?: string;
}

export interface TestAccount {
  id: string;
  name: string;
  department: string;
  role: 'employee' | 'manager';
  username: string;
  password: string;
  email: string;
}

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: any;
  logoutMutation: any;
  registerMutation: any;
  logout: () => void;
} 