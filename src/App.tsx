// src/App.tsx
import { useState, useEffect, useRef, useCallback } from "react";
import { useTheme } from "./context/ThemeContext";
import { CodeEditor } from "./components/CodeEditor";
import { ModeToggle, type ViewMode } from "./components/ModeToggle";
import { MarkdownPreview } from "./components/MarkdownPreview";
import { openFile, saveFile, saveFileAs, isFileSystemSupported } from "./files/fileSystem";
import { getSavedViewMode, setSavedViewMode, getAutoSave, setAutoSave } from "./utils/persistence";
import { useAutosave } from "./hooks/useAutosave";
import { useDebouncedValue } from "./hooks/useDebouncedValue";
import "./App.css";

function App() {
  const [content, setContentState] = useState("# Hello Paperling\n\n自动保存已就绪…");
  const [originalContent, setOriginalContent] = useState("# Hello Paperling\n\n自动保存已就绪…");
  const [fileName, setFileName] = useState<string | null>(null);
  const [viewMode, setViewModeState] = useState<ViewMode>(getSavedViewMode);
  
  // ★ C3. 自动保存开关状态（惰性初始化）
  const [isAutoSaveEnabled, setIsAutoSaveEnabled] = useState<boolean>(getAutoSave);
  
  // ★ 不变量：fileHandleRef.current 和 fileName 永远同生共死——
  //   handleOpen/handleSaveAs 里两个一起设，初始值也一起是 null，从不单独改其中一个。
  //   所以任何只是想知道"当前有没有打开的文件"的地方，用 fileName !== null 就够，
  //   不需要（也不该在渲染期间）去读 ref。
  const fileHandleRef = useRef<FileSystemFileHandle | null>(null);
  const { theme, setTheme } = useTheme();

  // -----------------------------------------------------------------
  // ★ C2. 最新值引用快照网卡（破除闭包与依赖波动的关键）
  // -----------------------------------------------------------------
  const contentRef = useRef(content);
  
  // 接管 setContent，顺手把值同步进快照盒子里
  const setContent = (newVal: string) => {
    setContentState(newVal);
    contentRef.current = newVal;
  };

  const isDirty = content !== originalContent;
  const wordCount = content.trim() === "" ? 0 : content.trim().split(/\s+/).length;
  const lineCount = content === "" ? 1 : content.split("\n").length;

  // ★ 思想 2：打字的关键路径（编辑器）继续吃 content，零延迟；
  //   预览吃这个滞后 300ms 的副本，把 KaTeX/highlight/整棵树重算挪出打字热路径。
  const debouncedContent = useDebouncedValue(content, 300);

  // -----------------------------------------------------------------
  // ★ C2. handleAutoSave 的接线：引用绝对固定的回调
  // -----------------------------------------------------------------
  const handleAutoSave = useCallback(async () => {
    const handle = fileHandleRef.current;
    // 自动保存必须有在手的文件句柄（网页版安全限制，不能凭空自动弹窗惊扰用户）
    if (!handle) return; 
    
    // 核心：从 contentRef 兜里摸出此时此刻最新的文本落盘
    await saveFile(handle, contentRef.current);
    setOriginalContent(contentRef.current);
  }, []);

  const handleAutoSaveError = useCallback((msg: string) => {
    console.error("[Autosave Error]", msg);
  }, []);

  // 挂载自动保存核心 Hook
  useAutosave({
    enabled: isAutoSaveEnabled,
    canSave: fileName !== null, // 必须有打开的文件（fileName 和 fileHandleRef 同生共死，渲染期不读 ref）
    content,
    originalContent,
    onSave: handleAutoSave,
    onError: handleAutoSaveError
  });

  // -----------------------------------------------------------------
  // 传统手动保存与打开流程
  // -----------------------------------------------------------------
  const handleOpen = async () => {
    if (!isFileSystemSupported) return;
    try {
      const fileData = await openFile();
      if (!fileData) return;
      setContent(fileData.content);
      setOriginalContent(fileData.content);
      setFileName(fileData.name);
      fileHandleRef.current = fileData.handle;
    } catch (err) {
      alert("打开文件失败");
    }
  };

  const handleSave = async () => {
    if (!isFileSystemSupported) return;
    try {
      if (fileHandleRef.current) {
        await saveFile(fileHandleRef.current, content);
        setOriginalContent(content);
      } else {
        await handleSaveAs();
      }
    } catch (err) {
      alert("保存失败");
    }
  };

  const handleSaveAs = async () => {
    if (!isFileSystemSupported) return;
    try {
      const fileData = await saveFileAs(content, fileName ?? "Untitled.md");
      if (!fileData) return;
      setOriginalContent(content);
      setFileName(fileData.name);
      fileHandleRef.current = fileData.handle;
    } catch (err) {
      alert("另存为失败");
    }
  };

  const setViewMode = (m: ViewMode) => {
    setViewModeState(m);
    setSavedViewMode(m);
  };

  const toggleAutoSave = (checked: boolean) => {
    setIsAutoSaveEnabled(checked);
    setAutoSave(checked);
  };

  // 快捷键卡网
  // ★ 最新值引用快照（同 CodeEditor.tsx 的 onChangeRef 套路）：
  // 把每次渲染最新的闭包塞进 ref，注册 effect 的依赖数组彻底清空，
  // 避免 addEventListener/removeEventListener 随 content 按键抖动重跑。
  const shortcutHandlersRef = useRef({ handleOpen, handleSave, handleSaveAs, viewMode, setViewMode });
  useEffect(() => {
    shortcutHandlersRef.current = { handleOpen, handleSave, handleSaveAs, viewMode, setViewMode };
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrl = e.ctrlKey || e.metaKey;
      const { handleOpen, handleSave, handleSaveAs, viewMode, setViewMode } = shortcutHandlersRef.current;
      if (isCtrl && e.key.toLowerCase() === "o") { e.preventDefault(); handleOpen(); }
      if (isCtrl && !e.shiftKey && e.key.toLowerCase() === "s") { e.preventDefault(); handleSave(); }
      if (isCtrl && e.shiftKey && e.key.toLowerCase() === "s") { e.preventDefault(); handleSaveAs(); }
      if (isCtrl && e.key.toLowerCase() === "e") {
        e.preventDefault();
        setViewMode(viewMode === "code" ? "reader" : "code");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // 标题联动
  useEffect(() => {
    document.title = (isDirty ? "● " : "") + (fileName ?? "Untitled.md") + " — Paperling";
  }, [isDirty, fileName]);

  // 关闭/刷新前拦截未保存的改动
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  return (
    <div className="app">
      <div className="panes">
        {(viewMode === "code" || viewMode === "split") && (
          <div className="pane-wrapper" style={{ width: viewMode === "split" ? "50%" : "100%" }}>
            <CodeEditor content={content} onChange={setContent} />
          </div>
        )}
        {(viewMode === "reader" || viewMode === "split") && (
          <div className="preview" style={{ width: viewMode === "split" ? "50%" : "100%", borderLeft: viewMode === "split" ? "1px solid var(--border)" : "none" }}>
            <MarkdownPreview content={debouncedContent} />
          </div>
        )}
      </div>

      <div className="statusbar">
        <ModeToggle mode={viewMode} onChange={setViewMode} />
        
        <div className="statusbar-file">
          {isFileSystemSupported ? (
            <button className="statusbar-btn" onClick={handleOpen}>📁 打开</button>
          ) : (
            <span style={{ color: "var(--text-muted)" }}>🚫 不支持本地 IO</span>
          )}
          <span className="file-name-display">
            {fileName ?? "Untitled.md"}
          </span>

          {/* ★ C4. 工业级强化的状态指示灯 */}
          <span 
            className="save-status-badge"
            style={{ color: isDirty ? "var(--status-unsaved)" : "var(--status-saved)" }}
          >
            {isDirty ? "● Unsaved" : "✓ Saved"}
          </span>
        </div>

        {/* ★ C3. 临时高级配置面板 */}
        <div className="statusbar-configs">
          <label className="config-label">
            <input 
              type="checkbox" 
              checked={isAutoSaveEnabled} 
              onChange={(e) => toggleAutoSave(e.target.checked)}
            />
            <span>自动落盘</span>
          </label>
        </div>

        <button className="theme-toggle-btn" onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
          主题: {theme === "light" ? "🌙 Dark" : "☀️ Light"}
        </button>
        <div className="statusbar-item">Lines: {lineCount}</div>
        <div className="statusbar-item">Words: {wordCount}</div>
      </div>
    </div>
  );
}

export default App;