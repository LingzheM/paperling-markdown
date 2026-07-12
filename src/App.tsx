import { useEffect, useState } from "react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from "remark-gfm";
import { useTheme } from "./context/ThemeContext";
import './App.css';
import { CodeEditor } from "./components/CodeEditor";
import { ModeToggle, type ViewMode } from "./components/ModeToggle";

function App() {
  const [content, setContent] = useState("# Hello Paperling\n\n开始写点什么...");
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const { theme, setTheme } = useTheme();

  const wordCount = content.trim() === "" ? 0 : content.trim().split(/\s+/).length;
  const lineCount = content === "" ? 1 : content.split("\n").length;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === "e") {
        e.preventDefault();
        setViewMode((currentMode) => {
          if (currentMode === "code") return "reader";
          return "code";
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [viewMode]);

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
        <button
         className="theme-toggle-btn"
         onClick={() => setTheme(theme === "light" ? "dark" : "light")}
        >
          主题: {theme === "light" ? "🌙 Dark" : "☀️ Light"}
        </button>
        <div className="statusbar-item">Rows: {lineCount}</div>
        <div className="statusbar-item">Words: {wordCount}</div>
      </div>
    </div>
  );
}

export default App;