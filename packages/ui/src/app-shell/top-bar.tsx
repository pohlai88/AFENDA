"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bell,
  Command,
  Keyboard,
  HelpCircle,
  MoreHorizontal,
  Moon,
  Search,
  Settings,
  Sun,
} from "lucide-react";
import {
  Breadcrumb,
  Badge,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  Button,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  ScrollArea,
  Separator,
  SidebarTrigger,
  Tabs,
  TabsList,
  TabsTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../components";
import type { AppShellBreadcrumbItem, AppShellNavMainItem, AppShellNotification } from "./types";

type DomainNavItem = NonNullable<AppShellNavMainItem["items"]>[number];
type ThemeMode = "light" | "dark" | "system";

type ShortcutDefinition = {
  id: string;
  label: string;
  defaultWindows: string;
  defaultMac: string;
};

type ParsedShortcut = {
  key: string;
  ctrl: boolean;
  meta: boolean;
  shift: boolean;
  alt: boolean;
};

type ShortcutValidationResult = {
  isValid: boolean;
  errors: string[];
};

const SHORTCUTS_STORAGE_KEY = "afenda-shortcuts-map";
const SHORTCUTS_PAGE_SIZE = 8;

function serializeShortcutMap(map: Record<string, string>): string {
  const entries = Object.entries(map)
    .filter(([, value]) => value.trim().length > 0)
    .sort(([a], [b]) => a.localeCompare(b));
  return JSON.stringify(Object.fromEntries(entries));
}

const UNIVERSAL_SHORTCUTS: ShortcutDefinition[] = [
  { id: "open-command-palette", label: "Open Command Palette", defaultWindows: "Ctrl+K", defaultMac: "Cmd+K" },
  { id: "global-search", label: "Global Search", defaultWindows: "Ctrl+P", defaultMac: "Cmd+P" },
  { id: "open-shortcuts", label: "Open Keyboard Shortcuts", defaultWindows: "Ctrl+/", defaultMac: "Cmd+/" },
  { id: "new-record", label: "New Record", defaultWindows: "Ctrl+N", defaultMac: "Cmd+N" },
  { id: "save", label: "Save", defaultWindows: "Ctrl+S", defaultMac: "Cmd+S" },
  { id: "save-as", label: "Save As", defaultWindows: "Ctrl+Shift+S", defaultMac: "Cmd+Shift+S" },
  { id: "print", label: "Print", defaultWindows: "Ctrl+Shift+P", defaultMac: "Cmd+Shift+P" },
  { id: "undo", label: "Undo", defaultWindows: "Ctrl+Z", defaultMac: "Cmd+Z" },
  { id: "redo", label: "Redo", defaultWindows: "Ctrl+Y", defaultMac: "Cmd+Shift+Z" },
  { id: "cut", label: "Cut", defaultWindows: "Ctrl+X", defaultMac: "Cmd+X" },
  { id: "copy", label: "Copy", defaultWindows: "Ctrl+C", defaultMac: "Cmd+C" },
  { id: "paste", label: "Paste", defaultWindows: "Ctrl+V", defaultMac: "Cmd+V" },
  { id: "select-all", label: "Select All", defaultWindows: "Ctrl+A", defaultMac: "Cmd+A" },
  { id: "find", label: "Find", defaultWindows: "Ctrl+F", defaultMac: "Cmd+F" },
  { id: "find-next", label: "Find Next", defaultWindows: "F3", defaultMac: "Cmd+G" },
  { id: "replace", label: "Replace", defaultWindows: "Ctrl+H", defaultMac: "Cmd+Option+F" },
  { id: "open-settings", label: "Open Settings", defaultWindows: "Ctrl+,", defaultMac: "Cmd+," },
  { id: "open-help", label: "Open Help", defaultWindows: "F1", defaultMac: "F1" },
  { id: "toggle-theme", label: "Toggle Theme", defaultWindows: "Ctrl+Shift+L", defaultMac: "Cmd+Shift+L" },
  { id: "toggle-sidebar", label: "Toggle Sidebar", defaultWindows: "Ctrl+B", defaultMac: "Cmd+B" },
  { id: "open-notifications", label: "Open Notifications", defaultWindows: "Ctrl+I", defaultMac: "Cmd+I" },
  { id: "open-domain-menu", label: "Open Domain Menu", defaultWindows: "Ctrl+.", defaultMac: "Cmd+." },
  { id: "go-dashboard", label: "Go To Dashboard", defaultWindows: "Alt+1", defaultMac: "Option+1" },
  { id: "go-finance", label: "Go To Finance", defaultWindows: "Alt+2", defaultMac: "Option+2" },
  { id: "go-governance", label: "Go To Governance", defaultWindows: "Alt+3", defaultMac: "Option+3" },
  { id: "go-back", label: "Navigate Back", defaultWindows: "Alt+Left", defaultMac: "Cmd+[" },
  { id: "go-forward", label: "Navigate Forward", defaultWindows: "Alt+Right", defaultMac: "Cmd+]" },
  { id: "refresh", label: "Refresh View", defaultWindows: "Ctrl+R", defaultMac: "Cmd+R" },
  { id: "close-dialog", label: "Close Dialog", defaultWindows: "Esc", defaultMac: "Esc" },
  { id: "open-profile-menu", label: "Open Profile Menu", defaultWindows: "Ctrl+M", defaultMac: "Cmd+M" },
];

function isMacPlatform(): boolean {
  if (typeof window === "undefined") return false;
  return /Mac|iPhone|iPad|iPod/i.test(window.navigator.platform);
}

function commandShortcutLabel(isMac: boolean): string {
  return isMac ? "Cmd+K" : "Ctrl+K";
}

function defaultShortcutFor(definition: ShortcutDefinition, isMac: boolean): string {
  return isMac ? definition.defaultMac : definition.defaultWindows;
}

function normalizeShortcutText(shortcut: string): string {
  const tokens = shortcut
    .split("+")
    .map((token) => token.trim())
    .filter(Boolean)
    .map((token) => {
      const normalized = token.toLowerCase();
      if (normalized === "?") return "/";
      return token;
    });

  return tokens.join("+");
}

function parseShortcut(shortcut: string): ParsedShortcut | null {
  const rawTokens = normalizeShortcutText(shortcut)
    .split("+")
    .map((token) => token.trim())
    .filter(Boolean);

  if (rawTokens.length === 0) return null;

  let key = "";
  let ctrl = false;
  let meta = false;
  let shift = false;
  let alt = false;

  for (const token of rawTokens) {
    const normalized = token.toLowerCase();
    if (normalized === "ctrl" || normalized === "control") {
      ctrl = true;
      continue;
    }
    if (normalized === "cmd" || normalized === "meta") {
      meta = true;
      continue;
    }
    if (normalized === "shift") {
      shift = true;
      continue;
    }
    if (normalized === "alt" || normalized === "option") {
      alt = true;
      continue;
    }
    if (normalized === "left") {
      key = "arrowleft";
      continue;
    }
    if (normalized === "right") {
      key = "arrowright";
      continue;
    }
    if (normalized === "up") {
      key = "arrowup";
      continue;
    }
    if (normalized === "down") {
      key = "arrowdown";
      continue;
    }
    if (normalized === "esc") {
      key = "escape";
      continue;
    }
    if (normalized === "?") {
      key = "/";
      continue;
    }
    key = normalized;
  }

  if (!key) return null;

  return { key, ctrl, meta, shift, alt };
}

function normalizeEventKey(key: string): string {
  if (key === "?") return "/";
  if (key === " ") return "space";
  if (key.length === 1) return key.toLowerCase();
  return key.toLowerCase();
}

function isRecognizedShortcutKey(key: string): boolean {
  if (key.length === 1) return true;

  const knownKeys = new Set([
    "escape",
    "space",
    "tab",
    "enter",
    "backspace",
    "delete",
    "arrowleft",
    "arrowright",
    "arrowup",
    "arrowdown",
    "home",
    "end",
    "pageup",
    "pagedown",
    "insert",
  ]);

  if (knownKeys.has(key)) return true;
  return /^f([1-9]|1[0-2])$/.test(key);
}

function validateShortcutInput(value: string): ShortcutValidationResult {
  const trimmed = value.trim();
  if (!trimmed) return { isValid: true, errors: [] };

  const errors: string[] = [];
  const tokens = trimmed
    .split("+")
    .map((token) => token.trim())
    .filter(Boolean);

  if (tokens.length === 0) {
    return { isValid: false, errors: ["Shortcut cannot be empty."] };
  }

  if (tokens.length > 4) {
    errors.push("Use at most 4 keys in a shortcut.");
  }

  const modifierTokens = new Set(["ctrl", "control", "cmd", "meta", "shift", "alt", "option"]);
  let actionKeyCount = 0;
  let modifiersCount = 0;
  let actionKey = "";

  for (const token of tokens) {
    const normalized = token.toLowerCase();
    if (modifierTokens.has(normalized)) {
      modifiersCount += 1;
      continue;
    }

    actionKeyCount += 1;
    actionKey = parseShortcut(token)?.key ?? normalized;
  }

  if (actionKeyCount === 0) {
    errors.push("Include one action key (for example: K, F1, or .).");
  }

  if (actionKeyCount > 1) {
    errors.push("Only one action key is allowed.");
  }

  if (actionKey && !isRecognizedShortcutKey(actionKey)) {
    errors.push("Use a recognized key (letters, numbers, arrows, punctuation, Esc, or F1-F12).");
  }

  if (actionKeyCount === 1 && modifiersCount === 0 && !/^f([1-9]|1[0-2])$/.test(actionKey) && actionKey !== "escape") {
    errors.push("Add at least one modifier key (Ctrl/Cmd/Alt/Shift). Only Esc and F1-F12 can be single-key.");
  }

  return { isValid: errors.length === 0, errors };
}

function matchesShortcut(event: KeyboardEvent, parsed: ParsedShortcut | null): boolean {
  if (!parsed) return false;
  return (
    normalizeEventKey(event.key) === parsed.key &&
    event.ctrlKey === parsed.ctrl &&
    event.metaKey === parsed.meta &&
    event.shiftKey === parsed.shift &&
    event.altKey === parsed.alt
  );
}

function applyTheme(mode: ThemeMode): void {
  if (typeof window === "undefined") return;

  const root = window.document.documentElement;
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const shouldUseDark = mode === "dark" || (mode === "system" && prefersDark);

  root.classList.toggle("dark", shouldUseDark);
  root.style.colorScheme = shouldUseDark ? "dark" : "light";
  root.setAttribute("data-theme-mode", mode);
  window.localStorage.setItem("afenda-theme-mode", mode);
}

function nextThemeMode(current: ThemeMode): ThemeMode {
  if (current === "light") return "dark";
  if (current === "dark") return "system";
  return "light";
}

export function AppShellTopBar({
  title,
  breadcrumbs,
  navMain,
  notifications,
  onNotificationsChange,
  currentPathname,
}: {
  title: string;
  breadcrumbs?: AppShellBreadcrumbItem[];
  navMain?: AppShellNavMainItem[];
  notifications?: AppShellNotification[];
  onNotificationsChange?: (notifications: AppShellNotification[]) => void;
  currentPathname?: string;
}) {
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [themeMode, setThemeMode] = useState<ThemeMode>("system");
  const [isMac, setIsMac] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuQuery, setMenuQuery] = useState("");
  const [notificationQuery, setNotificationQuery] = useState("");
  const [notificationView, setNotificationView] = useState<"all" | "unread">("all");
  const [notificationItems, setNotificationItems] = useState<AppShellNotification[]>(notifications ?? []);
    useEffect(() => {
      setNotificationItems(notifications ?? []);
    }, [notifications]);

  const [customShortcuts, setCustomShortcuts] = useState<Record<string, string>>({});
  const [savedShortcuts, setSavedShortcuts] = useState<Record<string, string>>({});
  const [shortcutsQuery, setShortcutsQuery] = useState("");
  const [shortcutsPage, setShortcutsPage] = useState(1);

  useEffect(() => {
    setIsMac(isMacPlatform());

    const persistedTheme = window.localStorage.getItem("afenda-theme-mode");
    const initialMode: ThemeMode =
      persistedTheme === "light" || persistedTheme === "dark" || persistedTheme === "system"
        ? persistedTheme
        : "system";

    setThemeMode(initialMode);
    applyTheme(initialMode);

    const serializedShortcuts = window.localStorage.getItem(SHORTCUTS_STORAGE_KEY);
    if (serializedShortcuts) {
      try {
        const parsed = JSON.parse(serializedShortcuts) as Record<string, string>;
        setCustomShortcuts(parsed);
        setSavedShortcuts(parsed);
      } catch {
        setCustomShortcuts({});
        setSavedShortcuts({});
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(SHORTCUTS_STORAGE_KEY, JSON.stringify(savedShortcuts));
  }, [savedShortcuts]);

  const shortcutValidation = useMemo(() => {
    const map: Record<string, ShortcutValidationResult> = {};
    for (const definition of UNIVERSAL_SHORTCUTS) {
      map[definition.id] = validateShortcutInput(customShortcuts[definition.id] ?? "");
    }
    return map;
  }, [customShortcuts]);

  const draftEffectiveShortcuts = useMemo(() => {
    const map: Record<string, string> = {};
    for (const definition of UNIVERSAL_SHORTCUTS) {
      const custom = normalizeShortcutText(customShortcuts[definition.id] ?? "").trim();
      const validation = shortcutValidation[definition.id];
      map[definition.id] = custom && validation?.isValid ? custom : defaultShortcutFor(definition, isMac);
    }
    return map;
  }, [customShortcuts, isMac, shortcutValidation]);

  const effectiveShortcuts = useMemo(() => {
    const map: Record<string, string> = {};
    for (const definition of UNIVERSAL_SHORTCUTS) {
      const saved = (savedShortcuts[definition.id] ?? "").trim();
      const validation = validateShortcutInput(saved);
      map[definition.id] = saved && validation.isValid ? saved : defaultShortcutFor(definition, isMac);
    }
    return map;
  }, [isMac, savedShortcuts]);

  const shortcutConflicts = useMemo(() => {
    const valueToIds = new Map<string, string[]>();
    for (const definition of UNIVERSAL_SHORTCUTS) {
      const value = (
        draftEffectiveShortcuts[definition.id] ?? defaultShortcutFor(definition, isMac)
      ).toLowerCase();
      const existing = valueToIds.get(value) ?? [];
      existing.push(definition.id);
      valueToIds.set(value, existing);
    }

    const conflictSet = new Set<string>();
    for (const [, ids] of valueToIds) {
      if (ids.length > 1) {
        ids.forEach((id) => conflictSet.add(id));
      }
    }
    return conflictSet;
  }, [draftEffectiveShortcuts, isMac]);

  const filteredShortcutDefinitions = useMemo(() => {
    const q = shortcutsQuery.trim().toLowerCase();
    if (!q) return UNIVERSAL_SHORTCUTS;
    return UNIVERSAL_SHORTCUTS.filter((definition) => {
      const defaultValue = defaultShortcutFor(definition, isMac).toLowerCase();
      const activeValue = (
        draftEffectiveShortcuts[definition.id] ?? defaultShortcutFor(definition, isMac)
      ).toLowerCase();
      return (
        definition.label.toLowerCase().includes(q) ||
        defaultValue.includes(q) ||
        activeValue.includes(q)
      );
    });
  }, [draftEffectiveShortcuts, isMac, shortcutsQuery]);

  const totalShortcutPages = Math.max(
    1,
    Math.ceil(filteredShortcutDefinitions.length / SHORTCUTS_PAGE_SIZE)
  );

  const pagedShortcutDefinitions = useMemo(() => {
    const start = (shortcutsPage - 1) * SHORTCUTS_PAGE_SIZE;
    return filteredShortcutDefinitions.slice(start, start + SHORTCUTS_PAGE_SIZE);
  }, [filteredShortcutDefinitions, shortcutsPage]);

  useEffect(() => {
    setShortcutsPage(1);
  }, [shortcutsQuery]);

  useEffect(() => {
    if (shortcutsPage > totalShortcutPages) {
      setShortcutsPage(totalShortcutPages);
    }
  }, [shortcutsPage, totalShortcutPages]);

  const commandPaletteShortcut = effectiveShortcuts["open-command-palette"] || commandShortcutLabel(isMac);
  const shortcutsPanelShortcut = effectiveShortcuts["open-shortcuts"] || (isMac ? "Cmd+/" : "Ctrl+/");
  const notificationsPanelShortcut =
    effectiveShortcuts["open-notifications"] || (isMac ? "Cmd+I" : "Ctrl+I");
  const keyboardShortcutParts = normalizeShortcutText(shortcutsPanelShortcut)
    .split("+")
    .map((part) => part.trim());
  const parsedCommandPaletteShortcut = useMemo(
    () => parseShortcut(commandPaletteShortcut),
    [commandPaletteShortcut]
  );
  const parsedShortcutsPanelShortcut = useMemo(
    () => parseShortcut(shortcutsPanelShortcut),
    [shortcutsPanelShortcut]
  );
  const parsedNotificationsPanelShortcut = useMemo(
    () => parseShortcut(notificationsPanelShortcut),
    [notificationsPanelShortcut]
  );

  const unreadNotificationsCount = useMemo(
    () => notificationItems.filter((notification) => !notification.read).length,
    [notificationItems]
  );

  const filteredNotifications = useMemo(() => {
    const q = notificationQuery.trim().toLowerCase();
    return notificationItems.filter((notification) => {
      const matchView = notificationView === "all" || !notification.read;
      if (!matchView) return false;
      if (!q) return true;
      return (
        notification.title.toLowerCase().includes(q) ||
        notification.description.toLowerCase().includes(q) ||
        (notification.category ?? "general").toLowerCase().includes(q)
      );
    });
  }, [notificationItems, notificationQuery, notificationView]);

  useEffect(() => {
    const onKeydown = (event: KeyboardEvent) => {
      if (matchesShortcut(event, parsedShortcutsPanelShortcut)) {
        event.preventDefault();
        setIsShortcutsOpen((open) => !open);
        return;
      }

      if (matchesShortcut(event, parsedNotificationsPanelShortcut)) {
        event.preventDefault();
        setIsNotificationsOpen((open) => !open);
        return;
      }

      if (matchesShortcut(event, parsedCommandPaletteShortcut)) {
        event.preventDefault();
        setIsCommandOpen((open) => !open);
      }
    };

    window.addEventListener("keydown", onKeydown);
    return () => window.removeEventListener("keydown", onKeydown);
  }, [parsedCommandPaletteShortcut, parsedNotificationsPanelShortcut, parsedShortcutsPanelShortcut]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const onMediaChange = () => {
      if (themeMode === "system") {
        applyTheme("system");
      }
    };

    mediaQuery.addEventListener("change", onMediaChange);
    return () => mediaQuery.removeEventListener("change", onMediaChange);
  }, [themeMode]);

  const breadcrumbItems = useMemo(() => {
    if (breadcrumbs && breadcrumbs.length > 0) return breadcrumbs;
    return [{ label: title }];
  }, [breadcrumbs, title]);

  const pathname = currentPathname || "/";
  const shortcut = commandPaletteShortcut;

  const activeDomain = useMemo(() => {
    if (!navMain || navMain.length === 0) return undefined;

    const matches = navMain.filter((item) => {
      if (item.url === "/") return pathname === "/";
      return pathname === item.url || pathname.startsWith(`${item.url}/`);
    });

    return matches.sort((a, b) => b.url.length - a.url.length)[0];
  }, [navMain, pathname]);

  const domainItems = useMemo<DomainNavItem[]>(() => {
    if (!activeDomain?.items || activeDomain.items.length === 0) {
      return [];
    }

    return activeDomain.items;
  }, [activeDomain]);

  const filteredDomainItems = useMemo(() => {
    const q = menuQuery.trim().toLowerCase();
    if (!q) return domainItems;
    return domainItems.filter((item) => item.title.toLowerCase().includes(q));
  }, [domainItems, menuQuery]);

  const navigateTo = (url: string) => {
    if (typeof window === "undefined") return;
    window.location.assign(url);
  };

  const handleThemeToggle = () => {
    setThemeMode((current) => {
      const next = nextThemeMode(current);
      applyTheme(next);
      return next;
    });
  };

  const ThemeIcon = themeMode === "dark" ? Moon : Sun;

  const hasValidationErrors = useMemo(
    () =>
      UNIVERSAL_SHORTCUTS.some((definition) => {
        const current = (customShortcuts[definition.id] ?? "").trim();
        return current.length > 0 && !shortcutValidation[definition.id]?.isValid;
      }),
    [customShortcuts, shortcutValidation]
  );

  const hasConflictErrors = shortcutConflicts.size > 0;

  const hasUnsavedChanges =
    serializeShortcutMap(customShortcuts) !== serializeShortcutMap(savedShortcuts);

  const setCustomShortcut = (id: string, value: string) => {
    setCustomShortcuts((current) => ({ ...current, [id]: normalizeShortcutText(value) }));
  };

  const updateNotifications = (updater: (current: AppShellNotification[]) => AppShellNotification[]) => {
    setNotificationItems((current) => {
      const next = updater(current);
      onNotificationsChange?.(next);
      return next;
    });
  };

  const markNotificationAsRead = (id: string) => {
    updateNotifications((current) =>
      current.map((notification) =>
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
  };

  const toggleNotificationRead = (id: string) => {
    updateNotifications((current) =>
      current.map((notification) =>
        notification.id === id ? { ...notification, read: !notification.read } : notification
      )
    );
  };

  const dismissNotification = (id: string) => {
    updateNotifications((current) => current.filter((notification) => notification.id !== id));
  };

  const markAllNotificationsAsRead = () => {
    updateNotifications((current) => current.map((notification) => ({ ...notification, read: true })));
  };

  const clearAllNotifications = () => {
    updateNotifications(() => []);
  };

  const resetShortcut = (id: string) => {
    setCustomShortcuts((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  };

  const resetAllShortcuts = () => {
    setCustomShortcuts({});
  };

  const saveShortcuts = () => {
    if (hasValidationErrors || hasConflictErrors) {
      return;
    }

    const nextSaved: Record<string, string> = {};
    for (const definition of UNIVERSAL_SHORTCUTS) {
      const value = normalizeShortcutText(customShortcuts[definition.id] ?? "").trim();
      if (!value) continue;
      if (!shortcutValidation[definition.id]?.isValid) continue;
      if (shortcutConflicts.has(definition.id)) continue;
      nextSaved[definition.id] = value;
    }

    setSavedShortcuts(nextSaved);
    setCustomShortcuts(nextSaved);
  };

  return (
    <>
      <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-background/95 px-3 backdrop-blur md:px-4">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <SidebarTrigger className="size-8" />
          <Separator orientation="vertical" className="mx-1 h-5" />

          <Breadcrumb>
            <BreadcrumbList>
              {breadcrumbItems.map((item, index) => {
                const isLast = index === breadcrumbItems.length - 1;
                const key = `${item.label}-${index}`;

                return (
                  <Fragment key={key}>
                    <BreadcrumbItem>
                      {item.href && !isLast ? (
                        <BreadcrumbLink href={item.href}>{item.label}</BreadcrumbLink>
                      ) : (
                        <BreadcrumbPage>{item.label}</BreadcrumbPage>
                      )}
                    </BreadcrumbItem>
                    {!isLast ? <BreadcrumbSeparator /> : null}
                  </Fragment>
                );
              })}
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        <div className="hidden flex-1 justify-center md:flex">
          <Button
            type="button"
            variant="outline"
            className="h-9 w-full max-w-xl justify-center px-3 text-muted-foreground"
            onClick={() => setIsCommandOpen(true)}
          >
            <span className="inline-flex w-full items-center justify-center gap-3 truncate text-sm">
              <Search className="size-4" />
              <span className="tracking-wide">AFENDA</span>
              <kbd className="inline-flex items-center gap-1.5 rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-foreground">
                <Command className="size-3.5" />
                <span>K</span>
              </kbd>
            </span>
          </Button>
        </div>

        <div className="flex items-center gap-1 md:flex-1 md:justify-end">
          <Popover open={isShortcutsOpen} onOpenChange={setIsShortcutsOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="hidden h-8 items-center gap-2 px-2 text-xs md:inline-flex"
              >
                <Keyboard className="size-3.5" />
                <span>Shortcuts</span>
                <span className="inline-flex items-center gap-1">
                  {keyboardShortcutParts.map((part) => (
                    <kbd
                      key={part}
                      className="rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-foreground"
                    >
                      {part}
                    </kbd>
                  ))}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              collisionPadding={8}
              className="flex w-[calc(100vw-1rem)] max-w-5xl max-h-[calc(100vh-4rem)] flex-col overflow-hidden p-0"
            >
              <div className="flex items-center justify-between border-b px-3 py-2">
                <div>
                  <p className="text-sm font-medium">Keyboard Shortcuts</p>
                  <p className="text-xs text-muted-foreground">30 universal defaults with strict validation and custom mappings</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    className="transition-transform active:scale-95"
                    onClick={resetAllShortcuts}
                  >
                    Reset all
                  </Button>
                  <Button
                    type="button"
                    size="xs"
                    className="transition-transform active:scale-95"
                    onClick={saveShortcuts}
                    disabled={!hasUnsavedChanges || hasValidationErrors || hasConflictErrors}
                  >
                    Save
                  </Button>
                </div>
              </div>

              <div className="grid border-b md:grid-cols-2">
                <div className="border-b bg-muted/20 px-3 py-2 text-xs md:border-b-0 md:border-r">
                  <div className="mb-1 inline-flex items-center gap-1 font-medium text-foreground">
                    <AlertTriangle className="size-3.5" />
                    Validation Rules
                  </div>
                  <div className="text-muted-foreground">
                    Format as `Ctrl+K` or `Cmd+Shift+P`. One action key only. Max 4 keys. Use modifiers for single-character keys. Esc/F1-F12 may be single-key.
                  </div>
                  {hasUnsavedChanges ? (
                    <div className="mt-1 text-warning">Unsaved changes are present. Click Save to persist.</div>
                  ) : (
                    <div className="mt-1 text-success">All shortcut changes are saved.</div>
                  )}
                </div>

                <div className="px-3 py-2">
                  <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Search
                  </div>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={shortcutsQuery}
                      onChange={(event) => setShortcutsQuery(event.target.value)}
                      className="h-8 pl-7"
                      placeholder="Search shortcuts, labels, or key combos"
                    />
                  </div>
                </div>
              </div>

              <div className="min-h-0 flex-1 grid grid-cols-1 divide-y md:grid-cols-2 md:divide-x md:divide-y-0">
                <div className="space-y-1 overflow-y-auto p-2">
                  <div className="px-2 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Default
                  </div>
                  {pagedShortcutDefinitions.map((definition) => {
                    const parts = defaultShortcutFor(definition, isMac)
                      .split("+")
                      .map((part) => part.trim());
                    return (
                      <div
                        key={`default-${definition.id}`}
                        className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm"
                      >
                        <span>{definition.label}</span>
                        <span className="inline-flex items-center gap-1">
                          {parts.map((keyPart) => (
                            <kbd
                              key={`${definition.id}-default-${keyPart}`}
                              className="rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-foreground"
                            >
                              {keyPart}
                            </kbd>
                          ))}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="space-y-2 overflow-y-auto p-2">
                  <div className="px-2 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Customize
                  </div>
                  {pagedShortcutDefinitions.map((definition) => (
                    <div
                      key={`custom-${definition.id}`}
                      className="rounded-md border bg-card px-2 py-2"
                    >
                      {(() => {
                        const validation =
                          shortcutValidation[definition.id] ?? ({ isValid: true, errors: [] } as ShortcutValidationResult);
                        return (
                          <>
                      <div className="mb-1 text-sm font-medium">{definition.label}</div>
                      <div className="flex items-center gap-2">
                        <Input
                          value={customShortcuts[definition.id] ?? ""}
                          onChange={(event) => setCustomShortcut(definition.id, event.target.value)}
                          placeholder={defaultShortcutFor(definition, isMac)}
                          className="h-8"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="xs"
                          className="transition-transform active:scale-95"
                          onClick={() => resetShortcut(definition.id)}
                        >
                          Reset
                        </Button>
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Active: {effectiveShortcuts[definition.id]}
                      </p>
                      {!validation.isValid ? (
                        <p className="mt-1 text-[11px] text-destructive">
                          {validation.errors[0]}
                        </p>
                      ) : null}
                      {shortcutConflicts.has(definition.id) ? (
                        <p className="mt-1 text-[11px] text-destructive">
                          Conflict: this shortcut duplicates another action.
                        </p>
                      ) : null}
                          </>
                        );
                      })()}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between border-t px-3 py-2">
                <p className="text-xs text-muted-foreground">
                  Showing {pagedShortcutDefinitions.length} of {filteredShortcutDefinitions.length} shortcuts
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    disabled={shortcutsPage <= 1}
                    onClick={() => setShortcutsPage((page) => Math.max(1, page - 1))}
                  >
                    Prev
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    Page {shortcutsPage} / {totalShortcutPages}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    disabled={shortcutsPage >= totalShortcutPages}
                    onClick={() => setShortcutsPage((page) => Math.min(totalShortcutPages, page + 1))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon-sm" onClick={handleThemeToggle}>
                <ThemeIcon className="size-4" />
                <span className="sr-only">Toggle theme</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Theme: {themeMode}</TooltipContent>
          </Tooltip>

          <Popover open={isNotificationsOpen} onOpenChange={setIsNotificationsOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="relative">
                <Bell className="size-4" />
                {unreadNotificationsCount > 0 ? (
                  <span className="absolute right-1.5 top-1.5 inline-flex size-2 rounded-full bg-destructive" />
                ) : null}
                <span className="sr-only">Notifications</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              collisionPadding={8}
              className="flex w-[calc(100vw-1rem)] max-w-md max-h-[calc(100vh-4rem)] flex-col overflow-hidden p-0"
            >
              <div className="border-b px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">Notifications</p>
                    <Badge variant="secondary" className="text-xs">
                      {unreadNotificationsCount} unread
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="xs" onClick={markAllNotificationsAsRead}>
                      Mark all read
                    </Button>
                    <Button variant="ghost" size="xs" onClick={clearAllNotifications}>
                      Clear all
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Shortcut: {notificationsPanelShortcut}
                </p>
              </div>

              <div className="border-b px-3 py-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={notificationQuery}
                    onChange={(event) => setNotificationQuery(event.target.value)}
                    className="h-8 pl-7"
                    placeholder="Search notifications"
                  />
                </div>
              </div>

              {notificationItems.length === 0 ? (
                <div className="border-b px-3 py-4">
                  <div className="rounded-md border border-dashed px-3 py-8 text-center text-xs text-muted-foreground">
                    No notifications yet.
                  </div>
                </div>
              ) : (
                <Tabs
                  value={notificationView}
                  onValueChange={(value) => setNotificationView(value === "unread" ? "unread" : "all")}
                  className="min-h-0 flex-1"
                >
                  <div className="border-b px-3 py-2">
                    <TabsList className="h-8 w-full">
                      <TabsTrigger value="all" className="flex-1 text-xs">
                        All
                      </TabsTrigger>
                      <TabsTrigger value="unread" className="flex-1 text-xs">
                        Unread
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <ScrollArea className="min-h-0 flex-1 px-3 py-2">
                    {filteredNotifications.length > 0 ? (
                      <div className="space-y-2">
                        {filteredNotifications.map((notification) => (
                          <div
                            key={notification.id}
                            className={`rounded-md border p-2 ${notification.read ? "bg-background" : "bg-muted/40"}`}
                            onClick={() => markNotificationAsRead(notification.id)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                markNotificationAsRead(notification.id);
                              }
                            }}
                          >
                            <div className="mb-1 flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium">{notification.title}</p>
                                <p className="text-[11px] text-muted-foreground">{notification.timeLabel ?? "Just now"}</p>
                              </div>
                              <Badge variant={notification.read ? "outline" : "default"} className="capitalize">
                                {notification.category ?? "general"}
                              </Badge>
                            </div>
                            <p className="mb-2 text-xs text-muted-foreground">{notification.description}</p>
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="xs"
                                className="transition-transform active:scale-95"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  toggleNotificationRead(notification.id);
                                }}
                              >
                                {notification.read ? "Mark unread" : "Mark read"}
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="xs"
                                className="transition-transform active:scale-95"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  dismissNotification(notification.id);
                                }}
                              >
                                Dismiss
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-md border border-dashed px-3 py-8 text-center text-xs text-muted-foreground">
                        No notifications found.
                      </div>
                    )}
                  </ScrollArea>
                </Tabs>
              )}
              <div className="border-t px-3 py-2 text-[11px] text-muted-foreground">
                {filteredNotifications.length} item(s) shown
              </div>
            </PopoverContent>
          </Popover>

          <Popover open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon-sm" className="rounded-md">
                <MoreHorizontal className="size-4" />
                <span className="sr-only">Open domain menu</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              collisionPadding={8}
              className="w-[calc(100vw-1rem)] max-w-80 max-h-[calc(100vh-4rem)] overflow-hidden p-0"
            >
              <div className="border-b px-3 py-3">
                <p className="text-sm font-medium">
                  {activeDomain ? `${activeDomain.title} Module` : "Domain Navigation"}
                </p>
                <p className="mb-2 text-xs text-muted-foreground">Quick actions and module links</p>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={menuQuery}
                    onChange={(event) => setMenuQuery(event.target.value)}
                    className="h-8 pl-7"
                    placeholder="Search links and actions"
                  />
                </div>
              </div>

              <div className="border-b p-2">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="xs"
                    className="flex-1 justify-center"
                    onClick={() => {
                      setIsCommandOpen(true);
                      setIsMenuOpen(false);
                    }}
                  >
                    <Command className="size-3.5" />
                    Search
                  </Button>
                  <Button
                    variant="outline"
                    size="xs"
                    className="flex-1 justify-center"
                    onClick={() => {
                      handleThemeToggle();
                      setIsMenuOpen(false);
                    }}
                  >
                    <ThemeIcon className="size-3.5" />
                    Theme
                  </Button>
                </div>
              </div>

              <div className="max-h-72 space-y-1 overflow-y-auto p-2">
                {filteredDomainItems.length > 0 ? (
                  filteredDomainItems.map((item) => (
                    <Button
                      key={item.url}
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => {
                        navigateTo(item.url);
                        setIsMenuOpen(false);
                      }}
                    >
                      {item.icon ? <item.icon className="size-4" /> : <Search className="size-4" />}
                      <span>{item.title}</span>
                    </Button>
                  ))
                ) : (
                  <div className="rounded-md border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">
                    No links found for your search.
                  </div>
                )}
              </div>

              <div className="border-t p-2">
                <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => setIsMenuOpen(false)}>
                  <Settings className="size-4" />
                  Settings
                </Button>
                <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => setIsMenuOpen(false)}>
                  <HelpCircle className="size-4" />
                  Help
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </header>

      <CommandDialog open={isCommandOpen} onOpenChange={setIsCommandOpen}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          <CommandGroup heading="Actions">
            <CommandItem onSelect={() => setIsCommandOpen(false)}>
              <Search className="size-4" />
              Search pages
              <CommandShortcut>{shortcut}</CommandShortcut>
            </CommandItem>
            <CommandItem
              onSelect={() => {
                setIsCommandOpen(false);
                handleThemeToggle();
              }}
            >
              <ThemeIcon className="size-4" />
              Toggle theme
            </CommandItem>
            <CommandItem onSelect={() => setIsCommandOpen(false)}>
              <Settings className="size-4" />
              Open settings
            </CommandItem>
          </CommandGroup>

          {activeDomain && domainItems.length > 0 ? (
            <>
              <CommandSeparator />
              <CommandGroup heading={`${activeDomain.title} Navigation`}>
                {domainItems.map((item) => (
                  <CommandItem
                    key={`cmd-${item.url}`}
                    onSelect={() => {
                      setIsCommandOpen(false);
                      navigateTo(item.url);
                    }}
                  >
                    {item.icon ? <item.icon className="size-4" /> : <Search className="size-4" />}
                    {item.title}
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          ) : null}
        </CommandList>
      </CommandDialog>
    </>
  );
}
