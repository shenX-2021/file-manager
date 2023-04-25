export interface HashListData {
  hash: string;
  startHash: string;
  endHash: string;
  size: number;
}

export class HashList {
  static MAX_LENGTH = 50;

  private list: HashListData[] = [];

  add(data: HashListData) {
    if (this.list.length >= HashList.MAX_LENGTH) this.list.shift();

    this.list.push(data);
  }

  find(
    startHash: string,
    endHash: string,
    size: number,
  ): HashListData | undefined {
    return this.list.find(
      (item) =>
        item.startHash === startHash &&
        item.endHash === endHash &&
        item.size === size,
    );
  }

  clear() {
    this.list = [];
  }

  get length() {
    return this.list.length;
  }
}

export const hashList = new HashList();
