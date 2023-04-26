interface WithoutUploadData {
  needUpload: false;
}
interface NeedUploadData {
  needUpload: true;
  uploadedList: string[];
}
interface SuccessRo {
  code: 0;
  data?: WithoutUploadData | NeedUploadData;
}

interface ChangeNameRo {
  code: 1;
  message: string;
  data: {
    id: number;
    originFileName: string;
  };
}

export type VerifyRo = SuccessRo | ChangeNameRo;
