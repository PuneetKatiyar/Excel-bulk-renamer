import React, { useCallback, useRef, useState } from "react";
import JSZip from "jszip";
import { FolderArchive, RefreshCw, AlertCircle, Check } from "lucide-react";

interface ZipDropzoneProps {
  onFilesExtracted: (files: File[]) => void;
  onExtractionStart?: () => void;
  onExtractionEnd?: () => void;
}

export const ZipDropzone: React.FC<ZipDropzoneProps> = ({
  onFilesExtracted,
  onExtractionStart,
  onExtractionEnd,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedCount, setExtractedCount] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const getMimeTypeByExtension = (fileName: string): string => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    if (ext === "xlsx") return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    if (ext === "xls") return "application/vnd.ms-excel";
    if (ext === "csv") return "text/csv";
    return "application/octet-stream";
  };

  const processZipFile = async (file: File) => {
    setIsExtracting(true);
    setExtractedCount(null);
    setErrorMsg(null);
    if (onExtractionStart) onExtractionStart();

    try {
      const zip = new JSZip();
      const loadedZip = await zip.loadAsync(file);
      const extractedFiles: File[] = [];

      // Extract all file keys
      const filePaths = Object.keys(loadedZip.files);

      for (const filePath of filePaths) {
        const zipEntry = loadedZip.files[filePath];
        // Skip directories
        if (zipEntry.dir) continue;

        const lowerName = zipEntry.name.toLowerCase();
        const isExcelOrCsv =
          lowerName.endsWith(".xlsx") ||
          lowerName.endsWith(".xls") ||
          lowerName.endsWith(".csv");

        if (!isExcelOrCsv) continue;

        const fileName = filePath.split("/").pop();
        if (!fileName) continue;

        // Extract file binary data as blob
        const fileData = await zipEntry.async("blob");
        const extractedFile = new File([fileData], fileName, {
          type: getMimeTypeByExtension(fileName),
        });

        extractedFiles.push(extractedFile);
      }

      if (extractedFiles.length === 0) {
        setErrorMsg("No .xlsx, .xls, or .csv files found inside the ZIP archive.");
      } else {
        setExtractedCount(extractedFiles.length);
        onFilesExtracted(extractedFiles);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Failed to read ZIP file: " + (err.message || "Unknown error"));
    } finally {
      setIsExtracting(false);
      if (onExtractionEnd) onExtractionEnd();
    }
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (isExtracting) return;

      const file = (Array.from(e.dataTransfer.files) as File[]).find((f) => {
        const ext = f.name.split(".").pop()?.toLowerCase();
        return ext === "zip";
      });

      if (file) {
        processZipFile(file);
      } else {
        setErrorMsg("Please drop a valid .zip file containing Excel/CSV documents.");
      }
    },
    [isExtracting]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processZipFile(e.target.files[0]);
    }
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onClick={() => !isExtracting && fileInputRef.current?.click()}
      className={`border-2 border-dashed rounded-xl p-8 md:p-10 flex flex-col items-center justify-center cursor-pointer transition-all bg-slate-900/30 backdrop-blur-sm group mx-4 md:mx-0 flex-1 h-full min-h-[220px] ${
        isExtracting
          ? "border-amber-500/50 bg-amber-500/5 cursor-not-allowed"
          : "border-slate-700 hover:border-amber-500/60 hover:bg-slate-800/50"
      }`}
    >
      <input
        type="file"
        accept=".zip"
        className="hidden"
        ref={fileInputRef}
        disabled={isExtracting}
        onChange={handleChange}
      />

      <div
        className={`p-4 rounded-full mb-4 transition-transform group-hover:scale-110 ${
          isExtracting
            ? "bg-amber-500/20 text-amber-400"
            : extractedCount !== null
            ? "bg-green-500/20 text-green-400"
            : "bg-amber-500/10 text-amber-400"
        }`}
      >
        {isExtracting ? (
          <RefreshCw className="w-10 h-10 animate-spin" />
        ) : extractedCount !== null ? (
          <Check className="w-10 h-10" />
        ) : (
          <FolderArchive className="w-10 h-10" />
        )}
      </div>

      <h3 className="text-lg font-semibold text-white mb-1">
        {isExtracting ? "Extracting Archive..." : "Upload ZIP Archive"}
      </h3>
      <p className="text-gray-400 text-xs text-center max-w-[240px] mb-4">
        {isExtracting
          ? "Reading archives client-side instantly..."
          : "Drag a .zip file to auto-extract and add all Excel sheets inside"}
      </p>

      {errorMsg && (
        <div className="flex items-center gap-1.5 text-xs text-red-400 bg-red-500/10 px-2.5 py-1.5 rounded-lg mb-3">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {extractedCount !== null && (
        <div className="flex items-center gap-1.5 text-xs text-green-400 bg-green-500/10 px-2.5 py-1.5 rounded-lg mb-3">
          <Check className="w-3.5 h-3.5 shrink-0" />
          <span>Extracted {extractedCount} excel/csv files!</span>
        </div>
      )}

      {!isExtracting && (
        <button
          type="button"
          className="bg-slate-800 hover:bg-slate-700 text-white px-5 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 border border-slate-700"
        >
          <FolderArchive className="w-3.5 h-3.5" />
          Select ZIP File
        </button>
      )}
    </div>
  );
};
