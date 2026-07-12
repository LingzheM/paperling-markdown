// src/components/CodeEditor.tsx
import { useEffect, useRef } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap, lineNumbers, highlightActiveLine } from "@codemirror/view";
import { history, defaultKeymap, historyKeymap } from "@codemirror/commands";
import { markdown } from "@codemirror/lang-markdown";
import { syntaxHighlighting, HighlightStyle } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";

interface Props {
  content: string;
  onChange: (content: string) => void;
}

// ★ 配色全部指向 Part A 定义的 CSS 变量。
const editorTheme = EditorView.theme({
  "&": { height: "100%", backgroundColor: "var(--bg-editor)", color: "var(--text-primary)" },
  "&.cm-focused": { outline: "none" }, // 去掉 CodeMirror 默认的聚焦外边框
  ".cm-content": { caretColor: "var(--accent)", fontFamily: "monospace", padding: "20px 0" },
  ".cm-gutters": { backgroundColor: "var(--bg-editor)", color: "var(--text-muted)", border: "none", minWidth: "35px", padding: "20px 0 20px 10px" },
  ".cm-activeLine": { backgroundColor: "var(--bg-hover)" },
  ".cm-activeLineGutter": { backgroundColor: "var(--bg-hover)", color: "var(--text-primary)" },
  
  // ★ 补全 TODO：用极其优雅的透明度或 hover 变量定义选区背景色
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": { 
    backgroundColor: "var(--bg-hover) !important" 
  }
});

// ★ 补全 TODO：定义完备的 Markdown 语法高亮
const mdHighlight = HighlightStyle.define([
  { tag: t.heading1, color: "var(--syntax-h1)", fontWeight: "bold", fontSize: "1.4em" },
  { tag: t.heading2, color: "var(--syntax-h1)", fontWeight: "bold", fontSize: "1.2em" },
  { tag: t.heading3, color: "var(--syntax-h1)", fontWeight: "bold", fontSize: "1.1em" },
  { tag: t.strong, color: "var(--syntax-bold)", fontWeight: "bold" },
  { tag: t.emphasis, fontStyle: "italic" },
  { tag: t.link, color: "var(--syntax-link)", textDecoration: "underline" },
  { tag: t.monospace, color: "var(--syntax-code)" },
  { tag: t.quote, color: "var(--syntax-quote)", fontStyle: "italic" },
  { tag: t.list, color: "var(--accent)", fontWeight: "bold" }, // 无序/有序列表符号
]);

export function CodeEditor({ content, onChange }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);   // 编辑器挂载点
  const viewRef = useRef<EditorView | null>(null); // "使馆"本体
  const lastEmittedRef = useRef(content);          // 防回声记录器

  // ★ 破局关键（解密思考题 2）：用 ref 永远保持对最新 onChange 的引用，
  // 从而允许建馆 Effect 的依赖数组彻底留空 []，完美避免因绑死旧 onChange 产生的闭包陷阱。
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // ---- 建馆（挂载时仅一次）----
  useEffect(() => {
    if (!hostRef.current) return;
    const view = new EditorView({
      state: EditorState.create({
        doc: content,
        extensions: [
          lineNumbers(),
          highlightActiveLine(),
          history(),
          keymap.of([...defaultKeymap, ...historyKeymap]),
          markdown(),
          syntaxHighlighting(mdHighlight),
          editorTheme,
          EditorView.lineWrapping,
          // ---- 出方向：编辑器 → React ----
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              const doc = update.state.doc.toString();
              lastEmittedRef.current = doc;  // 先记账
              onChangeRef.current(doc);     // 再上报，使用安全引用
            }
          }),
        ],
      }),
      parent: hostRef.current,
    });
    viewRef.current = view;
    return () => { view.destroy(); viewRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- 入方向：React → 编辑器 ----
  useEffect(() => {
    if (content === lastEmittedRef.current) return; // 回声阻断
    const view = viewRef.current;
    if (!view) return;
    if (content !== view.state.doc.toString()) {
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: content } });
    }
    lastEmittedRef.current = content;
  }, [content]);

  return <div ref={hostRef} style={{ height: "100%", overflow: "hidden" }} />;
}