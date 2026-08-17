// Gói không kèm sẵn type declaration -- khai báo tối thiểu đúng phần API
// thực tế dùng trong src/lib/reports/generate-docx.ts (đối chiếu trực tiếp
// node_modules/docxtemplater-image-module-free/js/index.js, không đoán).
declare module "docxtemplater-image-module-free" {
  export interface ImageModuleOptions {
    centered?: boolean;
    getImage: (tagValue: string, tagName: string) => ArrayBuffer;
    getSize: (imgBuffer: ArrayBuffer, tagValue: string, tagName: string) => [number, number];
  }

  export default class ImageModule {
    constructor(options: ImageModuleOptions);
  }
}
