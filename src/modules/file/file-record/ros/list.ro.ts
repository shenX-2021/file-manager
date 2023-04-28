import { FileEntity } from '../../../../entities';

export interface ListRo {
  pageNumber: number;
  pageSize: number;
  total: number;
  list: FileEntity[];
}
