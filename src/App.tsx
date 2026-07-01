import React, { useState, useEffect, useCallback, useMemo } from "react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { ExcelFile, RenameConfig } from "./types";
import { FileDropzone } from "./components/FileDropzone";
import { ZipDropzone } from "./components/ZipDropzone";
import { RenameControls } from "./components/RenameControls";
import { FileTable } from "./components/FileTable";
import { parseExcelFile } from "./utils/excel";
import { applyRenameRuleSync, applyRenameRuleAsync } from "./utils/rename";
import { Search, FolderSync, Sparkles, X, Activity } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  const [files, setFiles] = useState<ExcelFile[]>([]);
  const [config, setConfig] = useState<RenameConfig>({ method: "prefix", prefixStr: "Re_" });
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("default");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
     setFiles(prev => {
        const sorted = [...prev];
        if (sortBy === 'name_asc') sorted.sort((a,b) => a.originalName.localeCompare(b.originalName));
        else if (sortBy === 'name_desc') sorted.sort((a,b) => b.originalName.localeCompare(a.originalName));
        else if (sortBy === 'default') sorted.sort((a,b) => a.addedAt - b.addedAt);
        return sorted;
     });
  }, [sortBy]);

  // Parse files freshly dropped
  const handleFilesSelected = async (newFiles: File[]) => {
    setIsProcessing(true);
    
    // Quick bulk addition without parsing for massive performance gains
    setFiles(prev => {
        const existingNames = new Set(prev.map(f => f.originalName));
        const parsedFiles: ExcelFile[] = [];
        const baseTime = Date.now();
        let currentIdx = 0;
        
        for (const file of newFiles) {
            if (existingNames.has(file.name)) continue;

            parsedFiles.push({
                id: crypto.randomUUID(),
                file,
                originalName: file.name,
                newName: file.name,
                extension: file.name.split('.').pop() || '',
                status: "pending",
                addedAt: baseTime + currentIdx++,
            });
            existingNames.add(file.name);
        }

        const combined = [...prev, ...parsedFiles];
        if (sortBy === 'name_asc') combined.sort((a,b) => a.originalName.localeCompare(b.originalName));
        else if (sortBy === 'name_desc') combined.sort((a,b) => b.originalName.localeCompare(a.originalName));
        else if (sortBy === 'default') combined.sort((a,b) => a.addedAt - b.addedAt);
        return combined;
    });

    setIsProcessing(false);
  };

  // Debounced/Effect driven preview updates
  useEffect(() => {
     if (config.method === 'ai') return; // AI is manual trigger
     
     if (config.method === 'cell_value') {
         // Show notice or clear preview since deep reading thousands of files live crashes browser
         setFiles(prev => prev.map(f => ({ ...f, newName: "Will be computed on execute..." })));
         return;
     }

     const updatePreviews = () => {
         setFiles(prev => {
              const updated = [...prev];
              for(let i=0; i<updated.length; i++) {
                 updated[i] = { ...updated[i], newName: applyRenameRuleSync(updated[i], config, i) };
              }
              return updated;
         });
     };

     if (files.length > 0) {
        updatePreviews();
     }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, files.length, sortBy]); 

  const handleApplyAI = async () => {
     if (files.length === 0) return;
     if (files.length > 50) {
        setErrorMsg("Please clear list and select 50 or fewer files for AI renaming.");
        return;
     }

     setIsProcessing(true);
     setErrorMsg(null);

     try {
        const payload = await Promise.all(
           files.map(async f => {
               const parsed = await parseExcelFile(f.file);
               return {
                   id: f.id,
                   originalName: f.originalName,
                   headers: parsed.headers?.slice(0, 5) || [],
                   firstRow: parsed.data?.[0] || {}
               };
           })
        );

        const res = await fetch("/api/rename/ai", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ files: payload })
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || "Failed AI call");
        }

        const { suggestions } = await res.json();
        
        setFiles(prev => prev.map(f => {
            const match = suggestions.find((s: any) => s.id === f.id);
            if (match) {
                // Ensure extension is retained
                const newName = match.suggestedName.endsWith(`.${f.extension}`) 
                   ? match.suggestedName 
                   : `${match.suggestedName}.${f.extension}`;
                return { ...f, newName };
            }
            return f;
        }));

     } catch (err: any) {
        setErrorMsg(err.message || "Failed AI generation. Check your API key.");
     } finally {
        setIsProcessing(false);
     }
  };

  const handleExecuteRename = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);

    try {
      const zip = new JSZip();

      if (config.method === "cell_value") {
         const BATCH_SIZE = 50;
         for (let i = 0; i < files.length; i += BATCH_SIZE) {
            const batch = files.slice(i, i + BATCH_SIZE);
            await Promise.all(batch.map(async (f, idx) => {
               const globalIdx = i + idx;
               const newName = await applyRenameRuleAsync(f, config, globalIdx);
               zip.file(newName, f.file);
            }));
         }
      } else {
         files.forEach((f) => {
            zip.file(f.newName, f.file);
         });
      }

      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, "Renamed_Excel_Files.zip");

      // Mark success
      setFiles(prev => prev.map(f => ({ ...f, status: "success" })));
    } catch (err: any) {
       setErrorMsg("Failed to zip files: " + err.message);
       setFiles(prev => prev.map(f => ({ ...f, status: "error", error: "Compression failed" })));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadIndividual = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);

    try {
      if (config.method === "cell_value") {
         const BATCH_SIZE = 50;
         for (let i = 0; i < files.length; i += BATCH_SIZE) {
            const batch = files.slice(i, i + BATCH_SIZE);
            await Promise.all(batch.map(async (f, idx) => {
               const globalIdx = i + idx;
               const newName = await applyRenameRuleAsync(f, config, globalIdx);
               saveAs(f.file, newName);
            }));
            await new Promise(resolve => setTimeout(resolve, 500));
         }
      } else {
         for (const f of files) {
            saveAs(f.file, f.newName);
            await new Promise(resolve => setTimeout(resolve, 100));
         }
      }

      // Mark success
      setFiles(prev => prev.map(f => ({ ...f, status: "success" })));
    } catch (err: any) {
       setErrorMsg("Failed to download files: " + err.message);
       setFiles(prev => prev.map(f => ({ ...f, status: "error", error: "Download failed" })));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemove = (id: string) => {
      setFiles(prev => prev.filter(f => f.id !== id));
  };
  
  const handleClearAll = () => {
     setFiles([]);
  };

  return (
    <div className={`min-h-[100dvh] md:h-[100dvh] bg-slate-950 text-slate-100 flex flex-col font-sans overflow-y-auto md:overflow-hidden p-4 lg:p-6 ${files.length > 0 ? "pb-36" : ""}`}>
        
       {/* Top Navigation */}
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 md:mb-3 lg:mb-6 shrink-0 gap-3 md:gap-4">
          <div className="flex items-center gap-2 md:gap-3 shrink-0">
             <div className="w-8 h-8 md:w-10 md:h-10 bg-green-600 rounded-lg flex items-center justify-center shadow-lg shadow-green-900/20 shrink-0">
                <FolderSync className="w-4 h-4 md:w-6 md:h-6 text-white" />
             </div>
             <div>
                <h1 className="text-[16px] md:text-xl font-bold tracking-tight">
                  Excel Bulk Renamer <span className="text-green-500 font-black">PRO</span>
                </h1>
                <div className="flex items-center gap-2">
                  <span className="flex h-1.5 w-1.5 md:h-2 md:w-2 rounded-full bg-green-500 shrink-0"></span>
                  <p className="text-[8px] md:text-[10px] uppercase tracking-widest text-slate-400 font-semibold line-clamp-1">Local Engine Active • Secure</p>
                </div>
             </div>
          </div>
          <div className={`${files.length > 0 ? "hidden md:flex" : "flex"} flex-wrap sm:flex-nowrap gap-2 md:gap-3 w-full md:w-auto shrink-0`}>
             <button 
                 onClick={handleClearAll}
                 disabled={files.length === 0}
                 className="flex-1 md:flex-none justify-center px-3 py-3 md:px-4 md:py-2 bg-slate-800 border border-slate-700 rounded-md text-sm md:text-xs font-medium hover:bg-slate-700 flex items-center gap-2 text-slate-200 disabled:opacity-50 whitespace-nowrap"
             >
                <X className="w-5 h-5 md:w-4 md:h-4" /> Clear All
             </button>
             <button
                 onClick={handleDownloadIndividual}
                 disabled={isProcessing || files.length === 0}
                 className="flex-1 md:flex-none justify-center px-4 py-3 md:px-6 md:py-2 bg-blue-600 rounded-md text-sm md:text-xs font-bold hover:bg-blue-500 shadow-lg shadow-blue-900/40 text-white disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
             >
                 {isProcessing ? 'PROCESSING...' : 'DOWNLOAD INDIVIDUALLY'}
             </button>
             <button
                 onClick={handleExecuteRename}
                 disabled={isProcessing || files.length === 0}
                 className="flex-1 md:flex-none justify-center px-4 py-3 md:px-6 md:py-2 bg-green-600 rounded-md text-sm md:text-xs font-bold hover:bg-green-500 shadow-lg shadow-green-900/40 text-white disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
             >
                 {isProcessing ? 'PROCESSING...' : 'EXECUTE BULK RENAME'}
             </button>
          </div>
      </header>

      <main className="flex-grow flex flex-col min-h-0">
        
        {/* Error message */}
        <AnimatePresence>
            {errorMsg && (
                <motion.div 
                   initial={{ opacity: 0, y: -20 }}
                   animate={{ opacity: 1, y: 0 }}
                   exit={{ opacity: 0, scale: 0.95 }}
                   className="bg-red-500/10 border border-red-500/30 text-red-400 px-6 py-4 rounded-xl flex items-center justify-between mb-4 shrink-0"
                >
                   <div className="flex gap-3 items-center">
                       <X className="w-5 h-5 text-red-500 bg-red-500/20 p-0.5 rounded-full" />
                       <p className="text-sm">{errorMsg}</p>
                   </div>
                   <button onClick={() => setErrorMsg(null)} className="hover:text-red-300">
                      <X className="w-4 h-4" />
                   </button>
                </motion.div>
            )}
        </AnimatePresence>

        {files.length === 0 ? (
           <motion.div 
             initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0 }}
             className="max-w-5xl w-full mx-auto flex-1 flex flex-col justify-center min-h-0 px-2 mt-4 md:mt-0"
           >
              <div className="text-center mb-6">
                 <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-white mb-3">Rename Thousands of Excel Files. <br/><span className="text-green-500">Instantly.</span></h2>
                 <p className="text-sm md:text-base lg:text-lg text-slate-400 leading-relaxed max-w-2xl mx-auto">Upload Excel/CSV files directly, or drop a ZIP archive to extract and queue them automatically. Everything runs safely inside your browser locally.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6 mt-2 max-w-4xl mx-auto w-full">
                 <div className="flex flex-col gap-2 h-full">
                    <span className="text-xs font-semibold text-green-400 px-1 select-none flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                      METHOD 1: INDIVIDUAL FILES/CSV
                    </span>
                    <FileDropzone onFilesSelected={handleFilesSelected} />
                 </div>
                 <div className="flex flex-col gap-2 h-full">
                    <span className="text-xs font-semibold text-amber-400 px-1 select-none flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                      METHOD 2: ZIP ARCHIVE AUTO-EXTRACT
                    </span>
                    <ZipDropzone 
                       onFilesExtracted={handleFilesSelected}
                       onExtractionStart={() => setIsProcessing(true)}
                       onExtractionEnd={() => setIsProcessing(false)}
                    />
                 </div>
              </div>
           </motion.div>
        ) : (
           <motion.div 
             initial={{ opacity: 0, y: 0 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0 }}
             className="flex flex-col md:flex-row gap-4 md:gap-3 lg:gap-4 flex-grow min-h-0 w-full"
           >
              
              {/* Main File Workspace */}
              <div className="w-full flex-1 md:w-[55%] lg:w-2/3 bg-slate-900/50 border border-slate-800 rounded-2xl backdrop-blur-xl flex flex-col overflow-hidden shrink h-[45vh] min-h-[350px] md:h-auto md:min-h-0">
                 <div className="p-4 border-b border-slate-800 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 bg-slate-800/20 shrink-0">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">File Queue ({files.length} files)</h2>
                    
                    <div className="flex flex-wrap items-center gap-2 lg:gap-3 w-full lg:w-auto">
                        <div className="relative flex-grow lg:flex-grow-0 min-w-[#140px]">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input 
                               type="text"
                               placeholder="Search files..."
                               value={searchQuery}
                               onChange={(e) => setSearchQuery(e.target.value)}
                               className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded-md text-xs text-slate-200 focus:outline-none focus:border-green-600"
                            />
                        </div>
                        <select
                           value={sortBy}
                           onChange={(e) => setSortBy(e.target.value)}
                           className="flex-grow lg:flex-grow-0 bg-slate-950 border border-slate-700 rounded-md text-xs text-slate-200 focus:outline-none focus:border-green-600 px-2 py-1.5 appearance-none cursor-pointer"
                        >
                           <option value="default">Sort: Upload Order</option>
                           <option value="name_asc">Sort: Name (A-Z)</option>
                           <option value="name_desc">Sort: Name (Z-A)</option>
                        </select>
                        <label className="flex-grow lg:flex-grow-0 text-center text-[10px] h-fit font-bold bg-slate-800 border border-slate-700 text-slate-300 px-3 py-1.5 rounded-md hover:bg-slate-700 transition-colors cursor-pointer whitespace-nowrap">
                            + ADD FILES
                            <input 
                                type="file" 
                                multiple 
                                accept=".xlsx, .xls, .csv" 
                                className="hidden" 
                                onChange={(e) => {
                                    if (e.target.files) handleFilesSelected(Array.from(e.target.files));
                                }}
                            />
                        </label>
                        <label className="flex-grow lg:flex-grow-0 text-center text-[10px] h-fit font-bold bg-amber-950/20 border border-amber-800/60 text-amber-400 px-3 py-1.5 rounded-md hover:bg-amber-850/20 transition-colors cursor-pointer whitespace-nowrap">
                            + IMPORT ZIP
                            <input 
                                type="file" 
                                accept=".zip" 
                                className="hidden" 
                                onChange={async (e) => {
                                    if (e.target.files && e.target.files.length > 0) {
                                        setIsProcessing(true);
                                        setErrorMsg(null);
                                        try {
                                            const zip = new JSZip();
                                            const loadedZip = await zip.loadAsync(e.target.files[0]);
                                            const extractedFiles: File[] = [];

                                            const getMimeTypeByExtension = (fileName: string): string => {
                                                const ext = fileName.split(".").pop()?.toLowerCase();
                                                if (ext === "xlsx") return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
                                                if (ext === "xls") return "application/vnd.ms-excel";
                                                if (ext === "csv") return "text/csv";
                                                return "application/octet-stream";
                                            };

                                            for (const filePath of Object.keys(loadedZip.files)) {
                                                const zipEntry = loadedZip.files[filePath];
                                                if (zipEntry.dir) continue;

                                                const lowerName = zipEntry.name.toLowerCase();
                                                const isExcelOrCsv =
                                                    lowerName.endsWith(".xlsx") ||
                                                    lowerName.endsWith(".xls") ||
                                                    lowerName.endsWith(".csv");

                                                if (!isExcelOrCsv) continue;

                                                const fileName = filePath.split("/").pop();
                                                if (!fileName) continue;

                                                const fileData = await zipEntry.async("blob");
                                                const extractedFile = new File([fileData], fileName, {
                                                    type: getMimeTypeByExtension(fileName),
                                                });

                                                extractedFiles.push(extractedFile);
                                            }

                                             if (extractedFiles.length === 0) {
                                                 setErrorMsg("No .xlsx, .xls, or .csv files found inside the ZIP archive.");
                                             } else {
                                                 handleFilesSelected(extractedFiles);
                                             }
                                        } catch (err: any) {
                                            setErrorMsg("ZIP Extraction failed: " + err.message);
                                        } finally {
                                            setIsProcessing(false);
                                        }
                                    }
                                }}
                            />
                        </label>
                    </div>
                 </div>
                 
                 <FileTable 
                     files={files} 
                     onRemove={handleRemove} 
                     searchQuery={searchQuery}
                 />
              </div>

              {/* Global Rules Panel */}
              <div className="w-full md:w-[45%] lg:w-1/3 shrink-0 bg-slate-900/50 border border-slate-800 rounded-2xl p-4 lg:p-5 backdrop-blur-xl flex flex-col min-h-0 overflow-y-auto md:max-h-none">
                 <RenameControls 
                     config={config} 
                     setConfig={setConfig} 
                     onApplyAI={handleApplyAI}
                     onExecute={handleExecuteRename}
                     isProcessing={isProcessing}
                     totalFiles={files.length}
                 />
              </div>

           </motion.div>
        )}
      </main>

      {/* Mobile-only Action Buttons at the bottom */}
      {files.length > 0 && (
         <div className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 p-3 flex flex-col gap-3 z-50 shadow-[0_-10px_30px_rgba(0,0,0,0.8)]">
            <button
                onClick={handleDownloadIndividual}
                disabled={isProcessing || files.length === 0}
                className="w-full justify-center px-4 py-3 bg-blue-600 rounded-lg text-sm font-bold hover:bg-blue-500 shadow-lg shadow-blue-900/40 text-white disabled:opacity-50 flex items-center justify-center gap-2 whitespace-nowrap active:scale-95 transition-transform"
                id="mobile-download-individual-btn"
            >
                {isProcessing ? 'PROCESSING...' : 'DOWNLOAD INDIVIDUALLY'}
            </button>
            <div className="flex flex-row gap-3">
               <button 
                   onClick={handleClearAll}
                   disabled={files.length === 0}
                   className="flex-1 justify-center px-3 py-3.5 bg-slate-900 border border-slate-800 rounded-lg text-sm font-medium hover:bg-slate-800 flex items-center justify-center gap-2 text-slate-200 disabled:opacity-50 whitespace-nowrap active:scale-95 transition-transform"
                   id="mobile-clear-all-btn"
               >
                  <X className="w-5 h-5 text-red-400" /> Clear
               </button>
               <button
                   onClick={handleExecuteRename}
                   disabled={isProcessing || files.length === 0}
                   className="flex-[2] justify-center px-4 py-3.5 bg-green-600 rounded-lg text-sm font-bold hover:bg-green-500 shadow-lg shadow-green-900/40 text-white disabled:opacity-50 flex items-center justify-center gap-2 whitespace-nowrap active:scale-95 transition-transform"
                   id="mobile-execute-rename-btn"
               >
                   {isProcessing ? 'PROCESSING...' : 'EXECUTE BULK RENAME'}
               </button>
            </div>
         </div>
      )}

      {/* System Footer */}
      <footer className="mt-4 md:mt-3 lg:mt-6 flex flex-col md:flex-row justify-between items-center gap-2 md:gap-3 px-2 shrink-0 pb-2 md:pb-0 text-center md:text-left">
        <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4 text-[9px] md:text-[10px] text-slate-500">
          <span>Version 2.4.0 (Stable)</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Storage Connected</span>
        </div>
        <div className="text-[8px] md:text-[10px] font-medium text-slate-400 tracking-wide bg-slate-800/50 px-3 py-1 rounded-full border border-slate-700/50">
          COPYRIGHT@PUNEETKATIYAR
        </div>
      </footer>
    </div>
  );
}
