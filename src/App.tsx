import { useState } from "react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from "remark-gfm";
import { useTheme } from "./context/ThemeContext";
import './App.css';

function App() {
  const [content, setContent] = useState("# Hello Paperling\n\n开始写点什么...");
  const { theme, setTheme } = useTheme();

  const wordCount = content.trim() === "" ? 0 : content.trim().split(/\s+/).length;
  const lineCount = content === "" ? 1 : content.split("\n").length;

  return (
    <div className="app">
      <div className="panes">
        <textarea
          className="editor"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          // 关闭浏览器自带的拼写检查
          spellCheck={false}
          placeholder="开始你的写作..."
          />
          <div className="preview">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {content}
            </ReactMarkdown>
          </div>
      </div>
      <div className="statusbar">
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