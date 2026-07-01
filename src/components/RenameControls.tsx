import React from "react";
import { RenameConfig, RenameMethod } from "../types";
import { Wand2, Download, Search, RefreshCw, X, FileBadge, Settings2 } from "lucide-react";

interface RenameControlsProps {
  config: RenameConfig;
  setConfig: React.Dispatch<React.SetStateAction<RenameConfig>>;
  onApplyAI: () => void;
  onExecute: () => void;
  isProcessing: boolean;
  totalFiles: number;
}

export const RenameControls: React.FC<RenameControlsProps> = ({ config, setConfig, onApplyAI, onExecute, isProcessing, totalFiles }) => {
  const methods: { value: RenameMethod; label: string }[] = [
    { value: "prefix", label: "Add Prefix" },
    { value: "suffix", label: "Add Suffix" },
    { value: "replace", label: "Replace Text" },
    { value: "remove", label: "Remove Text" },
    { value: "sequential", label: "Sequential Pattern" },
    { value: "uppercase", label: "UPPERCASE" },
    { value: "lowercase", label: "lowercase" },
    { value: "titlecase", label: "Title Case" },
    { value: "datetime", label: "Add Date & Time" },
    { value: "cell_value", label: "Excel Cell Value" },
  ];

  return (
    <>
      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2 shrink-0">
        <Settings2 className="w-4 h-4" />
        Core Renaming Rules
      </h2>
      <div className="space-y-4 flex-grow overflow-auto pr-2 pb-4">
        
        {/* Rule Selection */}
        <div>
          <label className="text-[10px] font-bold text-slate-500 mb-1 block uppercase">Renaming Rule</label>
          <select 
            value={config.method} 
            onChange={(e) => setConfig(prev => ({ ...prev, method: e.target.value as RenameMethod }))}
            className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-slate-100 focus:outline-none focus:border-green-600 appearance-none"
          >
            {methods.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>

        {/* Dynamic Inputs Based on Selection */}
        <div className="space-y-4">
           {config.method === "prefix" && (
              <div>
                 <label className="text-[10px] font-bold text-slate-500 mb-1 block uppercase">PREFIX TEXT</label>
                 <input 
                   type="text" 
                   value={config.prefixStr || ""}
                   onChange={(e) => setConfig(prev => ({ ...prev, prefixStr: e.target.value }))}
                   className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-slate-100 focus:outline-none focus:border-green-600"
                 />
              </div>
           )}

           {config.method === "suffix" && (
              <div>
                 <label className="text-[10px] font-bold text-slate-500 mb-1 block uppercase">SUFFIX TEXT</label>
                 <input 
                   type="text" 
                   value={config.suffixStr || ""}
                   onChange={(e) => setConfig(prev => ({ ...prev, suffixStr: e.target.value }))}
                   className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-slate-100 focus:outline-none focus:border-green-600"
                 />
              </div>
           )}

           {config.method === "replace" && (
              <div>
                 <label className="text-[10px] font-bold text-slate-500 mb-1 block uppercase">FIND AND REPLACE</label>
                 <div className="flex flex-col sm:flex-row gap-2">
                    <input 
                      type="text" 
                      placeholder="Find..." 
                      value={config.searchStr || ""}
                      onChange={(e) => setConfig(prev => ({ ...prev, searchStr: e.target.value }))}
                      className="w-full sm:w-1/2 bg-slate-950 border border-slate-700 rounded p-2 text-sm text-slate-100 focus:outline-none focus:border-green-600"
                    />
                    <input 
                      type="text" 
                      placeholder="Replace..." 
                      value={config.replaceStr || ""}
                      onChange={(e) => setConfig(prev => ({ ...prev, replaceStr: e.target.value }))}
                      className="w-full sm:w-1/2 bg-slate-950 border border-slate-700 rounded p-2 text-sm text-slate-100 focus:outline-none focus:border-green-600"
                    />
                 </div>
              </div>
           )}

           {config.method === "remove" && (
              <div>
                 <label className="text-[10px] font-bold text-slate-500 mb-1 block uppercase">TEXT TO REMOVE</label>
                 <input 
                   type="text" 
                   value={config.removeStr || ""}
                   onChange={(e) => setConfig(prev => ({ ...prev, removeStr: e.target.value }))}
                   className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-slate-100 focus:outline-none focus:border-green-600"
                 />
              </div>
           )}

           {config.method === "cell_value" && (
              <div>
                 <label className="text-[10px] font-bold text-slate-500 mb-1 block uppercase">TARGET CELL REFERENCE</label>
                 <input 
                   type="text" 
                   placeholder="e.g. A1, B2" 
                   value={config.cellRef || "A1"}
                   onChange={(e) => setConfig(prev => ({ ...prev, cellRef: e.target.value }))}
                   className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-slate-100 focus:outline-none focus:border-green-600 font-mono uppercase"
                 />
                 <p className="text-[10px] text-slate-500 mt-2">Appends the cell's text from the first sheet</p>
              </div>
           )}

           {config.method === "sequential" && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                 <div>
                    <label className="text-[10px] font-bold text-slate-500 mb-1 block uppercase">POSITION</label>
                    <select 
                      value={config.seqPosition || "prefix"}
                      onChange={(e) => setConfig(prev => ({ ...prev, seqPosition: e.target.value as "prefix" | "suffix" | "replace" }))}
                      className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-slate-100 focus:outline-none focus:border-green-600 appearance-none cursor-pointer"
                    >
                      <option value="prefix">Prefix to Name</option>
                      <option value="suffix">Suffix to Name</option>
                      <option value="replace">Only Number (Replace Name)</option>
                    </select>
                 </div>
                 <div>
                    <label className="text-[10px] font-bold text-slate-500 mb-1 block uppercase">START NUMBER</label>
                    <input 
                      type="number" 
                      value={config.seqStart || 1}
                      onChange={(e) => setConfig(prev => ({ ...prev, seqStart: parseInt(e.target.value) || 1 }))}
                      className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-slate-100 focus:outline-none focus:border-green-600"
                    />
                 </div>
                 <div>
                    <label className="text-[10px] font-bold text-slate-500 mb-1 block uppercase">SEPARATOR SYMBOL</label>
                    <input 
                      type="text" 
                      placeholder="e.g. . or _ or /"
                      value={config.seqSeparator !== undefined ? config.seqSeparator : "_"}
                      onChange={(e) => setConfig(prev => ({ ...prev, seqSeparator: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-slate-100 focus:outline-none focus:border-green-600"
                    />
                 </div>
              </div>
           )}

           {false && (
              <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-lg p-4 mt-2">
                 <div className="flex items-center gap-2 mb-3">
                   <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div>
                   <h2 className="text-[10px] font-bold uppercase tracking-widest text-blue-400">AI NAMING ENGINE</h2>
                 </div>
                 <p className="text-[10px] text-slate-400 mb-3 leading-relaxed">
                   Sends headers & row 1 to Gemini. Limit 50 files per batch.
                 </p>
                 <button 
                   onClick={onApplyAI}
                   disabled={isProcessing || totalFiles === 0}
                   className="w-full mt-2 py-2 bg-slate-800 border border-slate-700 text-slate-300 rounded text-[10px] font-bold hover:text-white transition-colors disabled:opacity-50"
                 >
                   GENERATE SUGGESTIONS
                 </button>
              </div>
           )}
           
                       {config.method === "datetime" && (
               <div className="space-y-3 pt-2">
                  <div>
                     <label className="text-[10px] font-bold text-slate-500 mb-1.5 block uppercase">DATE & TIME FORMAT</label>
                     <select 
                       value={config.datetimeFormat || "YYYYMMDD_HHMMSS"}
                       onChange={(e) => setConfig(prev => ({ ...prev, datetimeFormat: e.target.value }))}
                       className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-slate-100 focus:outline-none focus:border-green-600 appearance-none cursor-pointer"
                     >
                       <option value="YYYYMMDD_HHMMSS">20260609_153022 (Date & Time)</option>
                       <option value="YYYY-MM-DD">2026-06-09 (Date Only - ISO)</option>
                       <option value="DD-MM-YYYY">09-06-2026 (Date Only - DD-MM-YYYY)</option>
                       <option value="YYYYMMDD">20260609 (Compact Date)</option>
                       <option value="HHMMSS">153022 (Time Only)</option>
                     </select>
                  </div>
                  
                  <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg">
                     <span className="text-[9px] font-bold text-slate-400 block uppercase mb-1.5 tracking-wider">LIVE PREVIEW ACCENT</span>
                     <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400 font-mono">OriginalFileName</span>
                        <code className="text-xs text-green-400 font-mono font-semibold bg-green-950/40 border border-green-900/30 px-1.5 py-0.5 rounded">
                          _{(() => {
                            const pad = (n: number) => String(n).padStart(2, '0');
                            const date = new Date();
                            const yyyy = date.getFullYear();
                            const mm = pad(date.getMonth() + 1);
                            const dd = pad(date.getDate());
                            const hh = date.getHours();
                            const min = pad(date.getMinutes());
                            const ss = pad(date.getSeconds());
                            const format = config.datetimeFormat || "YYYYMMDD_HHMMSS";
                            if (format === "YYYY-MM-DD") return `${yyyy}-${mm}-${dd}`;
                            if (format === "DD-MM-YYYY") return `${dd}-${mm}-${yyyy}`;
                            if (format === "YYYYMMDD") return `${yyyy}${mm}${dd}`;
                            if (format === "HHMMSS") return `${pad(hh)}${min}${ss}`;
                            return `${yyyy}${mm}${dd}_${pad(hh)}${min}${ss}`;
                          })()}
                        </code>
                     </div>
                     <p className="text-[10px] text-slate-500 mt-2 leading-tight">
                        Appends the formatted current date and time as a suffix to distinguish file versions dynamically.
                     </p>
                  </div>
               </div>
            )}

            {['uppercase', 'lowercase', 'titlecase'].includes(config.method) && (
              <div className="pt-2">
                 <p className="text-slate-500 text-xs italic">
                    Changes text casing for all files.
                 </p>
              </div>
           )}
        </div>
        
        <div className="pt-4 border-t border-slate-800 space-y-3 mt-4">
          <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
            <input type="checkbox" className="rounded bg-slate-950 border-slate-700 text-green-600 focus:ring-green-600" defaultChecked />
            Auto-Detect Duplicate Conflicts
          </label>
        </div>

      </div>
    </>
  );
};
