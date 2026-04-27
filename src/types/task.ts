export type TaskPeriod = 'daily' | 'short_term' | 'long_term' | 'routine';
export type KanbanColumn = 'todo' | 'in_progress' | 'done';
export type TaskPriority = 'p0' | 'p1' | 'p2' | 'p3';

export interface InboxItem {
  id: string;
  content: string;
  created_at: number;
}

export interface ReviewHistoryItem {
  reviewed_at: number;
  remembered: boolean;
  stage_before: number;
  stage_after: number;
  next_review_date: string;
}

export interface ReviewInfo {
  next_review_date: string;
  stage: number;
  completed?: boolean;
}

export interface ParentCandidate {
  id: string;
  title: string;
  period: TaskPeriod;
  due_date?: number | null;
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
  version?: number;

  // === 3. 调度与效能 ===
  plan_date?: number | null;
  due_date?: number | null;
  completed_at?: number | null;
  deleted_at?: number | null;
  sort_order?: number;
  planned_pomodoros?: number;
  actual_pomodoros?: number;
  planned_amount?: number;
  completed_amount?: number;
  unit?: string | null;
  effective_actual_pomodoros?: number;
  effective_completed_amount?: number;
  aggregated_children_count?: number;
  has_aggregated_metrics?: boolean;

  // === 4. 描述与记录 ===
  project?: string | null;
  parent_id?: string | null;
  memo?: string;
  tags?: string[];
  color?: string | null;

  // === 5. 艾宾浩斯复习闭环 ===
  is_review: boolean;
  knowledge_tags?: string[];
  external_urls?: string[];
  review_info?: ReviewInfo | null;
  review_history?: ReviewHistoryItem[];

  // === 6. 系统交互态 ===
  is_focused: boolean;
  ai_meta_json?: string | null;
}
