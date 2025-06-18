import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Eye, EyeOff, Plus, Save, Edit2, Trash2, Users, Shuffle, X } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface User {
  id: string;
  username: string;
  password: string;
  name: string;
  department: string;
  role: 'developer' | 'manager' | 'employee';
  email: string;
}

// 한글 입력을 위한 특별한 Input 컴포넌트
const KoreanInput = React.forwardRef<HTMLInputElement, React.ComponentProps<"input"> & {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}>(({ value, onChange, ...props }, ref) => {
  const [isComposing, setIsComposing] = useState(false);
  const [internalValue, setInternalValue] = useState(value);

  useEffect(() => {
    if (!isComposing) {
      setInternalValue(value);
    }
  }, [value, isComposing]);

  const handleCompositionStart = useCallback(() => {
    setIsComposing(true);
  }, []);

  const handleCompositionEnd = useCallback((e: React.CompositionEvent<HTMLInputElement>) => {
    setIsComposing(false);
    const syntheticEvent = {
      ...e,
      target: e.currentTarget,
      currentTarget: e.currentTarget
    } as React.ChangeEvent<HTMLInputElement>;
    onChange(syntheticEvent);
  }, [onChange]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInternalValue(e.target.value);
    if (!isComposing) {
      onChange(e);
    }
  }, [isComposing, onChange]);

  return (
    <Input
      {...props}
      ref={ref}
      value={internalValue}
      onChange={handleChange}
      onCompositionStart={handleCompositionStart}
      onCompositionEnd={handleCompositionEnd}
      lang="ko"
      inputMode="text"
    />
  );
});

KoreanInput.displayName = "KoreanInput";

export function AccountManagement() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [showPasswords, setShowPasswords] = useState(false);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [newUser, setNewUser] = useState<Omit<User, 'id'>>({
    username: '',
    password: '',
    name: '',
    department: '',
    role: 'employee',
    email: ''
  });
  const [isAddingUser, setIsAddingUser] = useState(false);

  // 계정 목록 조회
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const response = await fetch('/api/admin/users', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('사용자 목록 조회 실패');
      }
      return response.json();
    },
    enabled: currentUser?.role === 'developer' || currentUser?.role === 'manager'
  });

  // 다음 계정명 자동 생성
  const generateNextUsername = () => {
    const existingNaraUsers = users.filter((user: User) => 
      user.username.startsWith('nara') && /^nara\d+$/.test(user.username)
    );
    
    const naraNumbers = existingNaraUsers.map((user: User) => {
      const match = user.username.match(/^nara(\d+)$/);
      return match ? parseInt(match[1], 10) : 0;
    });
    
    const nextNumber = naraNumbers.length > 0 ? Math.max(...naraNumbers) + 1 : 1;
    return `nara${nextNumber}`;
  };

  // 랜덤 비밀번호 생성 (nara + 5자리 숫자)
  const generateRandomPassword = () => {
    const existingPasswords = users.map((user: User) => user.password);
    let newPassword;
    
    do {
      const randomNumbers = Array.from({ length: 5 }, () => 
        Math.floor(Math.random() * 10)
      ).join('');
      newPassword = `nara${randomNumbers}`;
    } while (existingPasswords.includes(newPassword));
    
    return newPassword;
  };

  // 계정 추가 시작 시 자동 생성
  const handleStartAddingUser = () => {
    const nextUsername = generateNextUsername();
    setNewUser({
      username: nextUsername,
      password: '',
      name: '',
      department: '',
      role: 'employee',
      email: ''
    });
    setIsAddingUser(true);
  };

  // 계정 추가 취소
  const handleCancelAddUser = () => {
    setIsAddingUser(false);
    setNewUser({
      username: '',
      password: '',
      name: '',
      department: '',
      role: 'employee',
      email: ''
    });
  };

  // 수정 취소
  const handleCancelEdit = () => {
    setEditingUser(null);
    // 원본 데이터로 복원
    queryClient.invalidateQueries({ queryKey: ['admin-users'] });
  };

  // 사용자 업데이트
  const updateUserMutation = useMutation({
    mutationFn: async ({ id, userData }: { id: string; userData: Partial<User> }) => {
      const response = await fetch(`/api/admin/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(userData)
      });
      if (!response.ok) {
        throw new Error('사용자 정보 업데이트 실패');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setEditingUser(null);
    }
  });

  // 사용자 추가
  const addUserMutation = useMutation({
    mutationFn: async (userData: Omit<User, 'id'>) => {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(userData)
      });
      if (!response.ok) {
        throw new Error('사용자 추가 실패');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      handleCancelAddUser();
    }
  });

  // 사용자 삭제
  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('사용자 삭제 실패');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    }
  });

  // 권한별 필터링
  const getFilteredUsers = () => {
    if (currentUser?.role === 'developer') {
      return users; // 개발자는 모든 계정 볼 수 있음
    } else if (currentUser?.role === 'manager') {
      return users.filter((user: User) => user.role !== 'developer'); // 관리자는 admin 계정 못 봄
    }
    return [];
  };

  // 수정 권한 체크
  const canEdit = (user: User) => {
    if (currentUser?.role === 'developer') {
      return true; // 개발자는 모든 계정 수정 가능
    } else if (currentUser?.role === 'manager') {
      return user.role !== 'developer'; // 관리자는 admin 계정 수정 불가
    }
    return false;
  };

  // 비밀번호 표시 권한
  const canViewPassword = (user: User) => {
    if (currentUser?.role === 'developer') {
      return true; // 개발자는 모든 비밀번호 볼 수 있음
    } else if (currentUser?.role === 'manager') {
      return user.role !== 'developer'; // 관리자는 admin 비밀번호 못 봄
    }
    return false;
  };

  const handleSaveUser = (user: User) => {
    updateUserMutation.mutate({ id: user.id, userData: user });
  };

  const handleAddUser = () => {
    if (!newUser.username || !newUser.password || !newUser.name) {
      alert('필수 항목을 모두 입력해주세요.');
      return;
    }
    addUserMutation.mutate(newUser);
  };

  const handleDeleteUser = (id: string) => {
    if (confirm('정말로 이 사용자를 삭제하시겠습니까?')) {
      deleteUserMutation.mutate(id);
    }
  };

  const filteredUsers = getFilteredUsers();

  if (isLoading) {
    return <div className="p-6 text-center">로딩 중...</div>;
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            계정 관리
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPasswords(!showPasswords)}
              className="flex items-center gap-2"
            >
              {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showPasswords ? '비밀번호 숨기기' : '비밀번호 보기'}
            </Button>
            <Button
              onClick={handleStartAddingUser}
              size="sm"
              className="flex items-center gap-2"
              disabled={isAddingUser}
            >
              <Plus className="h-4 w-4" />
              계정 추가
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table className="min-w-[1000px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">아이디</TableHead>
                <TableHead className="w-[140px]">비밀번호</TableHead>
                <TableHead className="w-[100px]">이름</TableHead>
                <TableHead className="w-[120px]">부서</TableHead>
                <TableHead className="w-[100px]">역할</TableHead>
                <TableHead className="w-[200px] min-w-[200px]">이메일</TableHead>
                <TableHead className="w-[120px]">작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* 새 사용자 추가 행 */}
              {isAddingUser && (
                <TableRow className="bg-blue-50">
                  <TableCell className="w-[120px]">
                    <div className="flex gap-2">
                      <Input
                        value={newUser.username}
                        onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                        placeholder="사용자명"
                        className="text-sm"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setNewUser({ ...newUser, username: generateNextUsername() })}
                        title="다음 계정명 자동 생성"
                      >
                        <Shuffle className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="w-[140px]">
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        value={newUser.password}
                        onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                        placeholder="비밀번호"
                        className="text-sm"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setNewUser({ ...newUser, password: generateRandomPassword() })}
                        title="랜덤 비밀번호 생성"
                      >
                        <Shuffle className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="w-[100px]">
                    <KoreanInput
                      value={newUser.name}
                      onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                      placeholder="이름"
                      autoComplete="off"
                      spellCheck={false}
                      className="text-sm"
                    />
                  </TableCell>
                  <TableCell className="w-[120px]">
                    <KoreanInput
                      value={newUser.department}
                      onChange={(e) => setNewUser({ ...newUser, department: e.target.value })}
                      placeholder="부서"
                      autoComplete="off"
                      spellCheck={false}
                      className="text-sm"
                    />
                  </TableCell>
                  <TableCell className="w-[100px]">
                    <Select value={newUser.role} onValueChange={(value: any) => setNewUser({ ...newUser, role: value })}>
                      <SelectTrigger className="text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="employee">일반사용자</SelectItem>
                        <SelectItem value="manager">관리자</SelectItem>
                        {currentUser?.role === 'developer' && (
                          <SelectItem value="developer">개발자</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="w-[200px] min-w-[200px]">
                    <Input
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      placeholder="이메일"
                      className="text-sm"
                    />
                  </TableCell>
                  <TableCell className="w-[120px]">
                    <div className="flex gap-1">
                      <Button 
                        size="sm" 
                        onClick={handleAddUser}
                        disabled={addUserMutation.isPending}
                        className="px-2"
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={handleCancelAddUser}
                        className="px-2"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}

              {/* 기존 사용자 목록 */}
              {filteredUsers.map((user: User) => (
                <TableRow key={user.id}>
                  <TableCell className="w-[120px]">
                    {editingUser === user.id ? (
                      <Input
                        value={user.username}
                        onChange={(e) => {
                          const updatedUsers = users.map((u: User) =>
                            u.id === user.id ? { ...u, username: e.target.value } : u
                          );
                          queryClient.setQueryData(['admin-users'], updatedUsers);
                        }}
                        className="text-sm"
                      />
                    ) : (
                      <div className="truncate" title={user.username}>
                        {user.username}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="w-[140px]">
                    {canViewPassword(user) ? (
                      editingUser === user.id ? (
                        <Input
                          type="text"
                          value={user.password}
                          onChange={(e) => {
                            const updatedUsers = users.map((u: User) =>
                              u.id === user.id ? { ...u, password: e.target.value } : u
                            );
                            queryClient.setQueryData(['admin-users'], updatedUsers);
                          }}
                          className="text-sm"
                        />
                      ) : showPasswords ? (
                        <div className="truncate" title={user.password}>
                          {user.password}
                        </div>
                      ) : (
                        '••••••••'
                      )
                    ) : (
                      '••••••••'
                    )}
                  </TableCell>
                  <TableCell className="w-[100px]">
                    {editingUser === user.id ? (
                      <KoreanInput
                        value={user.name}
                        onChange={(e) => {
                          const updatedUsers = users.map((u: User) =>
                            u.id === user.id ? { ...u, name: e.target.value } : u
                          );
                          queryClient.setQueryData(['admin-users'], updatedUsers);
                        }}
                        autoComplete="off"
                        spellCheck={false}
                        className="text-sm"
                      />
                    ) : (
                      <div className="truncate" title={user.name}>
                        {user.name}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="w-[120px]">
                    {editingUser === user.id ? (
                      <KoreanInput
                        value={user.department}
                        onChange={(e) => {
                          const updatedUsers = users.map((u: User) =>
                            u.id === user.id ? { ...u, department: e.target.value } : u
                          );
                          queryClient.setQueryData(['admin-users'], updatedUsers);
                        }}
                        autoComplete="off"
                        spellCheck={false}
                        className="text-sm"
                      />
                    ) : (
                      <div className="truncate" title={user.department}>
                        {user.department}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="w-[100px]">
                    {editingUser === user.id ? (
                      <Select
                        value={user.role}
                        onValueChange={(value: any) => {
                          const updatedUsers = users.map((u: User) =>
                            u.id === user.id ? { ...u, role: value } : u
                          );
                          queryClient.setQueryData(['admin-users'], updatedUsers);
                        }}
                      >
                        <SelectTrigger className="text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="employee">일반사용자</SelectItem>
                          <SelectItem value="manager">관리자</SelectItem>
                          {currentUser?.role === 'developer' && (
                            <SelectItem value="developer">개발자</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        user.role === 'developer' 
                          ? 'bg-red-100 text-red-800'
                          : user.role === 'manager'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {user.role === 'developer' ? '개발자' : user.role === 'manager' ? '관리자' : '일반사용자'}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="w-[200px] min-w-[200px]">
                    {editingUser === user.id ? (
                      <Input
                        value={user.email}
                        onChange={(e) => {
                          const updatedUsers = users.map((u: User) =>
                            u.id === user.id ? { ...u, email: e.target.value } : u
                          );
                          queryClient.setQueryData(['admin-users'], updatedUsers);
                        }}
                        className="text-sm"
                      />
                    ) : (
                      <div className="truncate" title={user.email}>
                        {user.email}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="w-[120px]">
                    <div className="flex gap-1">
                      {canEdit(user) && (
                        <>
                          {editingUser === user.id ? (
                            <>
                              <Button 
                                size="sm" 
                                onClick={() => handleSaveUser(user)}
                                disabled={updateUserMutation.isPending}
                                className="px-2"
                              >
                                <Save className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={handleCancelEdit}
                                className="px-2"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => setEditingUser(user.id)}
                                className="px-2"
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              {user.role !== 'developer' && (
                                <Button 
                                  size="sm" 
                                  variant="destructive" 
                                  onClick={() => handleDeleteUser(user.id)}
                                  className="px-2"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
} 