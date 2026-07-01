import React, { useState } from "react";
import { ExcelFile } from "../types";
import { CheckCircle2, AlertCircle, Clock, FileType, X } from "lucide-react";

interface FileTableProps {
  files: ExcelFile[];
  onRemove: (id: string) => void;
  searchQuery: string;
}

export const FileTable: React.FC<FileTableProps> = ({ files, onRemove, searchQuery }) => {

  const filteredFiles = files.filter(f => 
       f.originalName.toLowerCase().includes(searchQuery.toLowerCase()) ||
       f.newName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Render limit of 100 files for absolute butter-smooth performance
  const limit = 100;
  const visibleFiles = filteredFiles.slice(0, limit);
  const hiddenCount = filteredFiles.length - limit;

  return (
    <div className="p-4 flex-grow overflow-auto min-h-0 flex flex-col justify-between">
      <div className="overflow-auto min-h-0 flex-grow">
        <table className="w-full min-w-[700px] text-left text-xs">
          <thead className="text-slate-500 border-b border-slate-800 sticky top-0 bg-slate-900/50 backdrop-blur z-10">
            <tr>
              <th scope="col" className="pb-2 font-medium bg-slate-950/80">ORIGINAL FILENAME</th>
              <th scope="col" className="pb-2 font-medium bg-slate-950/80">NEW PREVIEW</th>
              <th scope="col" className="pb-2 font-medium bg-slate-950/80">SHEET INFO</th>
              <th scope="col" className="pb-2 font-medium text-center bg-slate-950/80">STATUS</th>
              <th scope="col" className="pb-2 font-medium text-right bg-slate-950/80">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="text-slate-300 font-mono">
            {visibleFiles.map((file) => (
            <tr 
                key={file.id}
                className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
            >
                <td className="py-3 pr-2">
                  <div className="flex items-start gap-2">
                    <FileType className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="break-all whitespace-normal text-slate-200" title={file.originalName}>
                        {file.originalName}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-2">
                  {file.newName !== file.originalName ? (
                     <span className="text-green-400 italic font-bold break-all whitespace-normal">{file.newName}</span>
                  ) : (
                     <span className="text-gray-500 italic opacity-40 font-bold break-all whitespace-normal">{file.newName}</span>
                  )}
                </td>
                <td className="py-3 px-2">
                   <div className="flex flex-col gap-1 text-[10px]">
                      {file.workbookTitle && <span className="text-slate-400 bg-slate-800/50 px-2 py-0.5 rounded w-max">Sheet: {file.workbookTitle}</span>}
                      {file.headers && file.headers.length > 0 && <span className="text-slate-500 truncate max-w-[150px]" title={file.headers.join(', ')}>Cols: {file.headers.join(', ')}</span>}
                   </div>
                </td>
                <td className="py-3 px-2 text-center text-[10px]">
                    {file.status === "pending" && <span className="px-2 py-0.5 bg-slate-800 text-slate-500 rounded font-sans uppercase">WAITING</span>}
                    {file.status === "processing" && <span className="px-2 py-0.5 bg-blue-900/30 text-blue-400 rounded font-sans flex items-center justify-center gap-1 w-max mx-auto uppercase"><div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div> PROC</span>}
                    {file.status === "success" && <span className="px-2 py-0.5 bg-green-900/30 text-green-400 rounded font-sans uppercase">READY</span>}
                    {file.status === "error" && <span className="px-2 py-0.5 bg-red-900/30 text-red-400 rounded font-sans uppercase" title={file.error}>ERROR</span>}
                </td>
                <td className="py-3 pl-2 text-right">
                    <button 
                        onClick={() => onRemove(file.id)}
                        className="text-slate-600 hover:text-red-400 px-2 py-1 transition-colors font-sans"
                    >
                        <X className="w-4 h-4 inline" />
                    </button>
                </td>
            </tr>
            ))}
            {filteredFiles.length === 0 && (
                <tr>
                    <td colSpan={5} className="py-10 text-center text-slate-500 font-sans text-sm">
                       No files match the criteria.
                    </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {hiddenCount > 0 && (
        <div className="mt-2 text-center text-xs text-slate-400 font-sans bg-slate-900/30 py-2 border-t border-slate-800 shrink-0">
          Showing first <span className="text-green-500 font-semibold">{limit}</span> of <span className="text-white font-semibold">{filteredFiles.length}</span> files in queue (all files will be renamed during action)
        </div>
      )}
    </div>
  );
};
