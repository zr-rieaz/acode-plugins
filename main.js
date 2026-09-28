class AIPlugin {
    constructor() {
        this.id = "com.zr.ai";
        this.tabId = "zrai-chat-tab";
        this.apiKeyStorageKey = "zrai_gemini_api_key";
        this.modelStorageKey = "zrai_selected_gemini_model";
        this.sessionsStorageKey = "zrai_chat_sessions_v2";
        this.activeSessionIdKey = "zrai_active_session_id_v2";
        this.defaultModel = "gemini-3.8-flash";
        this.chatFile = null;
        this.commandName = "open_custom_tab";
        this.styleId = "zrai-chat-plugin-styles";
        this.activeRoot = null;
        this._hasBoundEvents = false;

        this.availableModels = [
            {
                id: "gemini-3.8-flash",
                name: "Gemini 3.8 Flash",
                desc: "Flagship: Latest generation high-intelligence model for advanced coding",
                tag: "Flagship",
            },
            {
                id: "gemini-3.7-flash",
                name: "Gemini 3.7 Flash",
                desc: "Hybrid reasoning and high-speed code generation",
                tag: "Reasoning & Speed",
            },
            {
                id: "gemini-3.5-flash-lite",
                name: "Gemini 3.5 Flash Lite",
                desc: "Ultra lightweight, responsive, and low-latency assistance",
                tag: "Ultra Lite",
            },
            {
                id: "gemini-3.6-flash",
                name: "Gemini 3.6 Flash",
                desc: "High throughput intelligence for rapid coding & debugging",
                tag: "High Speed",
            },
            {
                id: "gemini-3.5-flash",
                name: "Gemini 3.5 Flash",
                desc: "Balanced high performance and consistent coding quality",
                tag: "Balanced & Fast",
            },
            {
                id: "gemini-3.1-flash-lite",
                name: "Gemini 3.1 Flash Lite",
                desc: "Efficient lightweight model for quick snippet generation",
                tag: "Lightweight",
            },
        ];

        this.sessions = this.loadSessions();
        this.activeSessionId = this.loadActiveSessionId();
    }

    async init($page, options) {
        try {
            this.injectStyles();
        } catch (e) {
            console.warn("[ZrAI] injectStyles error:", e);
        }

        try {
            this.registerCommands();
        } catch (e) {
            console.warn("[ZrAI] registerCommands error:", e);
        }

        try {
            this.setupPluginPage($page);
        } catch (e) {
            console.warn("[ZrAI] setupPluginPage error:", e);
        }

        try {
            const toast = acode.require("toast");
            if (toast) {
                toast("ZrAI Chat", 3500);
            }
        } catch (e) {}
    }

    /**
     * Load chat sessions from localStorage
     */
    loadSessions() {
        try {
            const raw = localStorage.getItem(this.sessionsStorageKey);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    return parsed;
                }
            }
        } catch (e) {
            console.warn("[ZrAI] Failed to parse sessions:", e);
        }
        return [this.createFreshSession("New Conversation")];
    }

    /**
     * Save chat sessions to localStorage
     */
    saveSessions() {
        try {
            localStorage.setItem(
                this.sessionsStorageKey,
                JSON.stringify(this.sessions),
            );
        } catch (e) {
            console.warn("[ZrAI] Failed to save sessions:", e);
        }
    }

    loadActiveSessionId() {
        const saved = localStorage.getItem(this.activeSessionIdKey);
        if (saved && this.sessions.some((s) => s.id === saved)) {
            return saved;
        }
        return this.sessions[0].id;
    }

    setActiveSessionId(id) {
        this.activeSessionId = id;
        localStorage.setItem(this.activeSessionIdKey, id);
    }

    createFreshSession(title = "New Conversation") {
        return {
            id:
                "session_" +
                Date.now() +
                "_" +
                Math.random().toString(36).substring(2, 7),
            title: title,
            updatedAt: Date.now(),
            messages: [
                {
                    id: "welcome",
                    sender: "ZrAI",
                    type: "ai",
                    timestamp: new Date().toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                    }),
                    text: "Hello! How can I assist you with your coding today? You can ask me to write functions, debug errors, explain code, or optimize algorithms.",
                },
            ],
        };
    }

    getActiveSession() {
        let session = this.sessions.find((s) => s.id === this.activeSessionId);
        if (!session) {
            session = this.sessions[0];
            if (!session) {
                session = this.createFreshSession();
                this.sessions.push(session);
                this.saveSessions();
            }
            this.setActiveSessionId(session.id);
        }
        return session;
    }

    getSelectedModel() {
        return localStorage.getItem(this.modelStorageKey) || this.defaultModel;
    }

    setSelectedModel(modelId) {
        localStorage.setItem(this.modelStorageKey, modelId);
    }

    getModelDisplayName(modelId) {
        const found = this.availableModels.find((m) => m.id === modelId);
        return found ? found.name : modelId;
    }

    injectStyles() {
        if (document.getElementById(this.styleId)) return;

        const style = document.createElement("style");
        style.id = this.styleId;
        style.textContent = this.getCssContent();
        document.head.appendChild(style);
    }

    getCssContent() {
        return `
      .zrai-root, .zrai-root * {
        box-sizing: border-box;
      }

      .zrai-root {
        display: flex;
        flex-direction: column;
        height: 100%;
        width: 100%;
        max-width: 100%;
        min-width: 0;
        background-color: #1e1e1e;
        color: #e2e8f0;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        -webkit-font-smoothing: antialiased;
        overflow: hidden;
        position: relative;
      }

      .zrai-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 12px;
        background-color: #252526;
        border-bottom: 1px solid #333333;
        font-size: 13px;
        font-weight: 600;
        color: #f1f5f9;
        user-select: none;
        flex-shrink: 0;
        gap: 8px;
        z-index: 10;
      }

      .zrai-header-left {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
      }

      .zrai-brand-title {
        font-size: 13px;
        font-weight: 700;
        color: #ffffff;
        letter-spacing: 0.3px;
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .zrai-model-badge-btn {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        background: #0284c7;
        color: #ffffff;
        padding: 3px 9px;
        border-radius: 9999px;
        font-size: 10.5px;
        font-weight: 500;
        border: 1px solid rgba(255, 255, 255, 0.15);
        cursor: pointer;
        transition: all 0.15s ease;
        outline: none;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
        max-width: 170px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .zrai-model-badge-btn:hover {
        background: #0369a1;
        border-color: rgba(255, 255, 255, 0.35);
      }

      .zrai-header-actions {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-shrink: 0;
      }

      .zrai-icon-btn {
        background: transparent;
        border: none;
        color: #cbd5e1;
        cursor: pointer;
        padding: 6px;
        border-radius: 6px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        transition: all 0.15s ease;
      }
      .zrai-icon-btn:hover {
        background: #333338;
        color: #ffffff;
      }

      /* Slide-over Drawer for Chat History */
      .zrai-drawer-overlay {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.65);
        backdrop-filter: blur(2px);
        z-index: 200;
        display: flex;
        animation: zraiFadeIn 0.2s ease-out;
      }

      .zrai-drawer {
        width: 85%;
        max-width: 320px;
        height: 100%;
        background: #18181b;
        border-right: 1px solid #27272a;
        display: flex;
        flex-direction: column;
        box-shadow: 4px 0 25px rgba(0,0,0,0.6);
        animation: zraiSlideIn 0.2s ease-out;
      }

      @keyframes zraiSlideIn {
        from { transform: translateX(-100%); }
        to { transform: translateX(0); }
      }

      .zrai-drawer-header {
        padding: 14px;
        background: #202023;
        border-bottom: 1px solid #2d2d30;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .zrai-drawer-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .zrai-drawer-title {
        font-size: 13px;
        font-weight: 700;
        color: #ffffff;
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .zrai-drawer-api-btn {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        padding: 8px 12px;
        background: #27272a;
        border: 1px solid #3f3f46;
        border-radius: 8px;
        color: #fbbf24;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .zrai-drawer-api-btn:hover {
        background: #333338;
        border-color: #f59e0b;
      }

      .zrai-new-chat-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        width: 100%;
        padding: 8px 12px;
        background: #0284c7;
        color: #ffffff;
        border: none;
        border-radius: 8px;
        font-size: 12.5px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .zrai-new-chat-btn:hover {
        background: #0369a1;
      }

      .zrai-history-section-title {
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: #71717a;
        padding: 10px 14px 4px 14px;
      }

      .zrai-history-list {
        flex: 1;
        overflow-y: auto;
        padding: 6px 10px;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .zrai-history-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 9px 12px;
        border-radius: 8px;
        background: transparent;
        color: #cbd5e1;
        font-size: 12.5px;
        cursor: pointer;
        user-select: none;
        transition: all 0.15s ease;
        border: 1px solid transparent;
      }
      .zrai-history-item:hover {
        background: #27272a;
        color: #ffffff;
      }
      .zrai-history-item.active {
        background: #0c2538;
        border-color: #0284c7;
        color: #38bdf8;
        font-weight: 500;
      }

      .zrai-history-title {
        flex: 1;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        margin-right: 6px;
      }

      .zrai-history-actions {
        display: flex;
        align-items: center;
        gap: 3px;
      }

      .zrai-history-btn {
        background: transparent;
        border: none;
        color: #94a3b8;
        padding: 4px;
        border-radius: 4px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      .zrai-history-btn:hover {
        color: #ffffff;
        background: #3f3f46;
      }

      /* Chat Box */
      .zrai-chat-box {
        flex: 1;
        background-color: #1e1e1e;
        overflow-y: auto;
        overflow-x: hidden;
        padding: 14px;
        display: flex;
        flex-direction: column;
        gap: 14px;
        width: 100%;
        max-width: 100%;
        min-width: 0;
        scroll-behavior: smooth;
      }

      .zrai-msg {
        display: flex;
        flex-direction: column;
        max-width: 88%;
        min-width: 0;
        animation: zraiFadeIn 0.2s ease-out;
        word-break: break-word;
        overflow-wrap: anywhere;
      }
      @keyframes zraiFadeIn {
        from { opacity: 0; transform: translateY(4px); }
        to { opacity: 1; transform: translateY(0); }
      }

      .zrai-msg-user {
        align-self: flex-end;
        align-items: flex-end;
      }

      .zrai-msg-ai {
        align-self: flex-start;
        align-items: flex-start;
      }

      .zrai-sender-label {
        font-size: 11px;
        color: #64748b;
        margin-bottom: 4px;
        font-weight: 500;
        padding: 0 2px;
      }

      .zrai-bubble {
        padding: 10px 14px;
        border-radius: 12px;
        font-size: 13.5px;
        line-height: 1.6;
        max-width: 100%;
        min-width: 0;
        word-break: break-word;
        overflow-wrap: anywhere;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
      }

      .zrai-msg-user .zrai-bubble {
        background-color: #0284c7;
        color: #ffffff;
        border-bottom-right-radius: 3px;
      }

      .zrai-msg-ai .zrai-bubble {
        background-color: #27272a;
        color: #f1f5f9;
        border: 1px solid #3f3f46;
        border-bottom-left-radius: 3px;
      }

      .zrai-code-block {
        background: #111113;
        border: 1px solid #333338;
        border-radius: 8px;
        margin: 10px 0;
        width: 100%;
        max-width: 100%;
        overflow: hidden;
      }
      .zrai-code-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #1c1c1f;
        padding: 6px 12px;
        font-size: 11px;
        color: #94a3b8;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        border-bottom: 1px solid #28282c;
      }
      .zrai-copy-btn, .zrai-insert-btn {
        background: #2a2a30;
        border: 1px solid #3e3e44;
        color: #cbd5e1;
        padding: 3px 8px;
        border-radius: 4px;
        font-size: 10.5px;
        cursor: pointer;
        font-weight: 500;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        transition: all 0.15s ease;
      }
      .zrai-copy-btn:hover, .zrai-insert-btn:hover {
        background: #3e3e46;
        color: #ffffff;
      }
      .zrai-insert-btn {
        background: rgba(2, 132, 199, 0.2);
        border-color: rgba(56, 189, 248, 0.35);
        color: #7dd3fc;
      }
      .zrai-insert-btn:hover {
        background: rgba(2, 132, 199, 0.4);
        color: #ffffff;
      }
      .zrai-code-content {
        padding: 12px;
        font-family: 'Fira Code', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        font-size: 12.5px;
        line-height: 1.6;
        overflow-x: auto;
        white-space: pre;
        color: #f1f5f9;
        margin: 0;
        max-width: 100%;
        tab-size: 2;
        background: #11131a;
      }
      .zrai-hl-keyword { color: #f472b6; font-weight: 600; } /* Pink/Magenta keywords */
      .zrai-hl-string { color: #fbbf24; }                    /* Warm amber strings */
      .zrai-hl-number { color: #4ade80; }                    /* Bright emerald numbers */
      .zrai-hl-comment { color: #94a3b8; font-style: italic; opacity: 0.85; } /* Slate comments */
      .zrai-hl-func { color: #38bdf8; font-weight: 500; }     /* Sky blue functions */
      .zrai-hl-type { color: #2dd4bf; }                       /* Vibrant teal types/classes */
      .zrai-hl-tag { color: #818cf8; font-weight: 600; }      /* Indigo/blue HTML tags */
      .zrai-hl-attr { color: #cbd5e1; }                       /* Light slate attributes */
      .zrai-hl-bool { color: #c084fc; font-weight: 600; }     /* Purple booleans/null */
      .zrai-hl-operator { color: #e2e8f0; }

      .zrai-typing-indicator {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 10px 14px;
        background: #27272a;
        border: 1px solid #3f3f46;
        border-radius: 12px;
        border-bottom-left-radius: 3px;
        width: fit-content;
      }
      .zrai-dot {
        width: 6px;
        height: 6px;
        background: #38bdf8;
        border-radius: 50%;
        animation: zraiPulse 1.4s infinite ease-in-out both;
      }
      .zrai-dot:nth-child(1) { animation-delay: -0.32s; }
      .zrai-dot:nth-child(2) { animation-delay: -0.16s; }
      @keyframes zraiPulse {
        0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
        40% { transform: scale(1); opacity: 1; }
      }

      .zrai-input-area {
        background-color: #18181b;
        border-top: 1px solid #27272a;
        padding: 10px 12px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        width: 100%;
        max-width: 100%;
        flex-shrink: 0;
      }

      .zrai-input-row {
        display: flex;
        align-items: flex-end;
        gap: 8px;
        background: #27272a;
        border: 1px solid #3f3f46;
        border-radius: 10px;
        padding: 6px 10px;
        width: 100%;
        max-width: 100%;
        min-width: 0;
        transition: border-color 0.15s ease;
      }
      .zrai-input-row:focus-within {
        border-color: #0284c7;
      }

      .zrai-textarea {
        flex: 1;
        background: transparent;
        border: none;
        outline: none;
        color: #f8fafc;
        font-family: inherit;
        font-size: 13.5px;
        line-height: 1.5;
        resize: none;
        max-height: 120px;
        min-height: 24px;
        padding: 4px 2px;
        width: 100%;
        min-width: 0;
      }
      .zrai-textarea::placeholder {
        color: #71717a;
      }

      .zrai-send-btn {
        background: #0284c7;
        border: none;
        border-radius: 8px;
        color: #ffffff;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        margin-bottom: 1px;
        flex-shrink: 0;
        transition: all 0.15s ease;
      }
      .zrai-send-btn:hover {
        background: #0369a1;
      }
      .zrai-send-btn:disabled {
        background: #3f3f46;
        color: #71717a;
        cursor: not-allowed;
      }

      .zrai-error-banner {
        background-color: #450a0a;
        color: #fca5a5;
        border: 1px solid #991b1b;
        border-radius: 6px;
        padding: 8px 12px;
        font-size: 12px;
        line-height: 1.4;
        display: none;
        word-break: break-word;
      }

      /* Modals */
      .zrai-modal-overlay {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.75);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        padding: 16px;
      }

      .zrai-modal {
        background: #252526;
        border: 1px solid #3e3e42;
        border-radius: 12px;
        width: 100%;
        max-width: 420px;
        max-height: 90vh;
        overflow-y: auto;
        padding: 18px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.7);
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .zrai-modal-title {
        font-size: 15px;
        font-weight: 600;
        color: #ffffff;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .zrai-modal-desc {
        font-size: 12px;
        color: #94a3b8;
        line-height: 1.5;
        margin: 0;
      }
      .zrai-modal-input {
        width: 100%;
        background: #1a1a1c;
        border: 1px solid #3f3f46;
        color: #ffffff;
        padding: 9px 12px;
        border-radius: 6px;
        font-size: 13px;
        outline: none;
      }
      .zrai-modal-input:focus {
        border-color: #0284c7;
      }

      .zrai-model-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-top: 4px;
      }
      .zrai-model-option {
        display: flex;
        flex-direction: column;
        gap: 3px;
        background: #1e1e20;
        border: 1px solid #37373d;
        border-radius: 8px;
        padding: 10px 12px;
        cursor: pointer;
        transition: all 0.15s ease;
        text-align: left;
      }
      .zrai-model-option:hover {
        background: #28282e;
        border-color: #0284c7;
      }
      .zrai-model-option.selected {
        background: #0c2538;
        border-color: #38bdf8;
      }
      .zrai-model-opt-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }
      .zrai-model-opt-name {
        font-size: 13px;
        font-weight: 600;
        color: #ffffff;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .zrai-model-opt-tag {
        font-size: 10px;
        background: #0284c7;
        color: #ffffff;
        padding: 1px 6px;
        border-radius: 4px;
        font-weight: 500;
      }
      .zrai-model-option.selected .zrai-model-opt-tag {
        background: #38bdf8;
        color: #082f49;
      }
      .zrai-model-opt-desc {
        font-size: 11.5px;
        color: #94a3b8;
        line-height: 1.4;
      }
      .zrai-model-opt-id {
        font-family: ui-monospace, SFMono-Regular, monospace;
        font-size: 10.5px;
        color: #64748b;
      }

      .zrai-modal-btns {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        margin-top: 6px;
      }
      .zrai-btn-cancel {
        background: #333338;
        border: none;
        color: #cbd5e1;
        padding: 7px 14px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 12px;
      }
      .zrai-btn-save {
        background: #0284c7;
        border: none;
        color: #ffffff;
        padding: 7px 16px;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 500;
        font-size: 12px;
      }
      .zrai-btn-save:hover {
        background: #0369a1;
      }
      .zrai-btn-danger {
        background: #dc2626;
        border: none;
        color: #ffffff;
        padding: 7px 16px;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 500;
        font-size: 12px;
      }
      .zrai-btn-danger:hover {
        background: #b91c1c;
      }
    `;
    }

    registerCommands() {
        const handleOpenChat = () => {
            this.openChatTab();
        };

        // 1. Primary & Recommended: Acode Commands API (acode.require('commands'))
        try {
            const commands = acode.require("commands");
            if (commands && typeof commands.addCommand === "function") {
                // Primary command: open_custom_tab
                commands.addCommand({
                    name: this.commandName,
                    description: "⚡ ZrAI: Open Chat (open_custom_tab)",
                    bindKey: { win: "Ctrl-Alt-Z", mac: "Command-Alt-Z" },
                    exec: handleOpenChat,
                });

                // Searchable alias 1: zrai_chat
                commands.addCommand({
                    name: "zrai_chat",
                    description: "⚡ ZrAI Chat (AI Coding Assistant)",
                    exec: handleOpenChat,
                });

                // Searchable alias 2: zrai
                commands.addCommand({
                    name: "zrai",
                    description: "⚡ ZrAI: AI Coding Assistant",
                    exec: handleOpenChat,
                });
            }
        } catch (e) {
            console.warn(
                '[ZrAI] Failed to register via acode.require("commands"):',
                e,
            );
        }

        // 2. Direct convenience method on global acode object (if available)
        if (window.acode && typeof acode.addCommand === "function") {
            try {
                acode.addCommand({
                    name: this.commandName,
                    description: "⚡ ZrAI: Open Chat (open_custom_tab)",
                    bindKey: { win: "Ctrl-Alt-Z", mac: "Command-Alt-Z" },
                    exec: handleOpenChat,
                });
                acode.addCommand({
                    name: "zrai_chat",
                    description: "⚡ ZrAI Chat (AI Coding Assistant)",
                    exec: handleOpenChat,
                });
                acode.addCommand({
                    name: "zrai",
                    description: "⚡ ZrAI: AI Coding Assistant",
                    exec: handleOpenChat,
                });
            } catch (e) {}
        }

        // 3. Fallback for Ace / CodeMirror editor commands registry
        const registerEditorCommands = () => {
            try {
                if (
                    window.editorManager &&
                    editorManager.editor &&
                    editorManager.editor.commands
                ) {
                    editorManager.editor.commands.addCommand({
                        name: this.commandName,
                        description: "⚡ ZrAI: Open Chat (open_custom_tab)",
                        bindKey: { win: "Ctrl-Alt-Z", mac: "Command-Alt-Z" },
                        exec: handleOpenChat,
                    });
                    editorManager.editor.commands.addCommand({
                        name: "zrai_chat",
                        description: "⚡ ZrAI Chat (AI Coding Assistant)",
                        exec: handleOpenChat,
                    });
                    editorManager.editor.commands.addCommand({
                        name: "zrai",
                        description: "⚡ ZrAI: AI Coding Assistant",
                        exec: handleOpenChat,
                    });
                }
            } catch (e) {
                console.warn(
                    "[ZrAI] Failed to register command on editorManager:",
                    e,
                );
            }
        };

        registerEditorCommands();

        // Listen to Acode file switches to keep command persistently registered in Ace
        if (window.editorManager && !this._hasBoundEvents) {
            this._hasBoundEvents = true;
            try {
                if (typeof editorManager.on === "function") {
                    editorManager.on("switch-file", registerEditorCommands);
                    editorManager.on("add-file", registerEditorCommands);
                    editorManager.on("rename-file", registerEditorCommands);
                }
            } catch (e) {}
        }

        // Delayed retries to handle delayed editor mounting on startup
        setTimeout(registerEditorCommands, 300);
        setTimeout(registerEditorCommands, 1000);
        setTimeout(registerEditorCommands, 2500);
        setTimeout(registerEditorCommands, 5000);

        // 4. Register sidebar app / icon if supported
        try {
            const sideBarApps = acode.require("sidebarApps");
            if (sideBarApps && typeof sideBarApps.add === "function") {
                sideBarApps.add(
                    "icon-chat",
                    this.id,
                    "⚡ ZrAI Chat",
                    (container) => {
                        this.openChatTab();
                    },
                );
            }
        } catch (e) {}
    }

    setupPluginPage($page) {
        if (!$page) return;
        try {
            $page.id = "zrai-settings-page";
            if (typeof $page.settitle === "function") {
                $page.settitle("⚡ ZrAI Chat");
            }

            $page.innerHTML = `
        <div style="padding: 16px; color: #e2e8f0; font-family: sans-serif; display: flex; flex-direction: column; gap: 14px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 38px; height: 38px; border-radius: 9px; background: linear-gradient(135deg, #0284c7, #38bdf8); display: flex; align-items: center; justify-content: center; font-size: 19px; font-weight: bold; color: #fff; box-shadow: 0 4px 12px rgba(2,132,199,0.35);">⚡</div>
            <div>
              <div style="font-size: 16px; font-weight: 700; color: #fff;">ZrAI Chat</div>
              <div style="font-size: 12px; color: #94a3b8;">v1.3.1 • AI Coding Assistant</div>
            </div>
          </div>
          <p style="font-size: 13px; color: #cbd5e1; line-height: 1.5; margin: 0;">
            ZrAI is your professional AI coding companion with selectable Gemini models, chat history drawer, and uncorrupted code insertion.
          </p>
          <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 6px;">
            <button id="zrai-page-open-chat" style="padding: 12px 16px; background: #0284c7; color: white; border: none; border-radius: 8px; font-size: 13.5px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.2);">
              <span>💬 Open ZrAI Chat Tab (open_custom_tab)</span>
            </button>
            <button id="zrai-page-set-key" style="padding: 10px 16px; background: #27272a; color: #e2e8f0; border: 1px solid #3f3f46; border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer;">
              🔑 Configure Gemini API Key
            </button>
          </div>
          <div style="font-size: 11px; color: #64748b; margin-top: 10px; line-height: 1.6; border-top: 1px solid #333338; pt: 10px;">
            <strong>Commands:</strong> <code>open_custom_tab</code> or <code>zrai_chat</code><br>
            <strong>Shortcut:</strong> <code>Ctrl+Alt+Z</code><br>
            <strong>Author:</strong> Rieaz (rsrieaz4405@gmail.com)
          </div>
        </div>
      `;

            const openBtn = $page.querySelector("#zrai-page-open-chat");
            if (openBtn) {
                openBtn.onclick = () => {
                    this.openChatTab();
                };
            }

            const keyBtn = $page.querySelector("#zrai-page-set-key");
            if (keyBtn) {
                keyBtn.onclick = () => {
                    this.showApiKeyModal();
                };
            }
        } catch (e) {
            console.warn("[ZrAI] Failed to setup plugin page:", e);
        }
    }

    openChatTab() {
        try {
            if (window.editorManager && editorManager.files) {
                const existing = editorManager.files.find(
                    (f) => f.id === this.tabId,
                );
                if (existing) {
                    if (typeof existing.makeActive === "function") {
                        existing.makeActive();
                    } else if (typeof editorManager.switchFile === "function") {
                        editorManager.switchFile(existing.id);
                    }
                    return;
                }
            }

            const EditorFile = acode.require("editorFile");
            if (!EditorFile) {
                const toast = acode.require("toast");
                if (toast)
                    toast("Error: Acode editorFile module not found", 4000);
                return;
            }

            const container = this.buildChatUI();

            this.chatFile = new EditorFile("⚡ ZrAI Chat", {
                id: this.tabId,
                type: "custom",
                isUnsaved: false,
                render: true,
                content: container,
                hideQuickTools: false,
            });

            if (
                this.chatFile &&
                typeof this.chatFile.makeActive === "function"
            ) {
                this.chatFile.makeActive();
            }
        } catch (err) {
            console.error("[ZrAI] Failed to open chat tab:", err);
            const toast = acode.require("toast");
            if (toast)
                toast(
                    "Failed to open ZrAI Chat: " + (err.message || err),
                    4000,
                );
        }
    }

    buildChatUI() {
        const root = document.createElement("div");
        root.className = "zrai-root";
        this.activeRoot = root;

        const scopedStyle = document.createElement("style");
        scopedStyle.textContent = this.getCssContent();
        root.appendChild(scopedStyle);

        const currentModelId = this.getSelectedModel();
        const currentModelName = this.getModelDisplayName(currentModelId);

        // Header: Replace Delete Trash icon with 3-line hamburger menu icon
        const header = document.createElement("div");
        header.className = "zrai-header";
        header.innerHTML = `
      <div class="zrai-header-left">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
        </svg>
        <span class="zrai-brand-title">ZrAI</span>
        <button class="zrai-model-badge-btn" id="zrai-model-badge" title="Click to switch Gemini Model">
          <span id="zrai-model-badge-text">${this.escapeHtml(currentModelName)}</span>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m6 9 6 6 6-6"/></svg>
        </button>
      </div>
      <div class="zrai-header-actions">
        <!-- 3-line hamburger menu icon for Chat History & Sessions -->
        <button class="zrai-icon-btn" id="zrai-btn-menu" title="Chat History & Sessions">
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="3" y1="6" x2="21" y2="6"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
      </div>
    `;
        root.appendChild(header);

        // Chat Box
        const chatBox = document.createElement("div");
        chatBox.className = "zrai-chat-box";
        chatBox.id = "zrai-chat-box";
        root.appendChild(chatBox);

        // Input Area
        const inputArea = document.createElement("div");
        inputArea.className = "zrai-input-area";

        const errBanner = document.createElement("div");
        errBanner.className = "zrai-error-banner";
        errBanner.id = "zrai-error-banner";
        inputArea.appendChild(errBanner);

        const inputRow = document.createElement("div");
        inputRow.className = "zrai-input-row";

        const textarea = document.createElement("textarea");
        textarea.className = "zrai-textarea";
        textarea.id = "zrai-textarea";
        textarea.placeholder = "Message ZrAI... (Enter to send)";
        textarea.rows = 1;

        textarea.addEventListener("input", () => {
            textarea.style.height = "auto";
            textarea.style.height = Math.min(textarea.scrollHeight, 120) + "px";
        });

        const sendBtn = document.createElement("button");
        sendBtn.className = "zrai-send-btn";
        sendBtn.id = "zrai-send-btn";
        sendBtn.title = "Send message";
        sendBtn.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="22" y1="2" x2="11" y2="13"/>
        <polygon points="22 2 15 22 11 13 2 9 22 2"/>
      </svg>
    `;

        inputRow.appendChild(textarea);
        inputRow.appendChild(sendBtn);
        inputArea.appendChild(inputRow);
        root.appendChild(inputArea);

        this.renderCurrentSessionMessages(chatBox);

        const handleSend = () => {
            const text = textarea.value.trim();
            if (!text) return;
            this.sendMessage(text, chatBox, textarea, sendBtn, errBanner, root);
        };

        sendBtn.addEventListener("click", handleSend);

        textarea.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
            }
        });

        header
            .querySelector("#zrai-model-badge")
            .addEventListener("click", () => {
                this.promptModelSelectModal(root);
            });

        header.querySelector("#zrai-btn-menu").addEventListener("click", () => {
            this.openHistoryDrawer(root, chatBox);
        });

        return root;
    }

    renderCurrentSessionMessages(chatBox) {
        chatBox.innerHTML = "";
        const currentSession = this.getActiveSession();
        if (!currentSession.messages || currentSession.messages.length === 0) {
            currentSession.messages = [
                {
                    id: "welcome",
                    sender: "ZrAI",
                    type: "ai",
                    timestamp: "Just now",
                    text: "Hello! How can I assist you with your coding today?",
                },
            ];
        }

        currentSession.messages.forEach((msg) => {
            this.appendMessage(chatBox, msg.sender, msg.text, msg.type, false);
        });

        chatBox.scrollTop = chatBox.scrollHeight;
    }

    openHistoryDrawer(root, chatBox) {
        const existing = root.querySelector("#zrai-history-drawer-overlay");
        if (existing) existing.remove();

        const overlay = document.createElement("div");
        overlay.className = "zrai-drawer-overlay";
        overlay.id = "zrai-history-drawer-overlay";

        const apiKey = localStorage.getItem(this.apiKeyStorageKey) || "";
        const hasKey = Boolean(apiKey);

        const drawer = document.createElement("div");
        drawer.className = "zrai-drawer";

        drawer.innerHTML = `
      <div class="zrai-drawer-header">
        <div class="zrai-drawer-top">
          <span class="zrai-drawer-title">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2.2"><path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="9"/></svg>
            <span>Chat History</span>
          </span>
          <button id="zrai-drawer-close" class="zrai-icon-btn" title="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <!-- 1. API Key configuration button at top of History -->
        <button id="zrai-drawer-key-btn" class="zrai-drawer-api-btn" title="Configure Gemini API Key">
          <span style="display:flex; align-items:center; gap:6px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/></svg>
            <span>Gemini API Key</span>
          </span>
          <span style="font-size:10.5px; padding:2px 7px; border-radius:4px; font-weight:600; ${hasKey ? "background:#065f46; color:#a7f3d0;" : "background:#7f1d1d; color:#fecaca;"}">
            ${hasKey ? "Configured ✓" : "Set Key 🔑"}
          </span>
        </button>

        <!-- 2. + New Chat Button -->
        <button id="zrai-drawer-new-chat" class="zrai-new-chat-btn">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          <span>New Chat</span>
        </button>
      </div>

      <div class="zrai-history-section-title">Saved Conversations</div>
      <div class="zrai-history-list" id="zrai-history-list"></div>
    `;

        overlay.appendChild(drawer);
        root.appendChild(overlay);

        overlay.addEventListener("click", (e) => {
            if (e.target === overlay) overlay.remove();
        });

        drawer
            .querySelector("#zrai-drawer-close")
            .addEventListener("click", () => {
                overlay.remove();
            });

        drawer
            .querySelector("#zrai-drawer-key-btn")
            .addEventListener("click", () => {
                overlay.remove();
                this.promptApiKeyModal(root);
            });

        drawer
            .querySelector("#zrai-drawer-new-chat")
            .addEventListener("click", () => {
                const newSession = this.createFreshSession("New Conversation");
                this.sessions.unshift(newSession);
                this.setActiveSessionId(newSession.id);
                this.saveSessions();
                this.renderCurrentSessionMessages(chatBox);
                overlay.remove();
                const toast = acode.require("toast");
                if (toast) toast("New chat started", 2000);
            });

        // Render session history items
        const listContainer = drawer.querySelector("#zrai-history-list");
        this.renderHistoryListItems(listContainer, overlay, root, chatBox);
    }

    renderHistoryListItems(listContainer, overlay, root, chatBox) {
        listContainer.innerHTML = "";

        this.sessions.forEach((session) => {
            const isCurrent = session.id === this.activeSessionId;
            const item = document.createElement("div");
            item.className = `zrai-history-item ${isCurrent ? "active" : ""}`;
            item.setAttribute("data-id", session.id);

            item.innerHTML = `
        <span class="zrai-history-title" title="${this.escapeHtml(session.title)}">
          ${isCurrent ? "💬 " : "▫️ "}${this.escapeHtml(session.title)}
        </span>
        <div class="zrai-history-actions">
          <button class="zrai-history-btn zrai-opt-btn" title="Options (Rename / Delete)">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
          </button>
        </div>
      `;

            item.addEventListener("click", (e) => {
                if (e.target.closest(".zrai-history-btn")) return;
                this.setActiveSessionId(session.id);
                this.renderCurrentSessionMessages(chatBox);
                overlay.remove();
            });

            let longPressTimer = null;
            const startHold = () => {
                longPressTimer = setTimeout(() => {
                    this.promptSessionActionModal(
                        session,
                        overlay,
                        root,
                        chatBox,
                    );
                }, 500);
            };
            const cancelHold = () => {
                if (longPressTimer) {
                    clearTimeout(longPressTimer);
                    longPressTimer = null;
                }
            };

            item.addEventListener("touchstart", startHold, { passive: true });
            item.addEventListener("touchend", cancelHold);
            item.addEventListener("touchmove", cancelHold);
            item.addEventListener("mousedown", startHold);
            item.addEventListener("mouseup", cancelHold);
            item.addEventListener("mouseleave", cancelHold);

            item.addEventListener("contextmenu", (e) => {
                e.preventDefault();
                cancelHold();
                this.promptSessionActionModal(session, overlay, root, chatBox);
            });

            const optBtn = item.querySelector(".zrai-opt-btn");
            optBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                cancelHold();
                this.promptSessionActionModal(session, overlay, root, chatBox);
            });

            listContainer.appendChild(item);
        });
    }

    promptSessionActionModal(session, drawerOverlay, root, chatBox) {
        const existing = root.querySelector("#zrai-session-action-modal");
        if (existing) existing.remove();

        const actionModalOverlay = document.createElement("div");
        actionModalOverlay.className = "zrai-modal-overlay";
        actionModalOverlay.id = "zrai-session-action-modal";
        actionModalOverlay.style.zIndex = "1100";

        actionModalOverlay.innerHTML = `
      <div class="zrai-modal" style="max-width:360px;">
        <div class="zrai-modal-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
          <span>Chat Options</span>
        </div>
        <p class="zrai-modal-desc">
          Manage "<strong>${this.escapeHtml(session.title)}</strong>":
        </p>

        <div style="display:flex; flex-direction:column; gap:6px;">
          <label style="font-size:11px; color:#94a3b8;">Edit Title:</label>
          <input type="text" id="zrai-rename-input" class="zrai-modal-input" value="${this.escapeHtml(session.title)}" />
        </div>

        <div class="zrai-modal-btns" style="justify-content:space-between; margin-top:8px;">
          <button id="zrai-action-delete" class="zrai-btn-danger" style="display:flex; align-items:center; gap:5px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
            <span>Delete</span>
          </button>
          <div style="display:flex; gap:8px;">
            <button id="zrai-action-cancel" class="zrai-btn-cancel">Cancel</button>
            <button id="zrai-action-save" class="zrai-btn-save">Rename</button>
          </div>
        </div>
      </div>
    `;

        root.appendChild(actionModalOverlay);

        const input = actionModalOverlay.querySelector("#zrai-rename-input");
        const cancelBtn = actionModalOverlay.querySelector(
            "#zrai-action-cancel",
        );
        const saveBtn = actionModalOverlay.querySelector("#zrai-action-save");
        const deleteBtn = actionModalOverlay.querySelector(
            "#zrai-action-delete",
        );

        input.focus();
        input.select();

        cancelBtn.addEventListener("click", () => actionModalOverlay.remove());

        // Rename
        saveBtn.addEventListener("click", () => {
            const newTitle = input.value.trim();
            if (newTitle) {
                session.title = newTitle;
                this.saveSessions();
                const toast = acode.require("toast");
                if (toast) toast("Chat renamed", 2000);
            }
            actionModalOverlay.remove();
            if (drawerOverlay && drawerOverlay.parentNode) {
                const listContainer =
                    drawerOverlay.querySelector("#zrai-history-list");
                if (listContainer)
                    this.renderHistoryListItems(
                        listContainer,
                        drawerOverlay,
                        root,
                        chatBox,
                    );
            }
        });

        // Delete
        deleteBtn.addEventListener("click", () => {
            this.sessions = this.sessions.filter((s) => s.id !== session.id);
            if (this.sessions.length === 0) {
                const fresh = this.createFreshSession();
                this.sessions.push(fresh);
                this.setActiveSessionId(fresh.id);
            } else if (this.activeSessionId === session.id) {
                this.setActiveSessionId(this.sessions[0].id);
            }
            this.saveSessions();
            this.renderCurrentSessionMessages(chatBox);
            actionModalOverlay.remove();

            const toast = acode.require("toast");
            if (toast) toast("Chat deleted", 2000);

            if (drawerOverlay && drawerOverlay.parentNode) {
                const listContainer =
                    drawerOverlay.querySelector("#zrai-history-list");
                if (listContainer)
                    this.renderHistoryListItems(
                        listContainer,
                        drawerOverlay,
                        root,
                        chatBox,
                    );
            }
        });
    }

    promptModelSelectModal(parent) {
        const existing = parent.querySelector("#zrai-model-modal");
        if (existing) existing.remove();

        const overlay = document.createElement("div");
        overlay.className = "zrai-modal-overlay";
        overlay.id = "zrai-model-modal";

        const currentModelId = this.getSelectedModel();

        let optionsHtml = "";
        this.availableModels.forEach((m) => {
            const isSelected = m.id === currentModelId;
            optionsHtml += `
        <div class="zrai-model-option ${isSelected ? "selected" : ""}" data-model-id="${m.id}">
          <div class="zrai-model-opt-header">
            <span class="zrai-model-opt-name">
              ${isSelected ? "✓ " : ""}${this.escapeHtml(m.name)}
            </span>
            <span class="zrai-model-opt-tag">${this.escapeHtml(m.tag)}</span>
          </div>
          <span class="zrai-model-opt-desc">${this.escapeHtml(m.desc)}</span>
          <span class="zrai-model-opt-id">${m.id}</span>
        </div>
      `;
        });

        overlay.innerHTML = `
      <div class="zrai-modal">
        <div class="zrai-modal-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
          <span>Select Gemini Model</span>
        </div>
        <p class="zrai-modal-desc">
          Click on any model to activate it for your ZrAI assistant:
        </p>

        <div class="zrai-model-list" id="zrai-modal-options-container">
          ${optionsHtml}
        </div>

        <div style="margin-top: 6px;">
          <label style="font-size: 11px; color: #94a3b8; display: block; margin-bottom: 4px;">Custom Model ID (Optional):</label>
          <input type="text" id="zrai-custom-model-input" class="zrai-modal-input" placeholder="e.g. gemini-3.8-flash" value="${currentModelId}" />
        </div>

        <div class="zrai-modal-btns">
          <button id="zrai-model-cancel" class="zrai-btn-cancel">Close</button>
          <button id="zrai-model-save-custom" class="zrai-btn-save">Apply Custom Model</button>
        </div>
      </div>
    `;

        parent.appendChild(overlay);

        const closeBtn = overlay.querySelector("#zrai-model-cancel");
        closeBtn.addEventListener("click", () => overlay.remove());

        const optionCards = overlay.querySelectorAll(".zrai-model-option");
        optionCards.forEach((card) => {
            card.addEventListener("click", () => {
                const modelId = card.getAttribute("data-model-id");
                if (modelId) {
                    this.applyModelSelection(modelId, parent);
                    overlay.remove();
                }
            });
        });

        const saveCustomBtn = overlay.querySelector("#zrai-model-save-custom");
        const customInput = overlay.querySelector("#zrai-custom-model-input");
        saveCustomBtn.addEventListener("click", () => {
            const val = customInput.value.trim();
            if (val) {
                this.applyModelSelection(val, parent);
            }
            overlay.remove();
        });
    }

    applyModelSelection(modelId, parent) {
        this.setSelectedModel(modelId);
        const displayName = this.getModelDisplayName(modelId);

        const badgeTextEl = parent.querySelector("#zrai-model-badge-text");
        if (badgeTextEl) {
            badgeTextEl.textContent = displayName;
        }

        const toast = acode.require("toast");
        if (toast) {
            toast(`⚡ ZrAI Model switched to: ${displayName}`, 3000);
        }
    }

    /**
     * Send Message to Selected Gemini Model API with Multi-Turn Memory
     */
    async sendMessage(promptText, chatBox, textarea, sendBtn, errBanner, root) {
        const apiKey = localStorage.getItem(this.apiKeyStorageKey);

        if (!apiKey) {
            this.showError(
                "API Key Missing: Please configure your Gemini API Key.",
                errBanner,
            );
            this.promptApiKeyModal(root);
            return;
        }

        this.hideError(errBanner);

        const session = this.getActiveSession();

        // Auto-update session title from first user prompt if still default
        if (
            session.title === "New Conversation" ||
            session.title.startsWith("New Chat")
        ) {
            const cleanTitle =
                promptText.length > 30
                    ? promptText.substring(0, 30) + "..."
                    : promptText;
            session.title = cleanTitle;
        }

        // 1. Append & store user message
        const userMsgObj = {
            id: "usr_" + Date.now(),
            sender: "You",
            text: promptText,
            type: "user",
            timestamp: new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
            }),
        };
        session.messages.push(userMsgObj);
        session.updatedAt = Date.now();
        this.saveSessions();

        this.appendMessage(chatBox, "You", promptText, "user");
        textarea.value = "";
        textarea.style.height = "auto";

        // 2. Show Loading Indicator
        const typingIndicator = this.createTypingIndicator();
        chatBox.appendChild(typingIndicator);
        chatBox.scrollTop = chatBox.scrollHeight;

        textarea.disabled = true;
        sendBtn.disabled = true;

        const contentsPayload = [];

        session.messages.forEach((m) => {
            if (m.id === "welcome") return;
            contentsPayload.push({
                role: m.type === "user" ? "user" : "model",
                parts: [{ text: m.text }],
            });
        });

        const selectedModel = this.getSelectedModel();
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(selectedModel)}:generateContent?key=${encodeURIComponent(apiKey)}`;

        const payload = {
            system_instruction: {
                parts: [
                    {
                        text: "You are ZrAI, an expert AI programming assistant built for developers using the Android Acode code editor. Answer directly, concisely, and helpfully with high accuracy. When providing code, always use standard markdown fenced code blocks with clear language identifiers (e.g. ```javascript, ```python, ```html, ```css, ```typescript). Write 100% syntactically correct, pristine, uncorrupted code. Never add stray percentage signs, modulus marks, or decorative dividers above or around code blocks. Keep all symbols, quotes, indentation, and characters exact and clean. Always respond naturally in the user's language (Bengali or English).",
                    },
                ],
            },
            contents: contentsPayload,
        };

        try {
            const response = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errMsg =
                    errorData.error?.message ||
                    `HTTP ${response.status}: ${response.statusText}`;
                throw new Error(errMsg);
            }

            const data = await response.json();
            const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!reply) {
                throw new Error("Gemini API returned an empty response.");
            }

            if (typingIndicator.parentNode) {
                typingIndicator.parentNode.removeChild(typingIndicator);
            }

            // Store in session and render
            const aiMsgObj = {
                id: "ai_" + Date.now(),
                sender: "ZrAI",
                text: reply,
                type: "ai",
                timestamp: new Date().toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                }),
            };
            session.messages.push(aiMsgObj);
            session.updatedAt = Date.now();
            this.saveSessions();

            this.appendMessage(chatBox, "ZrAI", reply, "ai");
        } catch (err) {
            console.error("[ZrAI Plugin Error]", err);
            if (typingIndicator.parentNode) {
                typingIndicator.parentNode.removeChild(typingIndicator);
            }

            const toast = acode.require("toast");
            const errText = `Request failed: ${err.message}`;
            if (toast) toast(errText, 4500);
            this.showError(errText, errBanner);

            const errBubble = document.createElement("div");
            errBubble.className = "zrai-msg zrai-msg-ai";
            errBubble.innerHTML = `
        <span class="zrai-sender-label" style="color: #f87171;">ZrAI</span>
        <div class="zrai-bubble" style="background: #450a0a; border-color: #b91c1c; color: #fca5a5;">
          <strong>Request failed:</strong> ${this.escapeHtml(err.message)}<br/>
          Model: <code>${this.escapeHtml(selectedModel)}</code><br/>
          Please check your API key configuration, model availability, and network connection.
        </div>
      `;
            chatBox.appendChild(errBubble);
        } finally {
            textarea.disabled = false;
            sendBtn.disabled = false;
            textarea.focus();
            chatBox.scrollTop = chatBox.scrollHeight;
        }
    }

    appendMessage(chatBox, sender, text, type, shouldScroll = true) {
        const msgDiv = document.createElement("div");
        msgDiv.className = `zrai-msg zrai-msg-${type}`;

        const senderSpan = document.createElement("span");
        senderSpan.className = "zrai-sender-label";
        senderSpan.textContent = sender;
        msgDiv.appendChild(senderSpan);

        const bubble = document.createElement("div");
        bubble.className = "zrai-bubble";

        if (type === "ai") {
            this.renderFormattedContent(bubble, text);
        } else {
            bubble.textContent = text;
        }

        msgDiv.appendChild(bubble);
        chatBox.appendChild(msgDiv);
        if (shouldScroll) {
            chatBox.scrollTop = chatBox.scrollHeight;
        }
    }

    renderFormattedContent(container, rawText) {
        container.innerHTML = "";
        if (!rawText) return;

        let sanitizedText = rawText
            .replace(/^[ \t]*%+[ \t%]*$/gm, "")
            .replace(/[ \t]*%+[ \t%]*\r?\n(?=```)/g, "\n")
            .replace(/```[a-zA-Z0-9_-]*\r?\n[ \t]*%+[ \t%]*/g, (m) =>
                m.replace(/[ \t]*%+[ \t%]*/, ""),
            )
            .replace(/%{2,}/g, "");

        const parts = sanitizedText.split(
            /(```[a-zA-Z0-9_-]*\r?\n[\s\S]*?(?:```|$)|```[\s\S]*?```)/g,
        );

        parts.forEach((part) => {
            if (!part) return;

            if (part.startsWith("```")) {
                let inner = part.replace(/^```/, "");
                if (inner.endsWith("```")) {
                    inner = inner.slice(0, -3);
                }
                const newlineIndex = inner.indexOf("\n");
                let lang = "code";
                let code = inner;

                if (newlineIndex !== -1) {
                    const firstLine = inner.slice(0, newlineIndex).trim();
                    if (
                        firstLine &&
                        !firstLine.includes(" ") &&
                        !firstLine.includes("\n")
                    ) {
                        lang = firstLine;
                        code = inner.slice(newlineIndex + 1);
                    }
                }

                // Clean any stray % lines from start of code block
                code = code.replace(/^[ \t]*%+[ \t%]*\r?\n/gm, "");
                // Clean leading/trailing newlines cleanly without mutating content
                code = code.replace(/^\r?\n+|\r?\n+$/g, "");
                // Normalize any invisible zero-width or non-breaking space artifacts
                code = code
                    .replace(/[\u200B-\u200D\uFEFF]/g, "")
                    .replace(/\u00A0/g, " ");

                const codeBlock = document.createElement("div");
                codeBlock.className = "zrai-code-block";

                const codeHeader = document.createElement("div");
                codeHeader.className = "zrai-code-header";

                const langSpan = document.createElement("span");
                langSpan.className = "zrai-code-lang";
                langSpan.textContent = lang || "code";
                codeHeader.appendChild(langSpan);

                const actionsDiv = document.createElement("div");
                actionsDiv.style.display = "flex";
                actionsDiv.style.alignItems = "center";
                actionsDiv.style.gap = "6px";

                // Copy button
                const copyBtn = document.createElement("button");
                copyBtn.className = "zrai-copy-btn";
                copyBtn.type = "button";
                copyBtn.innerHTML = `
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
          <span>Copy</span>
        `;

                // Direct pure raw-code copying without alteration
                copyBtn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    this.copyToClipboard(code, copyBtn);
                });
                actionsDiv.appendChild(copyBtn);

                // Insert into active editor button
                const insertBtn = document.createElement("button");
                insertBtn.className = "zrai-insert-btn";
                insertBtn.type = "button";
                insertBtn.title = "Insert code into active editor tab";
                insertBtn.innerHTML = `
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>
          <span>Insert</span>
        `;
                insertBtn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    this.insertIntoAcodeEditor(code, insertBtn);
                });
                actionsDiv.appendChild(insertBtn);

                codeHeader.appendChild(actionsDiv);

                const pre = document.createElement("pre");
                pre.className = "zrai-code-content";
                const codeElement = document.createElement("code");
                codeElement.innerHTML = this.highlightSyntax(code, lang);
                pre.appendChild(codeElement);

                codeBlock.appendChild(codeHeader);
                codeBlock.appendChild(pre);
                container.appendChild(codeBlock);
            } else {
                // Text segment: format inline code, bold, italic, line breaks
                const textSpan = document.createElement("span");
                let formatted = this.escapeHtml(part);
                formatted = formatted.replace(
                    /`([^`]+)`/g,
                    '<code style="background: #111113; padding: 2px 6px; border-radius: 4px; font-family: ui-monospace, monospace; color: #fdba74; font-size: 12px;">$1</code>',
                );
                formatted = formatted.replace(
                    /\*\*([^*]+)\*\*/g,
                    '<strong style="color: #ffffff; font-weight: 600;">$1</strong>',
                );
                formatted = formatted.replace(
                    /\*([^*]+)\*/g,
                    '<em style="color: #cbd5e1;">$1</em>',
                );
                formatted = formatted.replace(/\n/g, "<br/>");
                textSpan.innerHTML = formatted;
                container.appendChild(textSpan);
            }
        });
    }

    highlightSyntax(rawCode, language = "") {
        let safe = rawCode
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

        const tokenRegex =
            /(\/\*[\s\S]*?\*\/|\/\/[^\n]*|#[^\n]*|&lt;!--[\s\S]*?--&gt;)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|(\b\d+(?:\.\d+)?(?:px|rem|em|%|vh|vw|ms|s)?\b)|(&lt;\/?[a-zA-Z0-9_-]+(?:\s+[^&>]*?)?&gt;)|(\b(?:const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|try|catch|finally|throw|class|extends|import|export|from|default|new|this|super|async|await|typeof|instanceof|void|yield|interface|type|public|private|protected|static|readonly|def|elif|pass|lambda|with|as|raise|except|struct|enum|package|val|fun|select|insert|update|delete|where|table|echo|print|fn|mut|impl|trait|self|use)\b)|(\b(?:true|false|null|undefined|None|True|False|nil)\b)|(\b[a-zA-Z_$][a-zA-Z0-9_$]*(?=\s*\())|(\b[A-Z][a-zA-Z0-9_$]*\b)/g;

        return safe.replace(
            tokenRegex,
            (match, comment, str, num, tag, kw, bool, func, type) => {
                if (comment)
                    return (
                        '<span class="zrai-hl-comment">' + comment + "</span>"
                    );
                if (str)
                    return '<span class="zrai-hl-string">' + str + "</span>";
                if (num)
                    return '<span class="zrai-hl-number">' + num + "</span>";
                if (tag) {
                    return tag
                        .replace(
                            /(&lt;\/?[a-zA-Z0-9_-]+)/,
                            '<span class="zrai-hl-tag">$1</span>',
                        )
                        .replace(
                            /\b([a-zA-Z0-9_-]+)=/g,
                            '<span class="zrai-hl-attr">$1</span>=',
                        )
                        .replace(
                            /&gt;$/,
                            '<span class="zrai-hl-tag">&gt;</span>',
                        );
                }
                if (kw)
                    return '<span class="zrai-hl-keyword">' + kw + "</span>";
                if (bool)
                    return '<span class="zrai-hl-bool">' + bool + "</span>";
                if (func)
                    return '<span class="zrai-hl-func">' + func + "</span>";
                if (type)
                    return '<span class="zrai-hl-type">' + type + "</span>";
                return match;
            },
        );
    }

    insertIntoAcodeEditor(code, btn) {
        try {
            if (window.editorManager && editorManager.editor) {
                editorManager.editor.insert(code);
                const span = btn.querySelector("span");
                if (span) {
                    const old = span.textContent;
                    span.textContent = "Inserted! ✓";
                    setTimeout(() => {
                        span.textContent = old;
                    }, 2000);
                }
                const toast = acode ? acode.require("toast") : null;
                if (toast) toast("Code inserted into active file", 2000);
                return;
            }
        } catch (e) {
            console.warn("[ZrAI Insert Error]", e);
        }
        // Fallback if no active editor tab is open
        this.copyToClipboard(code, btn);
    }

    copyToClipboard(text, btn) {
        const successFeedback = () => {
            const span = btn ? btn.querySelector("span") : null;
            if (span) {
                const old = span.textContent;
                span.textContent = "Copied! ✓";
                setTimeout(() => {
                    span.textContent = old;
                }, 2200);
            } else if (btn) {
                const old = btn.textContent;
                btn.textContent = "Copied! ✓";
                setTimeout(() => {
                    btn.textContent = old;
                }, 2200);
            }
            try {
                const toast = window.acode ? acode.require("toast") : null;
                if (toast) toast("Code copied to clipboard", 1800);
            } catch (e) {}
        };

        if (
            window.cordova &&
            window.cordova.plugins &&
            window.cordova.plugins.clipboard &&
            typeof window.cordova.plugins.clipboard.copy === "function"
        ) {
            try {
                window.cordova.plugins.clipboard.copy(
                    text,
                    successFeedback,
                    () => {
                        this.fallbackCopy(text, btn, successFeedback);
                    },
                );
                return;
            } catch (err) {
                console.warn("[ZrAI] Cordova clipboard error:", err);
            }
        }

        if (
            navigator.clipboard &&
            typeof navigator.clipboard.writeText === "function"
        ) {
            navigator.clipboard
                .writeText(text)
                .then(successFeedback)
                .catch(() => {
                    this.fallbackCopy(text, btn, successFeedback);
                });
            return;
        }

        this.fallbackCopy(text, btn, successFeedback);
    }

    fallbackCopy(text, btn, callback) {
        try {
            const ta = document.createElement("textarea");
            ta.value = text;
            ta.style.position = "fixed";
            ta.style.left = "0";
            ta.style.top = "0";
            ta.style.width = "2em";
            ta.style.height = "2em";
            ta.style.padding = "0";
            ta.style.border = "none";
            ta.style.outline = "none";
            ta.style.boxShadow = "none";
            ta.style.background = "transparent";
            ta.style.opacity = "0";
            document.body.appendChild(ta);
            ta.focus();
            ta.select();
            ta.setSelectionRange(0, text.length);
            const successful = document.execCommand("copy");
            document.body.removeChild(ta);
            if (successful && callback) callback();
            else if (callback) callback();
        } catch (e) {
            console.warn("[ZrAI Copy Fallback Error]", e);
        }
    }

    createTypingIndicator() {
        const indicator = document.createElement("div");
        indicator.className = "zrai-msg zrai-msg-ai";
        indicator.id = "zrai-typing";
        indicator.innerHTML = `
      <span class="zrai-sender-label">ZrAI</span>
      <div class="zrai-typing-indicator">
        <span class="zrai-dot"></span>
        <span class="zrai-dot"></span>
        <span class="zrai-dot"></span>
        <span style="font-size: 11.5px; color: #94a3b8; margin-left: 6px;">Thinking...</span>
      </div>
    `;
        return indicator;
    }

    showError(message, banner) {
        if (banner) {
            banner.textContent = message;
            banner.style.display = "block";
        }
    }

    hideError(banner) {
        if (banner) {
            banner.style.display = "none";
            banner.textContent = "";
        }
    }

    promptApiKeyModal(parent) {
        const existing = parent.querySelector("#zrai-api-modal");
        if (existing) existing.remove();

        const overlay = document.createElement("div");
        overlay.className = "zrai-modal-overlay";
        overlay.id = "zrai-api-modal";
        overlay.style.zIndex = "1200";

        const currentKey = localStorage.getItem(this.apiKeyStorageKey) || "";

        overlay.innerHTML = `
      <div class="zrai-modal">
        <div class="zrai-modal-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/></svg>
          <span>Configure Gemini API Key</span>
        </div>
        <p class="zrai-modal-desc">
          Enter your Google Gemini API key from Google AI Studio to power the assistant:
        </p>
        <input type="password" id="zrai-key-input" class="zrai-modal-input" placeholder="AIzaSy..." value="${currentKey}" />
        <div class="zrai-modal-btns">
          <button id="zrai-modal-cancel" class="zrai-btn-cancel">Cancel</button>
          <button id="zrai-modal-save" class="zrai-btn-save">Save Key</button>
        </div>
      </div>
    `;

        parent.appendChild(overlay);

        const input = overlay.querySelector("#zrai-key-input");
        const cancelBtn = overlay.querySelector("#zrai-modal-cancel");
        const saveBtn = overlay.querySelector("#zrai-modal-save");

        input.focus();

        cancelBtn.addEventListener("click", () => overlay.remove());

        saveBtn.addEventListener("click", () => {
            const val = input.value.trim();
            if (val) {
                localStorage.setItem(this.apiKeyStorageKey, val);
                const toast = acode.require("toast");
                if (toast) toast("Gemini API Key saved!", 2500);
            } else {
                localStorage.removeItem(this.apiKeyStorageKey);
            }
            overlay.remove();
        });
    }

    escapeHtml(str) {
        return str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    async destroy() {
        try {
            const commands = acode.require("commands");
            if (commands && typeof commands.removeCommand === "function") {
                commands.removeCommand(this.commandName);
                commands.removeCommand("zrai_chat");
                commands.removeCommand("zrai");
            }
        } catch (e) {}

        if (window.acode && typeof acode.removeCommand === "function") {
            try {
                acode.removeCommand(this.commandName);
                acode.removeCommand("zrai_chat");
                acode.removeCommand("zrai");
            } catch (e) {}
        }

        if (
            window.editorManager &&
            editorManager.editor &&
            editorManager.editor.commands
        ) {
            try {
                editorManager.editor.commands.removeCommand(this.commandName);
                editorManager.editor.commands.removeCommand("zrai_chat");
                editorManager.editor.commands.removeCommand("zrai");
            } catch (e) {}
        }

        const style = document.getElementById(this.styleId);
        if (style) style.remove();

        if (window.editorManager && editorManager.files) {
            const chatTab = editorManager.files.find(
                (f) => f.id === this.tabId,
            );
            if (chatTab && typeof chatTab.remove === "function") {
                chatTab.remove();
            }
        }

        try {
            const toast = acode.require("toast");
            if (toast) toast("ZrAI plugin unloaded", 2000);
        } catch (e) {}
    }
}

if (window.acode) {
    const aiPlugin = new AIPlugin();

    const initHandler = async (baseUrl, $page, options) => {
        if (baseUrl && !baseUrl.endsWith("/")) {
            baseUrl += "/";
        }
        aiPlugin.baseUrl = baseUrl;
        await aiPlugin.init($page, options);
    };

    const destroyHandler = async () => {
        await aiPlugin.destroy();
    };

    acode.setPluginInit("com.zr.ai", initHandler);

    if (typeof acode.setPluginUnmount === "function") {
        acode.setPluginUnmount("com.zr.ai", destroyHandler);
    }
}

if (typeof module !== "undefined") {
    module.exports = AIPlugin;
}
