import React, { useState } from "react";
import { Outlet } from "@tanstack/react-router";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { GlobalSearch } from "./GlobalSearch";
import { KeyboardShortcutsDialog } from "./KeyboardShortcutsDialog";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

export function AppLayout() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const {
    isShortcutsDialogOpen,
    activeLeaderKey,
    navigationShortcuts,
    createShortcuts,
    generalShortcuts,
    openShortcutsDialog,
    closeShortcutsDialog,
    clearLeaderKey,
  } = useKeyboardShortcuts({
    onToggleSidebar: () => setIsCollapsed((prev) => !prev),
    onOpenSearch: () => setIsSearchOpen(true),
  });

  return (
    <div className="h-screen bg-background text-foreground flex flex-col overflow-hidden">
      {/* Full-width TopBar on top matching Vue */}
      <TopBar
        isCollapsed={isCollapsed}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenShortcuts={openShortcutsDialog}
      />

      {/* Main Row: Sidebar on left + Content area on right */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <Sidebar
          isCollapsed={isCollapsed}
          onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
        />
        <main className="flex-1 overflow-y-auto bg-background custom-scrollbar p-6">
          <Outlet />
        </main>
      </div>

      {/* Global Command Palette */}
      <GlobalSearch
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />

      {/* Keyboard Shortcuts Dialog & Floating HUD */}
      <KeyboardShortcutsDialog
        isOpen={isShortcutsDialogOpen}
        onClose={closeShortcutsDialog}
        activeLeaderKey={activeLeaderKey}
        onClearLeaderKey={clearLeaderKey}
        navigationShortcuts={navigationShortcuts}
        createShortcuts={createShortcuts}
        generalShortcuts={generalShortcuts}
      />
    </div>
  );
}
