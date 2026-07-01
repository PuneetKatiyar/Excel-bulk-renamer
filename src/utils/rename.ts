import { ExcelFile, RenameConfig } from "../types";
import { getCellValue } from "./excel";

const toTitleCase = (str: string) => {
  return str.replace(
    /\w\S*/g,
    (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
};

export const applyRenameRuleSync = (
  file: ExcelFile,
  config: RenameConfig,
  index: number
): string => {
  let name = file.originalName.replace(`.${file.extension}`, "");
  
  switch (config.method) {
    case "prefix":
      if (config.prefixStr) name = `${config.prefixStr}${name}`;
      break;
    case "suffix":
      if (config.suffixStr) name = `${name}${config.suffixStr}`;
      break;
    case "replace":
      if (config.searchStr && config.replaceStr !== undefined) {
        name = name.split(config.searchStr).join(config.replaceStr);
      }
      break;
    case "remove":
      if (config.removeStr) {
        name = name.split(config.removeStr).join("");
      }
      break;
    case "uppercase":
      name = name.toUpperCase();
      break;
    case "lowercase":
      name = name.toLowerCase();
      break;
    case "titlecase":
      name = toTitleCase(name.replace(/_/g, " ")).replace(/ /g, "_");
      break;
    case "sequential": {
      const start = config.seqStart || 1;
      const pos = config.seqPosition || "prefix";
      const sep = config.seqSeparator !== undefined ? config.seqSeparator : "_";
      const numStr = String(start + index);
      if (pos === "prefix") {
          name = `${numStr}${sep}${name}`;
      } else if (pos === "suffix") {
          name = `${name}${sep}${numStr}`;
      } else if (pos === "replace") {
          name = numStr;
      }
      break;
    }
    case "datetime": {
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const yyyy = now.getFullYear();
      const mm = pad(now.getMonth() + 1);
      const dd = pad(now.getDate());
      const hh = pad(now.getHours());
      const min = pad(now.getMinutes());
      const ss = pad(now.getSeconds());
      
      const format = config.datetimeFormat || "YYYYMMDD_HHMMSS";
      let dStr = "";
      if (format === "YYYY-MM-DD") {
        dStr = `${yyyy}-${mm}-${dd}`;
      } else if (format === "DD-MM-YYYY") {
        dStr = `${dd}-${mm}-${yyyy}`;
      } else if (format === "YYYYMMDD") {
        dStr = `${yyyy}${mm}${dd}`;
      } else if (format === "HHMMSS") {
        dStr = `${hh}${min}${ss}`;
      } else {
        dStr = `${yyyy}${mm}${dd}_${hh}${min}${ss}`;
      }
      
      name = `${name}_${dStr}`;
      break;
    }
    case "cell_value":
    case "ai":
      return file.newName;
  }

  if (!name.trim()) name = "renamed_file";
  return `${name}.${file.extension}`;
};

export const applyRenameRuleAsync = async (
  file: ExcelFile,
  config: RenameConfig,
  index: number
): Promise<string> => {
  if (config.method !== "cell_value") {
    return applyRenameRuleSync(file, config, index);
  }

  let name = file.originalName.replace(`.${file.extension}`, "");
  if (config.cellRef) {
      try {
          const val = await getCellValue(file.file, config.cellRef);
          if (val) {
              name = `${name}_${val}`.replace(/[^a-zA-Z0-9_-]/g, "_");
          }
      } catch (err) {
          console.error("Failed to extract cell value for", file.originalName);
      }
  }

  if (!name.trim()) name = "renamed_file";
  return `${name}.${file.extension}`;
};
