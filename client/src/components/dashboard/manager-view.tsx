import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight } from "lucide-react";
import { UserWithStats, TaskWithDetails } from "@/types";
import { useState } from "react";
import { useTasks } from "@/hooks/use-tasks";

export function ManagerView() {
  const [selectedEmployee, setSelectedEmployee] = useState<string>("all");

  // 🎯 중앙집중식 데이터 관리 - useTasks 훅 사용
  const { allTasks: tasks } = useTasks();

  // tasks가 배열인지 확인하고 안전장치 추가
  const safeTasks = Array.isArray(tasks) ? tasks : [];

  // Group tasks by employee
  const tasksByEmployee = safeTasks.reduce((acc, task) => {
    const employeeId = task.assignedTo;
    if (!acc[employeeId]) {
      acc[employeeId] = {
        user: task.assignedUser,
        tasks: [],
      };
    }
    acc[employeeId].tasks.push(task);
    return acc;
  }, {} as Record<number, { user: any; tasks: TaskWithDetails[] }>);

  const employeeStats = Object.values(tasksByEmployee).map(({ user, tasks }) => {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === "completed").length;
    const inProgressTasks = tasks.filter(t => t.status === "progress").length;
    const overdueTasks = tasks.filter(t => t.status === "overdue").length;
    const pendingApproval = tasks.filter(t => t.status === "review").length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return {
      user,
      totalTasks,
      completedTasks,
      inProgressTasks,
      overdueTasks,
      pendingApproval,
      completionRate,
    };
  });

  const filteredStats = selectedEmployee === "all" 
    ? employeeStats 
    : employeeStats.filter(stat => stat.user.id.toString() === selectedEmployee);



  const getUserInitial = (name: string) => {
    return name ? name.charAt(0).toUpperCase() : "?";
  };

  const getInitialColor = (name: string) => {
    const colors = [
      "bg-purple-100 text-purple-600",
      "bg-blue-100 text-blue-600",
      "bg-green-100 text-green-600",
      "bg-orange-100 text-orange-600",
      "bg-pink-100 text-pink-600",
    ];
    const index = name ? name.charCodeAt(0) % colors.length : 0;
    return colors[index];
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold">팀 관리</CardTitle>
          <div className="flex items-center space-x-3">
            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="직원 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 직원</SelectItem>
                {employeeStats.map((stat) => (
                  <SelectItem key={stat.user.id} value={stat.user.id.toString()}>
                    {stat.user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {filteredStats.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">👥</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">팀원이 없습니다</h3>
            <p className="text-gray-600">팀원을 추가하고 업무를 할당해보세요.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStats.map((stat) => (
              <Card key={stat.user.id} className="border border-gray-200">
                <CardContent className="p-5">
                  <div className="flex items-center mb-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mr-3 ${getInitialColor(stat.user.name)}`}>
                      <span className="font-semibold">{getUserInitial(stat.user.name)}</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{stat.user.name}</h3>
                      <p className="text-gray-600 text-sm">{stat.user.department || "일반"}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">{stat.inProgressTasks}</p>
                      <p className="text-gray-500 text-xs">진행 중</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">{stat.completedTasks}</p>
                      <p className="text-gray-500 text-xs">완료</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-red-600">{stat.overdueTasks}</p>
                      <p className="text-gray-500 text-xs">지연</p>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                      <span>이번 주 완료율</span>
                      <span>{stat.completionRate}%</span>
                    </div>
                    <div className="progress-bar bg-gray-200">
                      <div 
                        className={`progress-fill ${
                          stat.completionRate >= 80 ? "bg-green-500" : 
                          stat.completionRate >= 60 ? "bg-orange-500" : "bg-red-500"
                        }`}
                        style={{ width: `${stat.completionRate}%` }}
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    {stat.pendingApproval > 0 ? (
                      <>
                        <span className="text-sm font-medium text-gray-900">
                          승인 대기: {stat.pendingApproval}건
                        </span>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-purple-600 hover:text-purple-700 text-sm font-medium p-0"
                        >
                          검토하기 <ArrowRight className="w-3 h-3 ml-1" />
                        </Button>
                      </>
                    ) : (
                      <span className="text-sm text-gray-500">승인 대기 업무 없음</span>
                    )}
                  </div>
                  
                  {stat.user.role === "manager" && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <Badge variant="outline" className="text-xs">
                        관리자
                      </Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
