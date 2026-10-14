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
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Sidebar */}
      <Sidebar
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          onOpenSearch={() => setIsSearchOpen(true)}
          onOpenShortcuts={openShortcutsDialog}
        />
        <main className="flex-1 p-6 overflow-y-auto">
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

