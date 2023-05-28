import streamSaver from 'streamsaver';
import { ElMessage } from 'element-plus/es';

/**
 * 流式下载，支持大文件
 */
export function downloadByStream(id: number, filename: string) {
  const url = `/fm/api/file/download/${id}`;
  const fileStream = streamSaver.createWriteStream(filename);

  fetch(url).then(async (res) => {
    if (res.status !== 200) {
      ElMessage({
        message: (await res.json()).message,
        type: 'error',
      });
    }
    const readableStream = res.body;

    // more optimized
    if (window.WritableStream && readableStream?.pipeTo) {
      return readableStream.pipeTo(fileStream);
    }

    const writer = fileStream.getWriter();

    const reader = res.body?.getReader();
    const pump = () =>
      reader
        ?.read()
        .then((res) =>
          res.done ? writer.close() : writer.write(res.value).then(pump),
        );

    pump();
  });
}

/**
 * 下载文件
 */
export function download(id: number, filename: string) {
  const url = `/fm/api/file/download/${id}`;
  const a = document.createElement('a');
  a.style.display = 'none';
  a.download = filename;
  a.href = url;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * 复制
 */
export async function copy(text: string) {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text);
  } else {
    const textarea = document.createElement('textarea');
    textarea.setAttribute('readonly', 'readonly');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
}

/**
 * 防抖函数处理
 */
export function debounce(fn: (...args) => void, timestamp = 300) {
  let timer;

  return (...args) => {
    clearTimeout(timer);

    timer = setTimeout(() => {
      fn(...args);
    }, timestamp);
  };
}

/**
 * 体积大小转换
 */
const sizeUnitList = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
export function transformByte(byte: number): string {
  let index = 0;
  while (byte >= 1024) {
    byte /= 1024;
    index++;
  }

  return byte.toFixed(2).replace(/\.0{1,2}$/, '') + ' ' + sizeUnitList[index];
}
