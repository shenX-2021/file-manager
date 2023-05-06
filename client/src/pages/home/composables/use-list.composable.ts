import { reactive } from 'vue';
import {
  FileRecordData,
  fileRecordListApi,
  FileRecordListFormData,
} from '@src/http/apis';

const listState = reactive<{
  formData: FileRecordListFormData;
  list: FileRecordData[];
  loadingList: boolean[];
  total?: number;
}>({
  formData: {
    pageSize: 9999,
    pageNumber: 1,
  },
  list: [],
  loadingList: [],
});

async function getList() {
  const res = await fileRecordListApi(listState.formData);
  listState.total = res.total;
  listState.list = res.list;
  listState.loadingList = res.list.map(() => false);
}

export function useList() {
  return {
    listState,
    getList,
  };
}
