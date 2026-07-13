export interface FileData {
  name: string;
  content: string;
  handle: FileSystemFileHandle;
  lastModified: number;
}

export const isFileSystemSupported =
  typeof window !== "undefined" && "showOpenFilePicker" in window;

const FILE_PICKER_OPTIONS = {
  types: [
    {
      "description": "Markdown ",
      "accept": {
        "text/markdown": [".md", ".markdown"],
        "text/plain": [".txt"]
      }
    }
  ]
};

export async function openFile(): Promise<FileData | null> {
  try {
    const [handle] = await window.showOpenFilePicker(FILE_PICKER_OPTIONS);
    const file = await handle.getFile();
    return {
      name: file.name,
      content: await file.text(),
      handle,
      lastModified: file.lastModified,
    };
  } catch (err) {
    if ((err as DOMException).name === "AbortError") return null;
    throw err;
  }
}

export async function saveFile(handle: any, content: string): Promise<number> {
  const fileHandle = handle as FileSystemFileHandle;
  const writable = await fileHandle.createWritable();
  await writable.write(content);
  await writable.close();

  const file = await fileHandle.getFile();
  return file.lastModified;
}

export async function saveFileAs(
  content: string, 
  suggestedName = "Untitled.md"
): Promise<FileData | null> {
  try {
    const handle = await window.showSaveFilePicker({
      suggestedName,
      ...FILE_PICKER_OPTIONS
    });

    const lastModified = await saveFile(handle, content);

    return {
      name: handle.name,
      content,
      handle,
      lastModified
    };
  } catch (err) {
    if((err as DOMException).name === "AbortError") return null;
    throw err;
  }
}