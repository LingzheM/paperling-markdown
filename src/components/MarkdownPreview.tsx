import ReactMarkdown, { defaultUrlTransform } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import 'katex/dist/katex.min.css';
import React, { useState } from 'react';

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

  return <StandardCodeBlock codeText={codeText} className={className} originalPreprops={rest} children={children} />;
}

function StandardCodeBlock({ codeText, className, originalPreprops, children }: any) {
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
  return (
    <div className='mermaid-block-holder'>
      <div className="mermaid-badge">📊 Mermaid 图表已拦截</div>
      <pre className='mermaid-code-preview'><code>{code}</code></pre>
    </div>
  );
}