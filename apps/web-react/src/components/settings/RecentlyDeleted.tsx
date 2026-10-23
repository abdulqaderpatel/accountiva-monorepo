import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Trash2,
  RotateCcw,
  Search,
  FileText,
  Users,
  Package,
  Calculator,
  FileMinus,
  Loader2,
  CheckCircle2,
  X,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface TrashItem {
  id: string;
  entity_type: string;
  title?: string;
  name?: string;
  number?: string;
  deleted_at: string;
  deleted_by?: string;
}

export function RecentlyDeleted() {
  const { currentOrganization } = useAuth();
  const canPermanentlyDelete = ["owner", "admin"].includes(currentOrganization?.role || "");

  const [items, setItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Dialogs
  const [itemToDelete, setItemToDelete] = useState<TrashItem | null>(null);
  const [isDeletingPermanent, setIsDeletingPermanent] = useState(false);
  const [isPermanentModalOpen, setIsPermanentModalOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);

  const tabs = [
    { id: "all", label: "All Items", icon: Trash2 },
    { id: "invoices", label: "Invoices", icon: FileText },
    { id: "estimates", label: "Estimates", icon: Calculator },
    { id: "credit_notes", label: "Credit Notes", icon: FileMinus },
    { id: "customers", label: "Customers", icon: Users },
    { id: "items", label: "Products & Services", icon: Package },
  ];

  const fetchTrash = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (activeTab !== "all") params.type = activeTab;
      if (search.trim()) params.search = search.trim();

      const { data } = await api.get("/trash", { params });
      const list = Array.isArray(data) ? data : data?.data || data?.items || [];
      setItems(list);
    } catch {
      toast.error("Failed to load deleted records");
    } finally {
      setLoading(false);
    }
  }, [activeTab, search]);

  useEffect(() => {
    fetchTrash();
  }, [fetchTrash]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (activeTab !== "all" && item.entity_type !== activeTab) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const title = (item.title || item.name || item.number || "").toLowerCase();
        const type = (item.entity_type || "").toLowerCase();
        if (!title.includes(q) && !type.includes(q)) return false;
      }
      return true;
    });
  }, [items, activeTab, search]);

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredItems.map((i) => i.id));
    } else {
      setSelectedIds([]);
    }
  };

  const toggleSelectItem = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleRestore = async (item: TrashItem) => {
    try {
      await api.post("/trash/restore", {
        id: item.id,
        entityType: item.entity_type,
      });
      toast.success(`Restored ${item.title || item.name || item.entity_type}`);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      setSelectedIds((prev) => prev.filter((i) => i !== item.id));
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to restore record");
    }
  };

  const handleBulkRestore = async () => {
    const selected = filteredItems.filter((i) => selectedIds.includes(i.id));
    if (selected.length === 0) return;

    try {
      await api.post("/trash/restore", {
        items: selected.map((i) => ({ id: i.id, entityType: i.entity_type })),
      });
      toast.success(`Restored ${selected.length} items`);
      setItems((prev) => prev.filter((i) => !selectedIds.includes(i.id)));
      setSelectedIds([]);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to restore items");
    }
  };

  const handlePermanentDelete = async () => {
    if (!itemToDelete) return;
    try {
      setIsDeletingPermanent(true);
      await api.delete("/trash/permanent", {
        data: { id: itemToDelete.id, entityType: itemToDelete.entity_type },
      });
      toast.success("Record permanently deleted");
      setItems((prev) => prev.filter((i) => i.id !== itemToDelete.id));
      setSelectedIds((prev) => prev.filter((i) => i !== itemToDelete.id));
      setIsPermanentModalOpen(false);
      setItemToDelete(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to permanently delete record");
    } finally {
      setIsDeletingPermanent(false);
    }
  };

  const handleBulkPermanentDelete = async () => {
    const selected = filteredItems.filter((i) => selectedIds.includes(i.id));
    if (selected.length === 0) return;

    try {
      setIsBulkDeleting(true);
      await api.delete("/trash/permanent", {
        data: { items: selected.map((i) => ({ id: i.id, entityType: i.entity_type })) },
      });
      toast.success(`Permanently deleted ${selected.length} records`);
      setItems((prev) => prev.filter((i) => !selectedIds.includes(i.id)));
      setSelectedIds([]);
      setIsBulkModalOpen(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to delete records");
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-300">
      <Card className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-2xs py-0 gap-0">
        <CardHeader className="p-5 md:p-6 border-b border-border/50 bg-muted/10">
          <CardTitle className="text-sm md:text-base font-bold text-foreground">
            Recently Deleted
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground mt-0.5">
            Recover deleted records within your workspace data retention window, or delete them permanently.
          </CardDescription>
        </CardHeader>

        {/* Tab & Search Toolbar */}
        <div className="p-3.5 border-b border-border/60 bg-muted/15 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Category Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id);
                    setSelectedIds([]);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-60 shrink-0">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search deleted records..."
              className="h-8 pl-8 pr-7 text-xs bg-background border-border/60"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Bulk Action Header when items selected */}
        {selectedIds.length > 0 && (
          <div className="px-4 py-2 bg-primary/10 border-b border-primary/20 flex items-center justify-between gap-3">
            <span className="text-xs font-bold text-primary">
              {selectedIds.length} item{selectedIds.length > 1 ? "s" : ""} selected
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 px-2.5 text-xs font-semibold gap-1.5 cursor-pointer"
                onClick={handleBulkRestore}
              >
                <RotateCcw className="w-3 h-3 text-primary" />
                Restore Selected
              </Button>
              {canPermanentlyDelete && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="h-7 px-2.5 text-xs font-semibold gap-1.5 cursor-pointer"
                  onClick={() => setIsBulkModalOpen(true)}
                >
                  <Trash2 className="w-3 h-3" />
                  Delete Permanently
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Content Table */}
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12 px-4">
              <Trash2 className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-xs font-semibold text-foreground">Trash is empty</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Deleted invoices, estimates, credit notes, and customer records will appear here.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent bg-muted/10 border-border/60">
                  <TableHead className="w-10 py-2.5">
                    <Checkbox
                      checked={
                        filteredItems.length > 0 && selectedIds.length === filteredItems.length
                      }
                      onCheckedChange={(checked) => toggleSelectAll(Boolean(checked))}
                    />
                  </TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider py-2.5">Record</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider py-2.5">Category</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider py-2.5">Deleted At</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider py-2.5 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => {
                  const isSelected = selectedIds.includes(item.id);
                  return (
                    <TableRow key={item.id} className="border-border/50 hover:bg-muted/20">
                      <TableCell className="py-2.5">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelectItem(item.id)}
                        />
                      </TableCell>

                      <TableCell className="py-2.5">
                        <span className="text-xs font-semibold text-foreground">
                          {item.title || item.name || item.number || "Untitled Record"}
                        </span>
                      </TableCell>

                      <TableCell className="py-2.5">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-muted text-muted-foreground capitalize">
                          {item.entity_type.replace("_", " ")}
                        </span>
                      </TableCell>

                      <TableCell className="py-2.5 text-xs text-muted-foreground font-mono">
                        {formatDate(item.deleted_at)}
                      </TableCell>

                      <TableCell className="py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-[10px] font-bold uppercase tracking-wider text-primary hover:bg-primary/10 gap-1 cursor-pointer"
                            onClick={() => handleRestore(item)}
                          >
                            <RotateCcw className="w-3 h-3" />
                            Restore
                          </Button>
                          {canPermanentlyDelete && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-[10px] font-bold uppercase tracking-wider text-destructive hover:bg-destructive/10 gap-1 cursor-pointer"
                              onClick={() => {
                                setItemToDelete(item);
                                setIsPermanentModalOpen(true);
                              }}
                            >
                              <Trash2 className="w-3 h-3" />
                              Delete
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Single Permanent Confirmation Dialog */}
      <Dialog open={isPermanentModalOpen} onOpenChange={setIsPermanentModalOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-2xl bg-card border border-border">
          <div className="p-6 border-b border-border/40 bg-muted/20">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-destructive flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Permanently Delete Record
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-1">
                Are you sure you want to permanently delete{" "}
                <span className="text-foreground font-bold">
                  {itemToDelete?.title || itemToDelete?.name || itemToDelete?.entity_type}
                </span>?
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="p-5 text-xs text-destructive font-medium leading-relaxed bg-destructive/5 border-y border-destructive/15">
            This action cannot be undone. All database records associated with this item will be completely removed.
          </div>

          <DialogFooter className="p-4 bg-muted/15 border-t border-border/40 flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsPermanentModalOpen(false)}
              className="text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={isDeletingPermanent}
              onClick={handlePermanentDelete}
              className="text-xs font-bold gap-1.5"
            >
              {isDeletingPermanent ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5" />
              )}
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Permanent Delete Dialog */}
      <Dialog open={isBulkModalOpen} onOpenChange={setIsBulkModalOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-2xl bg-card border border-border">
          <div className="p-6 border-b border-border/40 bg-muted/20">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-destructive flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Permanently Delete {selectedIds.length} Records
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-1">
                This will permanently delete all selected items from the trash.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="p-5 text-xs text-destructive font-medium leading-relaxed bg-destructive/5 border-y border-destructive/15">
            This action is irreversible. All selected records will be erased forever.
          </div>

          <DialogFooter className="p-4 bg-muted/15 border-t border-border/40 flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsBulkModalOpen(false)}
              className="text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={isBulkDeleting}
              onClick={handleBulkPermanentDelete}
              className="text-xs font-bold gap-1.5"
            >
              {isBulkDeleting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5" />
              )}
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

