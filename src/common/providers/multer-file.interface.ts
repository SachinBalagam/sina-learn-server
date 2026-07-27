export interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
  stream?: any;
  destination?: string;
  filename?: string;
  path?: string;
}
