import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import mermaid from 'mermaid';
import 'katex/dist/katex.min.css';
import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from '../context/ThemeContext';

const SANITIZE_SCHEMA = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    span: [...(defaultSchema.attributes?.span ?? []),
            ["className", "math", "math-inline", "math-display"]],
    div: [...(defaultSchema.attributes?.div ?? []),
            ["className", "math", "math-inline", "math-display"]],
  },
} as typeof defaultSchema;

const REMARK_PLUGINS = [remarkGfm, remarkMath];
const REHYPE_PLUGINS = [
  rehypeRaw,    // 1. 解析用户内联 HTML（引入不可信节点）
  [rehypeSanitize, SANITIZE_SCHEMA],  // 2. 紧跟消毒（安全边界核心）
  rehypeKatex,  // 3. 消毒后运行可信生成器
  [rehypeHighlight, { detect: false }],   // 4. 不做猜测的高亮
];

interface Props {
  content: string;
}

export function MarkdownPreview({ content }: Props) {
  return (
    <div className='preview'>
      <ReactMarkdown
        remarkPlugins={REMARK_PLUGINS}
        rehypePlugins={REHYPE_PLUGINS as never}
        components={{
          pre: CodeBlock,
          a: ({ href, children }) => {
            const isExternal = href?.startsWith("http://") || href?.startsWith("https://");
            return (
              <a
                href={href}
                target={isExternal ? "_blank" : undefined}
                rel={isExternal ? "noopener noreferrer" : undefined}
              >
                {children}
              </a>
            );
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

function CodeBlock({ children, ...rest}: React.HTMLAttributes<HTMLPreElement>) {
  const codeElement = React.Children.toArray(children).find(
    (child) => React.isValidElement(child) && child.type === "code"
  );

  if (!React.isValidElement(codeElement)) {
    return <pre {...rest}>{children}</pre>
  }

  const className = (codeElement.props as any).className || "";
  const codeText = String((codeElement.props as any).children || "").trim();
  const isMermaid = className.includes("language-mermaid");

  if (isMermaid) {
    return <MermaidBlock code={codeText} />;
  }

  return <StandardCodeBlock codeText={codeText} originalPreprops={rest} children={children} />;
}

function StandardCodeBlock({ codeText, originalPreprops, children }: any) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codeText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("复制失败:", err);
    }
  };

  return (
    <div className='code-block-wrapper' style={{ position: "relative" }}>
      <button
        className={`copy-btn ${copied ? "copied" : ""}`}
        onClick={handleCopy}
        title='复制代码'
      >
        {copied ? "✓ 已复制" : "📋 复制"}
      </button>
      <pre {...originalPreprops}>{children}</pre>
    </div>
  );
}

function MermaidBlock({ code }: { code: string }) {
  const { theme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    // ★ mermaid 的图表可以带可点击链接/tooltip，securityLevel: "strict" 关掉那部分潜在的注入面，
    //   跟思想 1 的消毒精神保持一致。每次渲染前重新 initialize 是切主题的官方推荐做法。
    mermaid.initialize({ startOnLoad: false, securityLevel: "strict", theme: theme === "dark" ? "dark" : "default" });

    // id 必须每次渲染都换一个新的：mermaid.render 会往 DOM 里插临时节点，
    // 复用同一个 id 在 StrictMode 的双调用下会撞车。
    const id = `mermaid-${Math.random().toString(36).slice(2)}`;

    mermaid.render(id, code)
      .then(({ svg }) => {
        if (cancelled || !containerRef.current) return;
        setError(null);
        containerRef.current.innerHTML = svg;
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
      });

    return () => { cancelled = true; };
  }, [code, theme]);

  if (error) {
    return (
      <div className="mermaid-block-holder">
        <div className="mermaid-badge">⚠️ Mermaid 渲染失败：{error}</div>
        <pre className="mermaid-code-preview"><code>{code}</code></pre>
      </div>
    );
  }

  return <div className="mermaid-diagram" ref={containerRef} />;
}