// src/App.tsx
import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from "remark-gfm";
import { useTheme } from "./context/ThemeContext";
import { CodeEditor } from "./components/CodeEditor";
import { ModeToggle, type ViewMode } from "./components/ModeToggle";
import { openFile, saveFile, saveFileAs, isFileSystemSupported } from "./files/fileSystem";
import { getAutoSave, getSavedViewMode, setAutoSave, setSavedViewMode } from "./utils/persistence";
import './App.css';
import { useAutosave } from "./hooks/useAutosave";


function App() {
  // 
  const [content, setContentState] = useState("# Hello Paperling\n\n开始写点什么...");
  const [originalContent, setOriginalContent] = useState("# Hello Paperling\n\n");
  const [fileName, setFileName] = useState<string | null>(null);
  const [viewMode, setViewModeState] = useState<ViewMode>(getSavedViewMode);
 
  const [isAutoSaveEnabled, setIsAutoSaveEnabled] = useState<boolean>(getAutoSave);
  
  const fileHandleRef = useRef<any>(null);
  const { theme, setTheme } = useTheme();

  const contentRef = useRef(content);
  const setContent = (newVal: string) => {
    setContentState(newVal);
    contentRef.current = newVal;
  }

  const isDirty = content !== originalContent;
  const wordCount = content.trim() === "" ? 0 : content.trim().split(/\s+/).length;
  const lineCount = content === "" ? 1 : content.split("\n").length;

  const handleAutoSave = useCallback(async () => {
    const handle = fileHandleRef.current;
    if (!handle) return;

    await saveFile(handle, contentRef.current);
    setOriginalContent(contentRef.current);
  }, []);

  const handleAutoSaveError = useCallback((msg: string) => {
    console.error("[Autosave Error]", msg);
  }, []);

  useAutosave({
    enabled: isAutoSaveEnabled,
    canSave: fileHandleRef.current !== null,
    content,
    originalContent,
    onSave: handleAutoSave,
    onError: handleAutoSaveError
  });

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
      console.error("open file error:", err);
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
      console.error("save failed:", err);
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
      console.error("save as failed:", err);
    }
  };

  const setViewMode = (m: ViewMode) => {
    setViewModeState(m);
    setSavedViewMode(m);
  }

  const toggleAutoSave = (checked: boolean) => {
    setIsAutoSaveEnabled(checked);
    setAutoSave(checked);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrl = e.ctrlKey || e.metaKey;
      if (isCtrl && e.key.toLowerCase() === "o") { e.preventDefault(); handleOpen(); }
      if (isCtrl && !e.shiftKey && e.key.toLowerCase() === "s") { e.preventDefault(); handleSave(); }
      if (isCtrl && e.shiftKey && e.key.toLowerCase() === "s") { e.preventDefault();handleSaveAs(); }
      if (e.ctrlKey && e.key.toLowerCase() === "e") { 
        e.preventDefault(); 
        setViewMode(viewMode === "code" ? "reader" : "code"); 
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [content, fileName, viewMode]);

  
  useEffect(() => {
    document.title = (isDirty ? "● " : "") + (fileName ?? "Untitled.md") + " - paperling";
  }, [isDirty, fileName]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  });

  return (
    <div className="app">
      <div className="panes">
        {(viewMode === "code" || viewMode === "split") && (
          <div className="pane-wrapper" style={{ width: viewMode === "split" ? "50%" : "100%" }}>
            <CodeEditor content={content} onChange={setContent} />
          </div>
        )}

        {(viewMode === "reader" || viewMode === "split") && (
          <div
            className="preview"
            style={{
              width: viewMode === "split" ? "50%" : "100%",
              borderLeft: viewMode === "split" ? "1px solid var(--border)" : "none"
            }}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {content}
            </ReactMarkdown>
          </div>
        )}
      </div>
      <div className="statusbar">
        <ModeToggle mode={viewMode} onChange={setViewMode} />

        <div className="statusbar-file">
          {isFileSystemSupported ? (
            <button className="statusbar-btn" onClick={handleOpen}>📁 打开</button>
          ): (
            <span style={{ color: "var(--text-muted)" }}>🚫 浏览器不支持本地 I/O</span>
          )}
          <span className="file-name-display" onClick={handleSave} style={{ cursor: "pointer" }}>
            {isDirty ? "● ": ""}
            {fileName ?? "Untitle.md"}
          </span>

          <span
            className="save-status-badge"
            style={{ color: isDirty ? "var(--status-unsaved)" : "var(--status-saved)" }}
          >
            {isDirty ? "● Unsaved" : "✓ Saved"}
          </span>
        </div>

        <div className="statusbar-configs">
          <label className="config-label">
            <input
              type="checkbox"
              checked={isAutoSaveEnabled}
              onChange={(e) => toggleAutoSave(e.target.checked)}
            />
            <span>AUTO</span>
          </label>
        </div>

        <button className="theme-toggle-btn" onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
          主题: {theme === "light" ? "🌙 Dark" : "☀️ Light"}
        </button>
        <div className="statusbar-item">Rows: {lineCount}</div>
        <div className="statusbar-item">Words: {wordCount}</div>
      </div>
    </div>
  );
}

export default App;