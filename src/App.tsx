import { useState } from "react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from "remark-gfm";
import './App.css';

function App() {
  const [content, setContent] = useState("# Hello Paperling\n\n开始写点什么...");

  const wordCount = content.trim() === "" ? 0 : content.trim().split(/\s+/).length;

  return (
    <div className="app">
      <div className="panes">
        <textarea
          className="editor"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          />
          <div className="preview">
            <ReactMarkdown remarkPlugins={{remarkGfm}}>
              {content}
            </ReactMarkdown>
          </div>
      </div>
      <div className="statusbar">

      </div>
    </div>
  );
}

export default App;