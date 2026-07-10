
// ============ 阶段 1：块级解析（按行） ============
// 逐行状态机
// 唯一需要“记住状态”的是 ``` 代码块

type Block =
  | { type: "heading"; depth: number; text: string }
  | { type: "paragraph"; text: string }
  | { type: "codeBlock"; lang: string; code: string }
  | { type: "listItem"; text: string };

export function parseBlocks(md: string): Block[] {
  const lines = md.split("\n");
  const blocks: Block[] = [];
  let incode = false;
  let codeBuf: string[] = [];
  let codeLang = "";

  for (const line of lines) {
    if (line.startsWith("```")) {
      if (!incode) {
        incode = true;
        codeLang = line.slice(3).trim();
        codeBuf = [];
      } else {
        incode = false;
        blocks.push({ type:"codeBlock", lang:codeLang, code:codeBuf.join("\n") });
      }
      continue;
    }
    if (incode) { codeBuf.push(line);continue; }

    const h = line.match(/^(#{1,6}) (.*)$/);
    if (h) { blocks.push({ type:"heading", depth:h[1].length, text:h[2] }); continue; }

    // 无序列表
    const listMatch = line.match(/^(-) (.*)$/);
    if (listMatch) { blocks.push({ type: "listItem", text: listMatch[1] }); continue; }

    // 空行
    if (line.trim() === "") { continue; }

    // 相邻的 paragraph 行应该合并成一段
    const lastBlock = blocks[blocks.length - 1];
    if (lastBlock && lastBlock.type === "paragraph") {
      lastBlock.text += "\n" + line.trim();
    } else {
      blocks.push({ type: "paragraph", text: line.trim() });
    }
  }
  return blocks;
}

// ============ 阶段 2：行内解析 ============
