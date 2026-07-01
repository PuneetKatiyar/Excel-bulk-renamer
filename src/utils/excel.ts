import * as XLSX from "xlsx";
import { ExcelFile } from "../types";

// Maximum rows to parse per file for preview and AI
const MAX_PREVIEW_ROWS = 5;

export const parseExcelFile = (file: File): Promise<Partial<ExcelFile>> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "binary", cellText: false, cellDates: true });
        
        let headers: string[] = [];
        let firstRow: any = null;
        let sheetName = "";

        if (workbook.SheetNames.length > 0) {
          sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          if (jsonData.length > 0) {
            headers = (jsonData[0] as string[]).map(String);
          }
          if (jsonData.length > 1) {
             const rowsObject = XLSX.utils.sheet_to_json(worksheet);
             firstRow = rowsObject[0];
          }
        }

        resolve({
          headers,
          data: firstRow ? [firstRow] : [],
          workbookTitle: sheetName
        });
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (err) => reject(err);
    reader.readAsBinaryString(file);
  });
};

export const getCellValue = async (file: File, cellRef: string): Promise<string> => {
   return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        if (workbook.SheetNames.length > 0) {
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const cell = worksheet[cellRef];
            if (cell && cell.v !== undefined) {
               resolve(String(cell.v));
            } else {
               resolve("");
            }
        } else {
            resolve("");
        }
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (err) => reject(err);
    reader.readAsBinaryString(file);
  });
};
