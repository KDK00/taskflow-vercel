import { Users, UserCheck } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface FollowUpAssigneeSelectorProps {
  type: "general" | "contract" | "unified";
  value?: string | number | null;
  onChange: (value: string | number | null) => void;
  users: Array<{ id: string | number; name: string; }>;
  disabled?: boolean;
}

const typeConfig = {
  general: {
    label: "경영일반 후속담당자",
    iconColor: "text-indigo-600",
    description: "경영일반 업무 확인담당자"
  },
  contract: {
    label: "계약업무 후속담당자", 
    iconColor: "text-blue-600",
    description: "계약업무 확인담당자"
  },
  unified: {
    label: "후속담당자",
    iconColor: "text-green-600",
    description: "업무 확인담당자"
  }
};

export function FollowUpAssigneeSelector({
  type,
  value,
  onChange,
  users,
  disabled = false
}: FollowUpAssigneeSelectorProps) {
  const config = typeConfig[type];
  
  // config가 없는 경우 기본값 사용
  if (!config) {
    console.warn(`Unknown type: ${type}, using unified config`);
    const defaultConfig = typeConfig.unified;
    
    return (
      <div className="flex items-center gap-2 text-sm">
        <Users className={`w-4 h-4 ${defaultConfig.iconColor}`} />
        <Label className="min-w-fit">{defaultConfig.label}:</Label>
        <Select 
          value={value ? value.toString() : "none"} 
          onValueChange={(val) => onChange(val === "none" ? null : val)}
          disabled={disabled}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="선택안함" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">
              <div className="flex items-center gap-2 text-gray-500">
                <span>선택안함</span>
              </div>
            </SelectItem>
            {users.filter(user => user && user.id && user.name).map(user => (
              <SelectItem key={user.id} value={user.id.toString()}>
                <div className="flex items-center gap-2">
                  <UserCheck className="w-3 h-3" />
                  {user.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }
  
  // 안전한 사용자 목록 필터링
  const safeUsers = users.filter(user => user && user.id && user.name);
  
  return (
    <div className="flex items-center gap-2 text-sm">
      <Users className={`w-4 h-4 ${config.iconColor}`} />
      <Label className="min-w-fit">{config.label}:</Label>
      <Select 
        value={value ? value.toString() : "none"} 
        onValueChange={(val) => onChange(val === "none" ? null : val)}
        disabled={disabled}
      >
        <SelectTrigger className="w-48">
          <SelectValue placeholder="선택안함" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">
            <div className="flex items-center gap-2 text-gray-500">
              <span>선택안함</span>
            </div>
          </SelectItem>
          {safeUsers.map(user => (
            <SelectItem key={user.id} value={user.id.toString()}>
              <div className="flex items-center gap-2">
                <UserCheck className="w-3 h-3" />
                {user.name}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
} 