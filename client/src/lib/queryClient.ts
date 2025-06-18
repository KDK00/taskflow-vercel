import { QueryClient, QueryFunction } from "@tanstack/react-query";

// JWT 토큰 관리
const TOKEN_KEY = 'taskflow_token';

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function getAuthHeaders(): HeadersInit {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    console.error(`❌ API 오류 (${res.status}):`, text);
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  console.log(`🚀 API 요청: ${method} ${url}`, data ? { data } : '');
  
  const headers = getAuthHeaders();
  
  const res = await fetch(url, {
    method,
    headers: data ? headers : { ...headers, 'Content-Type': 'application/json' },
    body: data ? JSON.stringify(data) : undefined,
  });

  console.log(`📡 API 응답: ${method} ${url} (${res.status})`);
  
  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    console.log(`🔍 쿼리 요청:`, queryKey[0]);
    
    const res = await fetch(queryKey[0] as string, {
      headers: getAuthHeaders(),
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      console.log("🔒 인증 실패 - null 반환");
      return null;
    }

    await throwIfResNotOk(res);
    const result = await res.json();
    console.log(`✅ 쿼리 성공:`, queryKey[0], result);
    return result;
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
