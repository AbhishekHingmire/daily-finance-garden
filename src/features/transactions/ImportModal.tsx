import { useState } from "react";
import { Download, FileUp, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/shared/Modal";
import type { WealthState } from "@/lib/wealthtrack";

export function ImportModal({
  data,
  fileInputRef,
  csvText,
  setCsvText,
  csvRows,
  csvError,
  onFile,
  parseCsv,
  onDownloadExcel,
  onDownloadCsv,
  onApplyImport,
  onClose,
}: {
  data: WealthState;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  csvText: string;
  setCsvText: (text: string) => void;
  csvRows: string[][];
  csvError: string;
  onFile: (file?: File) => void;
  parseCsv: (text: string) => void;
  onDownloadExcel: () => void;
  onDownloadCsv: () => void;
  onApplyImport: () => void;
  onClose: () => void;
}) {
  const [showPaste, setShowPaste] = useState(false);
  const validRowCount = Math.max(0, csvRows.length - 1);

  return (
    <Modal
      title="Bulk Import Transactions"
      description="Download our pre-formatted template or upload your Excel/CSV spreadsheet for 1-click batch import."
      wide
      onClose={onClose}
    >
      <div className="space-y-5">
        {/* Step 1: Blank Template Download */}
        <div className="rounded-xl border border-border bg-muted/40 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-1.5 font-bold text-sm">
                <span className="grid size-5 place-items-center rounded-full bg-primary text-[10px] text-primary-foreground font-bold">
                  1
                </span>
                <span>Download Blank Spreadsheet Template</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Pre-configured with Date, Category, Amount, Priority, Account, and Investment tracking columns.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="default" className="gap-1.5 text-xs font-semibold" onClick={onDownloadExcel}>
                <Download size={14} /> Download Excel (.xlsx)
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5 text-xs font-semibold" onClick={onDownloadCsv}>
                <Download size={14} /> Download CSV (.csv)
              </Button>
            </div>
          </div>
        </div>

        {/* Step 2: Upload File */}
        <div className="rounded-xl border-2 border-dashed border-border bg-card p-6 text-center hover:bg-muted/20 transition-colors">
          <div className="flex items-center justify-center gap-1.5 font-bold text-sm mb-2">
            <span className="grid size-5 place-items-center rounded-full bg-primary text-[10px] text-primary-foreground font-bold">
              2
            </span>
            <span>Upload Completed Spreadsheet</span>
          </div>
          <FileUp className="mx-auto mb-2 text-primary" size={28} />
          <p className="text-sm font-semibold">Choose your Excel or CSV file</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Supports .xlsx, .xls, .csv · Auto-maps Expenses, Income, Transfers & Investments (Units/Prices)
          </p>
          <Button variant="outline" size="sm" className="mt-3.5 gap-2 text-xs font-semibold" onClick={() => fileInputRef.current?.click()}>
            <FileUp size={15} /> Select File to Upload
          </Button>
          <input
            className="hidden"
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
        </div>

        {/* Optional Paste Area */}
        <div>
          <button
            type="button"
            className="text-xs text-primary font-medium hover:underline"
            onClick={() => setShowPaste(!showPaste)}
          >
            {showPaste ? "− Hide raw CSV text box" : "+ Or paste raw CSV text instead"}
          </button>
          {showPaste && (
            <div className="mt-2">
              <textarea
                className="wt-field min-h-20 resize-y font-mono text-xs"
                value={csvText}
                placeholder="Date,Category,Amount,Type,Priority,Account,Description\n2026-10-21,Food & dining,450,Expense,Need,Everyday account,Groceries"
                onChange={(e) => {
                  setCsvText(e.target.value);
                  parseCsv(e.target.value);
                }}
              />
            </div>
          )}
        </div>

        {/* Error Notification */}
        {csvError && (
          <div className="rounded-lg border border-destructive/20 wt-danger-bg p-3 text-xs text-destructive">
            {csvError}
          </div>
        )}

        {/* Step 3: Preview Table */}
        {csvRows.length > 1 && !csvError && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-sm">
                <span className="grid size-5 place-items-center rounded-full bg-emerald-600 text-[10px] text-white">
                  ✓
                </span>
                <span>Ready to Import: {validRowCount} Transactions</span>
              </div>
              <span className="text-xs text-muted-foreground">Previewing first 5 records</span>
            </div>
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full min-w-[500px] text-left text-xs">
                <thead className="bg-muted text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  <tr>
                    {csvRows[0]?.slice(0, 7).map((header, idx) => (
                      <th key={idx} className="p-2.5 font-semibold">
                        {header || `Col ${idx + 1}`}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {csvRows.slice(1, 6).map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-muted/30">
                      {csvRows[0]?.slice(0, 7).map((_, cIdx) => (
                        <td key={cIdx} className="max-w-36 truncate p-2.5 text-muted-foreground">
                          {row[cIdx] || "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-border pt-3">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={validRowCount === 0 || csvError !== ""}
            onClick={onApplyImport}
            className="gap-2 text-xs font-semibold"
          >
            <FileUp size={15} />
            {validRowCount > 0 ? `Import ${validRowCount} Transactions` : "Import Transactions"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
