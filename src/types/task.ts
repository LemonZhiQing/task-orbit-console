export interface ITaskItem {
    id: string;                     // 唯一标识 (格式: YYYYMMDD-任务名, 如: 20250423-高考数学-直播课)
    title: string;                  // 任务/笔记名称

    properties: {
        status: 'todo' | 'in_progress' | 'done';
        plan_date: string;            // 计划执行日 (YYYY-MM-DD)
        project: string;              // 长期任务归属 (如: 高考, 剪辑, 小说)
        priority: 'P1' | 'P2' | 'P3'; // 优先级 (前端据此渲染对应数量的火焰图标)
        task_nature: string;          // 任务性质 (如: 学习, 创作, 运维)
        metrics: {
            plan_amount: number;        // 计划量
            completed_amount: number;   // 已完成量 (进度推进量)
            unit: string;               // 单位 (如 '番茄', '页', '小时')
            estimated_days: number;     // 预计用时(天)
        };
        tags?: string[];              // 新增：标签，用于中长期范围指定 (如: 'w12', 'm3', 'q1', 'y2026')
    };

    ai_meta: {
        progress: number;             // 整体进度 (0-100)
        agent_in_charge: string;      // 负责跟进的 VCP AI (如: 晴天)
        pomodoro_spent: number;       // 实际已消耗的番茄钟数量 (用于效率仪表盘统计)
        reminder_rule: 'daily' | 'before_due' | 'none'; // 催办规则
        review_info?: {               // 艾宾浩斯复习机制 (针对笔记类任务, 可选)
            is_reviewable: boolean;
            current_level: number;      // 当前复习级别 (第 N 次)
            target_level: number;       // 目标复习总次数
            next_review_date: string;   // 算法算出的下次复习日期 (YYYY-MM-DD)
        };
    };

    // 知识映射系统 (替代传统的 Markdown 长文本详情)
    // 任务不存内容正文, 只存指向 VCP 记忆网的"指针"
    knowledge_refs: {
        tags: string[];               // 关联的日记 Tag (如: ['七步法总结', '网文架构'])
        diary_ids: string[];          // 关联的具体日记条目 UUID
        external_urls: string[];      // 外部参考链接 (B站视频、网页等)
    };

    memo: string;                   // 轻量短备注 / Checklist (纯文本, 非富文本)
    created_at: string;             // ISO 8601 格式
    updated_at: string;
}
