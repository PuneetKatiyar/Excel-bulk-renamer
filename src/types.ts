export interface ExcelFile {
  id: string;
  file: File;
  originalName: string;
  newName: string;
  extension: string;
  status: "pending" | "processing" | "success" | "error";
  error?: string;
  data?: any[]; // First few rows for preview
  headers?: string[];
  workbookTitle?: string;
  addedAt: number;
}

export type RenameMethod = 
  | "prefix"
  | "suffix"
  | "replace"
  | "remove"
  | "sequential"
  | "uppercase"
  | "lowercase"
  | "titlecase"
  | "datetime"
  | "cell_value"
  | "ai";

export interface RenameConfig {
  method: RenameMethod;
  prefixStr?: string;
  suffixStr?: string;
  searchStr?: string;
  replaceStr?: string;
  removeStr?: string;
  seqStart?: number;
  seqSeparator?: string;
  seqPosition?: "prefix" | "suffix" | "replace";
  cellRef?: string;
  datetimeFormat?: string;
}
