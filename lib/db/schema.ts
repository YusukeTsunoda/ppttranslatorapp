export interface User {
  id: string;
  email: string;
  name?: string;
  // 必要なプロパティを追加
}

export interface TeamDataWithMembers {
  id: string;
  name: string;
  members: User[];
} 