const fs = require('fs');
const path = require('path');
const views = path.join(__dirname, 'src', 'views');
const utils = path.join(__dirname, 'src', 'utils');

if (!fs.existsSync(utils)) fs.mkdirSync(utils, { recursive: true });

const map = {
    agent: ['AgentManagerView.vue', 'AgentAssistantConfigView.vue', 'AgentScoresView.vue'],
    knowledge: ['NotesManagerView.vue', 'SemanticGroupsView.vue', 'RagTuningView.vue', 'ThinkingChainsView.vue'],
    system: ['BaseConfigView.vue', 'ServerLogView.vue', 'PlaceholderViewerView.vue', 'TvsEditorView.vue', 'PreprocessorOrderView.vue'],
    toolbox: ['ToolboxManagerView.vue', 'PluginConfigView.vue', 'ToolApprovalView.vue'],
    application: ['ForumView.vue', 'ScheduleManagerView.vue', 'DreamManagerView.vue'],
    common: ['IframeView.vue']
};

for (const [dir, files] of Object.entries(map)) {
    const targetDir = path.join(views, dir);
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
    for (const file of files) {
        const src = path.join(views, file);
        const dest = path.join(targetDir, file);
        if (fs.existsSync(src)) {
            try {
                fs.renameSync(src, dest);
                console.log(`Moved: ${file} -> ${dir}`);
            } catch (e) {
                console.error(`Failed to move ${file}: ${e.message}`);
            }
        }
    }
}
console.log("Migration completely finished.");