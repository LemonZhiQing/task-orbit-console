export type TaskPeriod = 'daily' | 'short_term' | 'long_term' | 'routine';
export type KanbanColumn = 'todo' | 'in_progress' | 'done';
export type TaskPriority = 'p0' | 'p1' | 'p2' | 'p3';

export interface InboxItem {
  id: string;
  content: string;
  created_at: number;
}

export interface ITaskItem {
  // === 1. 身份与状态 ===
  id: string;
  title: string;
  period: TaskPeriod;
  kanban_col: KanbanColumn;
  priority: TaskPriority;

  // === 2. 溯源追踪 ===
  creator_agent?: string;
  created_at: number;
  updated_at: number;

  // === 3. 调度与效能 ===
  plan_date?: number;
  due_date?: number;
  planned_pomodoros?: number;
  actual_pomodoros?: number;
  planned_amount?: number;
  completed_amount?: number;
  unit?: string;

  // === 4. 描述与记录 ===
  project?: string; // 🎯 补回的所属项目
  memo?: string;
  tags?: string[];

  // === 5. 艾宾浩斯复习闭环 ===
  is_review: boolean;
  knowledge_tags?: string[];
  external_urls?: string[];
  review_info?: {
    next_review_date: string;
    stage: number;
  };

  // === 6. 系统交互态 ===
  is_focused: boolean;
  ai_meta_json?: string;
}