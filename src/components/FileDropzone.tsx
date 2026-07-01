import React, { useCallback, useRef } from "react";
import { UploadCloud, FileSpreadsheet } from "lucide-react";

interface FileDropzoneProps {
  onFilesSelected: (files: File[]) => void;
}

export const FileDropzone: React.FC<FileDropzoneProps> = ({ onFilesSelected }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const files = Array.from(e.dataTransfer.files).filter((file: any) => {
        const ext = file.name.split('.').pop()?.toLowerCase();
        return ext === 'xlsx' || ext === 'xls' || ext === 'csv';
      });
      if (files.length > 0) {
        onFilesSelected(files);
      }
    },
    [onFilesSelected]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
        const files = Array.from(e.target.files);
        onFilesSelected(files);
    }
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onClick={() => fileInputRef.current?.click()}
      className="border-2 border-dashed border-slate-700 rounded-xl p-8 md:p-10 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-800/50 transition-colors bg-slate-900/30 backdrop-blur-sm group mx-4 md:mx-0 flex-1 h-full min-h-[220px]"
    >
      <input
        type="file"
        multiple
        accept=".xlsx, .xls, .csv"
        className="hidden"
        ref={fileInputRef}
        onChange={handleChange}
      />
      
      <div className="bg-green-500/20 p-4 rounded-full mb-4 group-hover:scale-110 transition-transform">
         <UploadCloud className="w-10 h-10 text-green-400" />
      </div>
      <h3 className="text-xl font-medium text-white mb-2">Drag & Drop Excel Files</h3>
      <p className="text-gray-400 text-sm mb-6">Support .xlsx, .xls, .csv</p>
      
      <button className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-2 rounded-md font-medium transition-colors flex items-center gap-2 border border-slate-700">
         <FileSpreadsheet className="w-4 h-4" />
         Browse Files
      </button>
    </div>
  );
};
