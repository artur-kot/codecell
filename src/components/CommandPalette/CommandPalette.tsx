import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Command, Search, ArrowUp, ArrowDown, CornerDownLeft } from "lucide-react";

export interface PaletteCommand {
  id: string;
  label: string;
  description?: string;
  shortcut?: string;
  icon?: React.ReactNode;
  action: () => void;
  category?: string;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  commands: PaletteCommand[];
}

// Simple fuzzy match function
function fuzzyMatch(text: string, query: string): boolean {
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();

  let queryIndex = 0;
  for (let i = 0; i < lowerText.length && queryIndex < lowerQuery.length; i++) {
    if (lowerText[i] === lowerQuery[queryIndex]) {
      queryIndex++;
    }
  }
  return queryIndex === lowerQuery.length;
}

// Score matches for sorting (exact > starts with > contains > fuzzy)
function scoreMatch(text: string, query: string): number {
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();

  if (lowerText === lowerQuery) return 100;
  if (lowerText.startsWith(lowerQuery)) return 80;
  if (lowerText.includes(lowerQuery)) return 60;
  if (fuzzyMatch(text, query)) return 40;
  return 0;
}

export function CommandPalette({ isOpen, onClose, commands }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Filter and sort commands based on query
  const filteredCommands = useMemo(() => {
    if (!query.trim()) return commands;

    return commands
      .map((cmd) => ({
        cmd,
        score: Math.max(
          scoreMatch(cmd.label, query),
          scoreMatch(cmd.description || "", query) * 0.8,
          scoreMatch(cmd.category || "", query) * 0.6
        ),
      }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .map(({ cmd }) => cmd);
  }, [commands, query]);

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedItem = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      selectedItem?.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, filteredCommands.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            filteredCommands[selectedIndex].action();
            onClose();
          }
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
      }
    },
    [filteredCommands, selectedIndex, onClose]
  );

  // Execute command on click
  const handleCommandClick = useCallback(
    (command: PaletteCommand) => {
      command.action();
      onClose();
    },
    [onClose]
  );

  if (!isOpen) return null;

  // Group commands by category
  const groupedCommands: { category: string; commands: PaletteCommand[] }[] = [];
  let currentCategory = "";
  let currentGroup: PaletteCommand[] = [];

  filteredCommands.forEach((cmd) => {
    const category = cmd.category || "Commands";
    if (category !== currentCategory) {
      if (currentGroup.length > 0) {
        groupedCommands.push({ category: currentCategory, commands: currentGroup });
      }
      currentCategory = category;
      currentGroup = [cmd];
    } else {
      currentGroup.push(cmd);
    }
  });
  if (currentGroup.length > 0) {
    groupedCommands.push({ category: currentCategory, commands: currentGroup });
  }

  // Calculate global index for keyboard navigation
  let globalIndex = -1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-crust/80 pt-[15vh] backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-xl overflow-hidden rounded-xl border border-border bg-base shadow-2xl animate-fade-in">
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Command className="h-5 w-5 text-accent" strokeWidth={1.5} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search..."
            className="flex-1 bg-transparent font-mono text-sm text-text placeholder:text-text-subtle outline-none"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
          <kbd className="hidden rounded border border-border bg-surface-0 px-1.5 py-0.5 font-mono text-[10px] text-text-subtle sm:inline">
            ESC
          </kbd>
        </div>

        {/* Command list */}
        <div ref={listRef} className="max-h-80 overflow-y-auto p-2">
          {filteredCommands.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8">
              <Search className="h-8 w-8 text-text-subtle" strokeWidth={1} />
              <p className="font-mono text-sm text-text-muted">No commands found</p>
              <p className="font-mono text-xs text-text-subtle">
                Try a different search term
              </p>
            </div>
          ) : (
            groupedCommands.map(({ category, commands: cmds }) => (
              <div key={category}>
                <div className="px-2 py-1.5">
                  <span className="font-mono text-[10px] font-medium uppercase tracking-wider text-text-subtle">
                    {category}
                  </span>
                </div>
                {cmds.map((cmd) => {
                  globalIndex++;
                  const index = globalIndex;
                  const isSelected = index === selectedIndex;

                  return (
                    <button
                      key={cmd.id}
                      data-index={index}
                      onClick={() => handleCommandClick(cmd)}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                        isSelected
                          ? "bg-accent/10 text-text"
                          : "text-text-muted hover:bg-surface-0/50"
                      }`}
                    >
                      {cmd.icon && (
                        <span className={isSelected ? "text-accent" : "text-text-muted"}>
                          {cmd.icon}
                        </span>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className={`font-mono text-sm ${isSelected ? "text-text" : ""}`}>
                          {cmd.label}
                        </p>
                        {cmd.description && (
                          <p className="truncate font-mono text-xs text-text-subtle">
                            {cmd.description}
                          </p>
                        )}
                      </div>
                      {cmd.shortcut && (
                        <kbd className="shrink-0 rounded border border-border bg-surface-0 px-1.5 py-0.5 font-mono text-[10px] text-text-subtle">
                          {cmd.shortcut}
                        </kbd>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer hints */}
        <div className="flex items-center gap-4 border-t border-border bg-mantle px-4 py-2">
          <div className="flex items-center gap-1.5 text-text-subtle">
            <ArrowUp className="h-3 w-3" />
            <ArrowDown className="h-3 w-3" />
            <span className="font-mono text-[10px]">navigate</span>
          </div>
          <div className="flex items-center gap-1.5 text-text-subtle">
            <CornerDownLeft className="h-3 w-3" />
            <span className="font-mono text-[10px]">select</span>
          </div>
          <div className="flex items-center gap-1.5 text-text-subtle">
            <span className="font-mono text-[10px]">esc</span>
            <span className="font-mono text-[10px]">close</span>
          </div>
        </div>
      </div>
    </div>
  );
}
