import React, { useState, useMemo } from "react";
import { Modal } from "@/components/ui/modal";
import {
  Keyboard,
  Search,
  Compass,
  PlusCircle,
  Command,
  X,
} from "lucide-react";
import { ShortcutDefinition } from "@/hooks/useKeyboardShortcuts";

interface KeyboardShortcutsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  activeLeaderKey: "g" | "c" | null;
  onClearLeaderKey: () => void;
  navigationShortcuts: ShortcutDefinition[];
  createShortcuts: ShortcutDefinition[];
  generalShortcuts: ShortcutDefinition[];
}

export function KeyboardShortcutsDialog({
  isOpen,
  onClose,
  activeLeaderKey,
  onClearLeaderKey,
  navigationShortcuts,
  createShortcuts,
  generalShortcuts,
}: KeyboardShortcutsDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "navigation" | "create" | "general">("all");

  const filterQuery = searchQuery.trim().toLowerCase();

  const filteredNav = useMemo(() => {
    if (!filterQuery) return navigationShortcuts;
    return navigationShortcuts.filter(
      (s) =>
        s.label.toLowerCase().includes(filterQuery) ||
        s.description.toLowerCase().includes(filterQuery) ||
        s.keys.join(" ").toLowerCase().includes(filterQuery)
    );
  }, [navigationShortcuts, filterQuery]);

  const filteredCreate = useMemo(() => {
    if (!filterQuery) return createShortcuts;
    return createShortcuts.filter(
      (s) =>
        s.label.toLowerCase().includes(filterQuery) ||
        s.description.toLowerCase().includes(filterQuery) ||
        s.keys.join(" ").toLowerCase().includes(filterQuery)
    );
  }, [createShortcuts, filterQuery]);

  const filteredGeneral = useMemo(() => {
    if (!filterQuery) return generalShortcuts;
    return generalShortcuts.filter(
      (s) =>
        s.label.toLowerCase().includes(filterQuery) ||
        s.description.toLowerCase().includes(filterQuery) ||
        s.keys.join(" ").toLowerCase().includes(filterQuery)
    );
  }, [generalShortcuts, filterQuery]);

  const hasAnyResults =
    filteredNav.length > 0 || filteredCreate.length > 0 || filteredGeneral.length > 0;

  return (
    <>
      {/* Modal Dialog */}
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        maxWidth="2xl"
      >
        <div data-shortcuts-dialog="true" className="-m-6 flex flex-col">
          {/* Header Area */}
          <div className="px-6 pt-6 pb-4 border-b border-border/80 bg-muted/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 shadow-2xs">
                <Keyboard className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold tracking-tight text-foreground">
                  Keyboard Shortcuts
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Navigate faster and execute actions across Accountiva using quick keys
                </p>
              </div>
            </div>

            {/* Filter Input & Tabs */}
            <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  type="text"
                  placeholder="Search shortcuts..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-background border border-input rounded-lg focus:outline-none focus:ring-1 focus:ring-ring text-foreground placeholder:text-muted-foreground"
                />
              </div>

              <div className="flex items-center gap-1 bg-muted p-1 rounded-lg shrink-0">
                {(["all", "navigation", "create", "general"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer capitalize ${
                      activeTab === tab
                        ? "bg-background text-foreground shadow-2xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Shortcuts Body */}
          <div className="max-h-[60vh] overflow-y-auto p-6 space-y-6">
            {!hasAnyResults && (
              <div className="py-12 text-center text-sm text-muted-foreground">
                No shortcuts found for "{searchQuery}"
              </div>
            )}

            {/* Navigation Section */}
            {(activeTab === "all" || activeTab === "navigation") && filteredNav.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  <Compass className="w-3.5 h-3.5 text-primary" />
                  <span>Navigation (Press sequentially)</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {filteredNav.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2.5 rounded-xl border border-border/60 bg-card hover:bg-muted/30 transition-colors"
                    >
                      <span className="text-xs font-medium text-foreground">{item.label}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        <kbd className="min-w-6 text-center px-1.5 py-0.5 text-[11px] font-semibold text-foreground bg-muted border border-border/80 rounded shadow-2xs">
                          {item.keys[0]}
                        </kbd>
                        <span className="text-[10px] text-muted-foreground font-bold">then</span>
                        <kbd className="min-w-6 text-center px-1.5 py-0.5 text-[11px] font-semibold text-foreground bg-muted border border-border/80 rounded shadow-2xs">
                          {item.keys[1]}
                        </kbd>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Quick Create Section */}
            {(activeTab === "all" || activeTab === "create") && filteredCreate.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  <PlusCircle className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Quick Create (Press sequentially)</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {filteredCreate.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2.5 rounded-xl border border-border/60 bg-card hover:bg-muted/30 transition-colors"
                    >
                      <span className="text-xs font-medium text-foreground">{item.label}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        <kbd className="min-w-6 text-center px-1.5 py-0.5 text-[11px] font-semibold text-foreground bg-muted border border-border/80 rounded shadow-2xs">
                          {item.keys[0]}
                        </kbd>
                        <span className="text-[10px] text-muted-foreground font-bold">then</span>
                        <kbd className="min-w-6 text-center px-1.5 py-0.5 text-[11px] font-semibold text-foreground bg-muted border border-border/80 rounded shadow-2xs">
                          {item.keys[1]}
                        </kbd>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* General Section */}
            {(activeTab === "all" || activeTab === "general") && filteredGeneral.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  <Command className="w-3.5 h-3.5 text-indigo-500" />
                  <span>General & Utilities</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {filteredGeneral.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2.5 rounded-xl border border-border/60 bg-card hover:bg-muted/30 transition-colors"
                    >
                      <span className="text-xs font-medium text-foreground">{item.label}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        {item.keys.map((k, idx) => (
                          <React.Fragment key={idx}>
                            <kbd className="min-w-6 text-center px-1.5 py-0.5 text-[11px] font-semibold text-foreground bg-muted border border-border/80 rounded shadow-2xs">
                              {k}
                            </kbd>
                            {idx < item.keys.length - 1 && item.keys.length > 1 && (
                              <span className="text-[10px] text-muted-foreground">+</span>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Footer Info */}
          <div className="px-6 py-3.5 border-t border-border/80 bg-muted/30 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Press{" "}
              <kbd className="px-1.5 py-0.5 bg-background border border-border/80 rounded text-[11px] font-bold text-foreground">
                Esc
              </kbd>{" "}
              to close
            </span>
            <span>
              Tip: Press{" "}
              <kbd className="px-1.5 py-0.5 bg-background border border-border/80 rounded text-[11px] font-bold text-foreground">
                ?
              </kbd>{" "}
              anywhere to open this cheat sheet
            </span>
          </div>
        </div>
      </Modal>

      {/* Floating HUD Pill during active leader key */}
      {activeLeaderKey && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] pointer-events-auto animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-card/95 backdrop-blur-md border border-border shadow-2xl text-foreground text-xs font-semibold ring-1 ring-border/50">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse shrink-0" />

            {activeLeaderKey === "g" && (
              <>
                <span className="text-muted-foreground font-normal">Go to:</span>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-muted border border-border rounded text-[10px] font-mono font-bold text-foreground">D</kbd> Dashboard
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-muted border border-border rounded text-[10px] font-mono font-bold text-foreground">I</kbd> Invoices
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-muted border border-border rounded text-[10px] font-mono font-bold text-foreground">E</kbd> Estimates
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-muted border border-border rounded text-[10px] font-mono font-bold text-foreground">C</kbd> Customers
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-muted border border-border rounded text-[10px] font-mono font-bold text-foreground">P</kbd> Items
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-muted border border-border rounded text-[10px] font-mono font-bold text-foreground">N</kbd> Notes
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-muted border border-border rounded text-[10px] font-mono font-bold text-foreground">S</kbd> Settings
                  </span>
                </div>
              </>
            )}

            {activeLeaderKey === "c" && (
              <>
                <span className="text-muted-foreground font-normal">Create:</span>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-muted border border-border rounded text-[10px] font-mono font-bold text-foreground">I</kbd> Invoice
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-muted border border-border rounded text-[10px] font-mono font-bold text-foreground">E</kbd> Estimate
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-muted border border-border rounded text-[10px] font-mono font-bold text-foreground">C</kbd> Customer
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-muted border border-border rounded text-[10px] font-mono font-bold text-foreground">P</kbd> Item
                  </span>
                </div>
              </>
            )}

            <button
              type="button"
              onClick={onClearLeaderKey}
              className="ml-1 p-0.5 text-muted-foreground hover:text-foreground rounded cursor-pointer"
              title="Cancel (Esc)"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
