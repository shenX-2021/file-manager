import streamSaver from 'streamsaver';

/**
 * 流式下载，支持大文件
 */
export function download(id: number, filename: string) {
  const url = `/fm/api/file/download/${id}`;
  const fileStream = streamSaver.createWriteStream(filename);

  fetch(url).then((res) => {
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
