"""
Glassmorphism + soft 3D UI helpers for YTMP (Tkinter).

Tk cannot true-blur window content; we simulate frost, depth, and soft glass
with layered frames, bevels, and an ambient gradient background.
"""

from __future__ import annotations

import tkinter as tk
from tkinter import ttk
from typing import Callable


# ---------------------------------------------------------------------------
# Palette
# ---------------------------------------------------------------------------

G = {
    "bg_deep": "#040b12",
    "bg": "#07141f",
    "bg_mid": "#0b1c2a",
    "orb_teal": "#0f3d3a",
    "orb_cyan": "#12324a",
    "orb_indigo": "#1a2540",
    "glass": "#102231",
    "glass2": "#153043",
    "glass3": "#1a3a50",
    "glass_hi": "#264b62",
    "edge_light": "#4d7a92",
    "edge_dark": "#050d14",
    "shadow": "#02060a",
    "text": "#f0f7fb",
    "muted": "#8aa5b8",
    "faint": "#5d7a8e",
    "accent": "#2dd4bf",
    "accent2": "#5eead4",
    "accent_glow": "#14b8a6",
    "accent_deep": "#0a3f3a",
    "on_accent": "#042f2e",
    "ok": "#34d399",
    "warn": "#fbbf24",
    "danger": "#fb7185",
    "input": "#0c1f2e",
    "input_edge": "#2a4a60",
}


def _fonts() -> dict:
    return {
        "ui": ("Segoe UI", 10),
        "sm": ("Segoe UI", 9),
        "md": ("Segoe UI Semibold", 10),
        "lg": ("Segoe UI Semibold", 11),
        "xl": ("Segoe UI Semibold", 13),
        "brand": ("Segoe UI Semibold", 28),
        "mono": ("Cascadia Mono", 10),
    }


# ---------------------------------------------------------------------------
# Ambient background
# ---------------------------------------------------------------------------


class Atmosphere(tk.Canvas):
    """Soft multi-orb gradient backdrop for a glassy/app feel."""

    def __init__(self, master: tk.Misc, **kw):
        super().__init__(master, highlightthickness=0, bd=0, **kw)
        self.configure(bg=G["bg_deep"])
        self.bind("<Configure>", self._paint)
        self._paint()

    def _paint(self, _e=None) -> None:
        self.delete("all")
        w = max(self.winfo_width(), 2)
        h = max(self.winfo_height(), 2)
        # vertical gradient bands
        steps = 28
        for i in range(steps):
            t = i / (steps - 1)
            r = int(4 + t * 8)
            g0 = int(11 + t * 14)
            b = int(18 + t * 22)
            color = f"#{r:02x}{g0:02x}{b:02x}"
            y0 = int(h * i / steps)
            y1 = int(h * (i + 1) / steps) + 1
            self.create_rectangle(0, y0, w, y1, outline="", fill=color)
        # soft orbs
        self._orb(int(w * 0.82), int(h * 0.12), int(w * 0.42), G["orb_teal"])
        self._orb(int(w * 0.1), int(h * 0.55), int(w * 0.38), G["orb_cyan"])
        self._orb(int(w * 0.55), int(h * 0.78), int(w * 0.35), G["orb_indigo"])
        # thin diagonal sheen
        self.create_rectangle(0, 0, w, max(2, h // 90), outline="", fill="#0e2836")

    def _orb(self, cx: int, cy: int, r: int, color: str) -> None:
        self.create_oval(cx - r, cy - r, cx + r, cy + r, outline="", fill=color)


# ---------------------------------------------------------------------------
# Glass panels (3D edge + frost fill)
# ---------------------------------------------------------------------------


class GlassPanel(tk.Frame):
    """Elevated frosted panel with shadow + bevel (glassmorphism simulation)."""

    def __init__(self, master: tk.Misc, padding: int = 16, elevate: int = 1, **kw):
        # inherit ambient from parent
        bg = G["bg_deep"]
        super().__init__(master, bg=bg, **kw)
        lift = max(0, min(3, elevate))
        # deep shadow (3D floor)
        self._shadow = tk.Frame(self, bg=G["shadow"], bd=0, highlightthickness=0)
        self._shadow.place(x=4 + lift, y=5 + lift, relwidth=1, relheight=1)

        # outer dark rim
        self._rim = tk.Frame(self, bg=G["edge_dark"], bd=0, highlightthickness=0)
        self._rim.place(x=0, y=0, relwidth=1, relheight=1)

        # light edge (top-left glass catchlight)
        self._edge = tk.Frame(self._rim, bg=G["edge_light"], bd=0, highlightthickness=0)
        self._edge.place(x=1, y=1, relwidth=1, relheight=1, width=-2, height=-2)

        # dark inner floor
        self._floor = tk.Frame(self._edge, bg=G["edge_dark"], bd=0, highlightthickness=0)
        self._floor.place(x=1, y=1, relwidth=1, relheight=1, width=-2, height=-2)

        # frost body
        self._body = tk.Frame(self._floor, bg=G["glass"], bd=0, highlightthickness=0)
        self._body.place(x=1, y=1, relwidth=1, relheight=1, width=-2, height=-2)

        # top highlight strip (glass sheen)
        self._sheen = tk.Frame(self._body, bg=G["glass_hi"], height=3, bd=0)
        self._sheen.pack(fill="x", side="top")

        # soft bottom gloss line
        self._sheen2 = tk.Frame(self._body, bg=G["edge_dark"], height=1, bd=0)
        self._sheen2.pack(fill="x", side="bottom")

        # content area
        self.content = ttk.Frame(self._body, style="Glass.TFrame", padding=padding)
        self.content.pack(fill="both", expand=True)

    def pack(self, **kw):
        # leave room for shadow
        kw.setdefault("padx", 2)
        kw.setdefault("pady", 2)
        return super().pack(**kw)


# ---------------------------------------------------------------------------
# Glass controls
# ---------------------------------------------------------------------------


class GlassButton(tk.Frame):
    """3D glass button with press depression."""

    def __init__(
        self,
        master: tk.Misc,
        text: str = "",
        command: Callable | None = None,
        *,
        primary: bool = False,
        soft: bool = False,
        width_chars: int | None = None,
        **kw,
    ):
        super().__init__(master, bg=G["bg_deep"], **kw)
        self._command = command
        self._primary = primary
        self._soft = soft
        self._enabled = True
        f = _fonts()

        if primary:
            face, face_h, face_p, fg = G["accent"], G["accent2"], G["accent_glow"], G["on_accent"]
            edge_l, edge_d = "#7ff5e4", "#0a5c52"
        elif soft:
            face, face_h, face_p, fg = G["glass3"], G["glass_hi"], G["glass2"], G["text"]
            edge_l, edge_d = G["edge_light"], G["edge_dark"]
        else:
            face, face_h, face_p, fg = G["glass2"], G["glass3"], G["glass"], G["text"]
            edge_l, edge_d = G["edge_light"], G["edge_dark"]

        self._face = face
        self._face_h = face_h
        self._face_p = face_p
        self._fg = fg

        # stacked 3D layers via pack so Frame reports correct size
        self._drop = tk.Frame(self, bg=G["shadow"], bd=0)
        self._outer = tk.Frame(self, bg=edge_d, bd=0)
        self._outer.pack(padx=(0, 2), pady=(0, 3))
        self._mid = tk.Frame(self._outer, bg=edge_l, bd=0)
        self._mid.pack(padx=1, pady=1)
        self._btn = tk.Label(
            self._mid,
            text=text,
            bg=face,
            fg=fg,
            font=f["lg"] if primary else f["md"],
            padx=18 if primary else 12,
            pady=10 if primary else 7,
            cursor="hand2",
        )
        if width_chars:
            self._btn.configure(width=width_chars)
        self._btn.pack(padx=1, pady=1)

        for w in (self, self._btn, self._mid, self._outer):
            w.bind("<Enter>", self._enter)
            w.bind("<Leave>", self._leave)
            w.bind("<ButtonPress-1>", self._press)
            w.bind("<ButtonRelease-1>", self._release)

    def configure(self, cnf=None, **kw):  # type: ignore[override]
        if cnf is None:
            cnf = {}
        if isinstance(cnf, dict):
            kw = {**cnf, **kw}
        if "text" in kw:
            self._btn.configure(text=kw.pop("text"))
        if "state" in kw:
            st = kw.pop("state")
            self._enabled = st != "disabled"
            self._btn.configure(
                fg=self._fg if self._enabled else G["faint"],
                cursor="hand2" if self._enabled else "arrow",
                bg=self._face if self._enabled else G["glass"],
            )
        if kw:
            return super().configure(**kw)

    config = configure

    def _enter(self, _e=None) -> None:
        if self._enabled:
            self._btn.configure(bg=self._face_h)

    def _leave(self, _e=None) -> None:
        if self._enabled:
            self._btn.configure(bg=self._face)
            self._outer.pack_configure(padx=(0, 2), pady=(0, 3))

    def _press(self, _e=None) -> None:
        if not self._enabled:
            return
        self._btn.configure(bg=self._face_p)
        self._outer.pack_configure(padx=(2, 0), pady=(3, 0))

    def _release(self, _e=None) -> None:
        if not self._enabled:
            return
        self._btn.configure(bg=self._face_h)
        self._outer.pack_configure(padx=(0, 2), pady=(0, 3))
        if self._command:
            self._command()


class GlassEntry(tk.Frame):
    """Inset glass text field."""

    def __init__(self, master: tk.Misc, textvariable=None, width: int | None = None, show=None, **kw):
        super().__init__(master, bg=G["bg"], **kw)
        f = _fonts()
        self._rim = tk.Frame(self, bg=G["edge_dark"], bd=0)
        self._rim.pack(fill="both", expand=True)
        self._edge = tk.Frame(self._rim, bg=G["input_edge"], bd=0)
        self._edge.pack(fill="both", expand=True, padx=1, pady=1)
        self.entry = tk.Entry(
            self._edge,
            textvariable=textvariable,
            width=width or 28,
            bg=G["input"],
            fg=G["text"],
            insertbackground=G["accent"],
            relief="flat",
            font=f["ui"],
            show=show or "",
            highlightthickness=0,
            bd=0,
        )
        self.entry.pack(fill="both", expand=True, padx=1, pady=1, ipady=7)
        self.entry.bind("<FocusIn>", lambda _e: self._edge.configure(bg=G["accent_glow"]))
        self.entry.bind("<FocusOut>", lambda _e: self._edge.configure(bg=G["input_edge"]))

    def get(self) -> str:
        return self.entry.get()


class SegmentBar(tk.Frame):
    """Glass segmented control (tabs / mode switches) with 3D active state."""

    def __init__(
        self,
        master: tk.Misc,
        options: list[tuple[str, str]],
        command: Callable[[str], None] | None = None,
        **kw,
    ):
        super().__init__(master, bg=G["glass"], **kw)
        self._command = command
        self._value = options[0][0] if options else ""
        self._btns: dict[str, tk.Label] = {}
        f = _fonts()

        shell = tk.Frame(self, bg=G["edge_dark"], bd=0)
        shell.pack(fill="x", padx=2, pady=2)
        row = tk.Frame(shell, bg=G["glass2"], bd=0)
        row.pack(fill="x", padx=1, pady=1)

        for key, label in options:
            lab = tk.Label(
                row,
                text=f"  {label}  ",
                bg=G["glass2"],
                fg=G["muted"],
                font=f["md"],
                padx=14,
                pady=9,
                cursor="hand2",
            )
            lab.pack(side="left", padx=2, pady=2)
            lab.bind("<Button-1>", lambda _e, k=key: self.select(k))
            self._btns[key] = lab
        if options:
            self.select(options[0][0], fire=False)

    def select(self, key: str, fire: bool = True) -> None:
        self._value = key
        for k, lab in self._btns.items():
            if k == key:
                lab.configure(bg=G["accent"], fg=G["on_accent"], font=_fonts()["lg"])
            else:
                lab.configure(bg=G["glass2"], fg=G["muted"], font=_fonts()["md"])
        if fire and self._command:
            self._command(key)

    def get(self) -> str:
        return self._value


def section_title(parent: tk.Misc, title: str, subtitle: str | None = None, step: str | None = None) -> None:
    f = _fonts()
    row = ttk.Frame(parent, style="Glass.TFrame")
    row.pack(anchor="w", fill="x")
    if step:
        badge = tk.Label(
            row,
            text=f" {step} ",
            bg=G["accent_deep"],
            fg=G["accent2"],
            font=f["md"],
            padx=6,
            pady=2,
        )
        badge.pack(side="left", padx=(0, 10))
    col = ttk.Frame(row, style="Glass.TFrame")
    col.pack(side="left", fill="x", expand=True)
    ttk.Label(col, text=title, style="GlassTitle.TLabel").pack(anchor="w")
    if subtitle:
        ttk.Label(col, text=subtitle, style="GlassMuted.TLabel").pack(anchor="w", pady=(2, 0))


def dark_option_menu(parent, variable: tk.StringVar, *values, width: int = 8) -> tk.OptionMenu:
    f = _fonts()
    menu = tk.OptionMenu(parent, variable, *values)
    menu.config(
        bg=G["glass2"],
        fg=G["text"],
        activebackground=G["glass3"],
        activeforeground=G["text"],
        highlightthickness=1,
        highlightbackground=G["edge_light"],
        highlightcolor=G["accent"],
        bd=0,
        relief="flat",
        font=f["ui"],
        width=width,
        indicatoron=True,
        direction="below",
        cursor="hand2",
    )
    menu["menu"].config(
        bg=G["glass2"],
        fg=G["text"],
        activebackground=G["accent"],
        activeforeground=G["on_accent"],
        font=f["ui"],
        bd=0,
        tearoff=0,
    )
    return menu


def apply_styles(style: ttk.Style) -> None:
    f = _fonts()
    style.theme_use("clam")
    style.configure(".", background=G["bg"], foreground=G["text"], font=f["ui"])
    style.configure("TFrame", background=G["bg"])
    style.configure("Glass.TFrame", background=G["glass"])
    style.configure("TLabel", background=G["bg"], foreground=G["text"], font=f["ui"])
    style.configure("Glass.TLabel", background=G["glass"], foreground=G["text"], font=f["ui"])
    style.configure("GlassTitle.TLabel", background=G["glass"], foreground=G["text"], font=f["xl"])
    style.configure("GlassMuted.TLabel", background=G["glass"], foreground=G["muted"], font=f["sm"])
    style.configure("GlassSection.TLabel", background=G["glass"], foreground=G["accent2"], font=f["md"])
    style.configure("Brand.TLabel", background=G["bg"], foreground=G["accent2"], font=f["brand"])
    style.configure("Sub.TLabel", background=G["bg"], foreground=G["muted"], font=f["ui"])
    style.configure("GlassPct.TLabel", background=G["glass"], foreground=G["accent2"], font=f["lg"])
    style.configure(
        "TNotebook",
        background=G["bg"],
        borderwidth=0,
        tabmargins=(4, 6, 4, 0),
    )
    style.configure(
        "TNotebook.Tab",
        background=G["glass2"],
        foreground=G["muted"],
        padding=(26, 12),
        font=f["md"],
        borderwidth=0,
        lightcolor=G["edge_light"],
        darkcolor=G["edge_dark"],
    )
    style.map(
        "TNotebook.Tab",
        background=[("selected", G["glass"]), ("active", G["glass3"])],
        foreground=[("selected", G["accent2"]), ("active", G["text"])],
        expand=[("selected", [1, 1, 1, 0])],
    )
    style.configure(
        "Glass.Horizontal.TProgressbar",
        troughcolor=G["input"],
        background=G["accent"],
        lightcolor=G["accent2"],
        darkcolor=G["accent_glow"],
        bordercolor=G["edge_dark"],
        thickness=10,
    )
    style.configure(
        "Glass.TCheckbutton",
        background=G["glass"],
        foreground=G["text"],
        focuscolor=G["glass"],
        font=f["sm"],
    )
    style.map(
        "Glass.TCheckbutton",
        background=[("active", G["glass"])],
        foreground=[("active", G["accent2"])],
    )
    style.configure(
        "TEntry",
        fieldbackground=G["input"],
        foreground=G["text"],
        insertcolor=G["accent"],
        bordercolor=G["input_edge"],
        lightcolor=G["input_edge"],
        darkcolor=G["edge_dark"],
        padding=(10, 8),
    )
    # Legacy aliases used across the app
    style.configure("Card.TFrame", background=G["glass"])
    style.configure("Card.TLabel", background=G["glass"], foreground=G["text"], font=f["ui"])
    style.configure("Muted.TLabel", background=G["glass"], foreground=G["muted"], font=f["sm"])
    style.configure("Section.TLabel", background=G["glass"], foreground=G["accent2"], font=f["md"])
    style.configure("Pct.TLabel", background=G["glass"], foreground=G["accent2"], font=f["lg"])
    style.configure("Status.TLabel", background=G["bg"], foreground=G["ok"], font=f["md"])
    style.configure("Title.TLabel", background=G["bg"], foreground=G["accent2"], font=f["brand"])
    style.configure("BrandMark.TLabel", background=G["bg"], foreground=G["accent2"], font=f["brand"])
    # Map old button styles to glass-ish ttk defaults so any remaining ttk.Buttons still look ok
    style.configure(
        "Accent.TButton",
        background=G["accent"],
        foreground=G["on_accent"],
        font=f["lg"],
        padding=(18, 10),
        borderwidth=0,
    )
    style.map(
        "Accent.TButton",
        background=[("active", G["accent2"]), ("disabled", G["accent_deep"])],
        foreground=[("disabled", "#0a3a36")],
    )
    style.configure(
        "Ghost.TButton",
        background=G["glass2"],
        foreground=G["text"],
        font=f["ui"],
        padding=(12, 8),
        borderwidth=0,
    )
    style.map("Ghost.TButton", background=[("active", G["glass3"])])
    style.configure(
        "Soft.TButton",
        background=G["glass3"],
        foreground=G["text"],
        font=f["sm"],
        padding=(10, 6),
        borderwidth=0,
    )
    style.map("Soft.TButton", background=[("active", G["glass_hi"])])
    style.configure(
        "Tool.TButton",
        background=G["glass2"],
        foreground=G["text"],
        font=f["sm"],
        padding=(12, 10),
        borderwidth=0,
        width=14,
    )
    style.map(
        "Tool.TButton",
        background=[("active", G["glass3"])],
        foreground=[("active", G["accent2"])],
    )
    style.configure(
        "Teal.Horizontal.TProgressbar",
        troughcolor=G["input"],
        background=G["accent"],
        lightcolor=G["accent2"],
        darkcolor=G["accent_glow"],
        bordercolor=G["edge_dark"],
        thickness=10,
    )
    style.configure(
        "Dark.TCheckbutton",
        background=G["glass"],
        foreground=G["text"],
        focuscolor=G["glass"],
        font=f["sm"],
    )
    style.map(
        "Dark.TCheckbutton",
        background=[("active", G["glass"])],
        foreground=[("active", G["accent2"])],
    )


def make_glass_card(parent, padding: int = 16, elevate: int = 1, **pack) -> tuple[GlassPanel, ttk.Frame]:
    panel = GlassPanel(parent, padding=padding, elevate=elevate)
    if pack:
        panel.pack(**pack)
    return panel, panel.content
