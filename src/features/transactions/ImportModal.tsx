import { Download, FileSpreadsheet, FileUp, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/shared/Modal";
import type { WealthState } from "@/lib/wealthtrack";

export function ImportModal({
  data,
  fileInputRef,
  csvRows,
  csvError,
  onFile,
  onDownloadExcel,
  onApplyImport,
  onClose,
}: {
  data: WealthState;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  csvRows: string[][];
  csvError: string;
  onFile: (file?: File) => void;
  onDownloadExcel: () => void;
  onApplyImport: () => void;
  onClose: () => void;
}) {
  const validRowCount = Math.max(0, csvRows.length - 1);

  return (
    <Modal
      title="Bulk Upload Transactions (Excel)"
      description="Download our pre-formatted Excel template, add your expense & income rows, and upload for 1-click batch import."
      wide
      onClose={onClose}
    >
      <div className="space-y-4">
        {/* Step 1: Download Template */}
        <div className="rounded-xl border border-border/80 bg-muted/40 p-4 shadow-2xs">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 font-bold text-sm text-foreground">
                <span className="grid size-5 place-items-center rounded-full bg-primary text-[10px] text-primary-foreground font-bold">
                  1
                </span>
                <span>Download Excel Template</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                Pre-configured with sample Expense & Income rows and your active category/account list in Sheet 2.
              </p>
            </div>
            <Button
              size="sm"
              variant="default"
              className="gap-2 text-xs font-semibold shadow-xs shrink-0"
              onClick={onDownloadExcel}
            >
              <Download size={14} /> Download Template (.xlsx)
            </Button>
          </div>
        </div>

        {/* Step 2: Quick Format Instructions */}
        <div className="rounded-xl border border-border/70 bg-card p-3.5 text-xs space-y-1.5 shadow-2xs">
          <div className="flex items-center gap-1.5 font-bold text-foreground text-xs">
            <span className="grid size-5 place-items-center rounded-full bg-primary text-[10px] text-primary-foreground font-bold">
              2
            </span>
            <span>Fill In Your Financial Entries</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-muted-foreground text-[11px] pt-1">
            <div className="rounded-lg bg-muted/30 p-2.5 border border-border/50">
              <strong className="text-foreground block mb-0.5">Required Columns:</strong>
              <span>Date (YYYY-MM-DD), Type (Expense or Income), Amount, Category, Account</span>
            </div>
            <div className="rounded-lg bg-muted/30 p-2.5 border border-border/50">
              <strong className="text-foreground block mb-0.5">Optional Fields:</strong>
              <span>Priority (Need or Want), Description, Merchant / Payee, Reference Notes</span>
            </div>
          </div>
        </div>

        {/* Step 3: Upload Excel File */}
        <div className="rounded-xl border-2 border-dashed border-border bg-card p-5 sm:p-6 text-center hover:bg-muted/20 transition-colors shadow-2xs">
          <div className="flex items-center justify-center gap-1.5 font-bold text-sm mb-2 text-foreground">
            <span className="grid size-5 place-items-center rounded-full bg-primary text-[10px] text-primary-foreground font-bold">
              3
            </span>
            <span>Upload Completed Excel File</span>
          </div>
          <FileSpreadsheet className="mx-auto mb-2 text-primary" size={32} />
          <p className="text-sm font-bold text-foreground">Select your filled .xlsx spreadsheet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Supports .xlsx and .xls formats · Auto-validates and categorizes entries
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3.5 gap-2 text-xs font-semibold hover:border-primary/50 cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <FileUp size={15} /> Select Excel File (.xlsx)
          </Button>
          <input
            className="hidden"
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
        </div>

        {/* Error Notification */}
        {csvError && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive font-medium">
            {csvError}
          </div>
        )}

        {/* Preview Table */}
        {csvRows.length > 1 && !csvError && (
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-sm text-foreground">
                <span className="grid size-5 place-items-center rounded-full bg-emerald-600 text-[10px] text-white">
                  ✓
                </span>
                <span>Ready to Import: {validRowCount} Transactions</span>
              </div>
              <span className="text-xs text-muted-foreground">Previewing first 5 rows</span>
            </div>
            <div className="overflow-x-auto rounded-xl border border-border max-h-48 wt-scrollbar">
              <table className="w-full min-w-[500px] text-left text-xs">
                <thead className="bg-muted text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
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
        <div className="flex items-center justify-between border-t border-border/70 pt-3">
          <Button variant="ghost" onClick={onClose} className="text-xs">
            Cancel
          </Button>
          <Button
            disabled={validRowCount === 0 || csvError !== ""}
            onClick={onApplyImport}
            className="gap-2 text-xs font-semibold shadow-xs"
          >
            <FileUp size={15} />
            {validRowCount > 0 ? `Import ${validRowCount} Transactions` : "Import Transactions"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
