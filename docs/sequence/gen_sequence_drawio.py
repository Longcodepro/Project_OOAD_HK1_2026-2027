#!/usr/bin/env python3
"""Sinh `Sequence_DatVeXeKhach.drawio` từ các khối ```mermaid``` trong `Sequence_diagram.md`.

Nguồn sự thật của sơ đồ tuần tự là khối mermaid trong `Sequence_diagram.md`.
Sửa mermaid rồi chạy lại:

    python docs/sequence/gen_sequence_drawio.py

Script dựng lại đúng style của file .drawio cũ (do script `seq2drawio` đã mất sinh ra),
nên 20 trang trông đều nhau và không thể lệch với tài liệu nữa.

Cú pháp mermaid được hỗ trợ:
    sequenceDiagram / autonumber / %% chú thích
    actor  A as :TenLop
    participant A as :TenLop
    A ->> B: 1: thongDiep(tham, so)        (mũi tên liền — lời gọi)
    A -->> B: 2: traVeKetQua()             (mũi tên nét đứt — hồi đáp)
    activate A / deactivate A              (bỏ qua: bản .drawio cũ không vẽ vùng hoạt động)
    opt <điều kiện> ... end
    alt <điều kiện> ... else <điều kiện> ... end
    loop <điều kiện> ... end
    Note over A: ghi chú                   (hộp vàng cạnh lifeline A)
"""

from __future__ import annotations

import math
import pathlib
import re
import sys
from dataclasses import dataclass, field

HERE = pathlib.Path(__file__).resolve().parent
MD = HERE / "Sequence_diagram.md"
OUT = HERE / "Sequence_DatVeXeKhach.drawio"

# ---------------------------------------------------------------- hằng số layout
# Rút ra từ các trang chưa bị sửa tay của file .drawio cũ (page4, page5, page6, page10...).
X0 = 70  # lề trái của lifeline đầu tiên
LIFE_W = 170
LIFE_Y = 30
HALF = LIFE_W / 2  # tâm lifeline = x + 85 (số thực: giữ đúng cách ghi "155.0" của file cũ)
ROW0 = 122  # y của thông điệp đầu tiên
ROW_H = 40  # khoảng cách giữa hai thông điệp
FRAME_PAD = 90  # khung opt/alt thò ra ngoài tâm lifeline hai bên
FRAME_INSET = 14  # mỗi cấp lồng nhau thụt vào bấy nhiêu px mỗi bên
FRAME_TOP_GAP = 18  # mép trên khung cách thông điệp trước nó
FRAME_OPEN_SKIP = 70  # mở khung thì thông điệp kế tiếp cách thông điệp trước bấy nhiêu
FRAME_BOT_GAP = 26  # mép dưới khung cách thông điệp cuối trong khung
FRAME_AFTER_GAP = 30  # đóng khung rồi: dòng kế tiếp cách mép dưới khung
LIFE_END_GAP = 28  # chân lifeline cách mép dưới khung ngoài cùng
ROW_END_GAP = 38  # chân lifeline cách thông điệp cuối cùng
PAGE_H_PAD = 110  # pageHeight = chiều cao lifeline + bấy nhiêu
SELF_UP = 8  # thông điệp tự gọi: điểm đầu nhô lên trên dòng
SELF_DOWN = 10  # ... và điểm cuối thụt xuống dưới dòng
SELF_OUT = 46  # ... bề rộng của móc tự gọi
CHAR_W = 6.4  # bề rộng ước lượng một ký tự nhãn
STEP_PAD = 70
MIN_STEP = LIFE_W + 20

S_LIFE = (
    "shape=umlLifeline;perimeter=lifelinePerimeter;whiteSpace=wrap;html=1;container=0;"
    "collapsible=0;recursiveResize=0;outlineConnect=0;size=40;fillColor=#dae8fc;"
    "strokeColor=#6c8ebf;"
)
S_MSG = (
    "html=1;endArrow=block;endFill=1;rounded=0;labelBackgroundColor=#ffffff;verticalAlign=bottom;"
)
S_FRAME_BOX = "rounded=0;html=1;fillColor=none;strokeColor=#666666;"
S_FRAME_TAB = (
    "shape=umlFrame;whiteSpace=wrap;html=1;pointerEvents=0;width=48;height=22;"
    "fillColor=#f5f5f5;strokeColor=#666666;fontStyle=1;"
)
S_COND = "text;html=1;align=left;verticalAlign=middle;fontSize=11;fontStyle=2;"
S_DIVIDER = "endArrow=none;dashed=1;strokeColor=#666666;html=1;"
S_NOTE = (
    "text;html=1;align=left;verticalAlign=middle;fontSize=11;fillColor=#fff2cc;strokeColor=#d6b656;"
)

FRAME_KINDS = ("opt", "alt", "loop", "par", "critical", "break")


# ---------------------------------------------------------------- phân tích mermaid
@dataclass
class Msg:
    src: str
    dst: str
    label: str
    dashed: bool


@dataclass
class FrameOpen:
    kind: str
    label: str


@dataclass
class Else:
    label: str


@dataclass
class End:
    pass


@dataclass
class Note:
    who: str
    text: str


@dataclass
class Page:
    pid: str
    name: str
    actors: list[str] = field(default_factory=list)  # nhãn lifeline, đúng thứ tự khai báo
    events: list[object] = field(default_factory=list)


RE_HEADING = re.compile(r"^### (\d+\.\d+[a-z]?\..*)$", re.MULTILINE)
RE_MERMAID = re.compile(r"```mermaid\n(.*?)```", re.DOTALL)
RE_PARTICIPANT = re.compile(r"^(?:participant|actor)\s+(\S+)\s+as\s+(.+)$")
RE_MSG = re.compile(r"^(\S+)\s*(-->>|->>|-->|->)\s*(\S+?)\s*:\s*(.*)$")
RE_NOTE = re.compile(r"^Note\s+(?:over|right of|left of)\s+([^:]+):\s*(.*)$", re.IGNORECASE)


def parse_md(text: str) -> list[Page]:
    """Tách từng mục `### x.y. ...` kèm khối mermaid ngay dưới nó."""
    pages: list[Page] = []
    heads = list(RE_HEADING.finditer(text))
    for i, h in enumerate(heads):
        body = text[h.end() : heads[i + 1].start() if i + 1 < len(heads) else len(text)]
        block = RE_MERMAID.search(body)
        if not block:
            continue
        pages.append(parse_mermaid(f"page{len(pages)}", h.group(1).strip(), block.group(1)))
    return pages


def parse_mermaid(pid: str, name: str, src: str) -> Page:
    page = Page(pid=pid, name=name)
    alias: dict[str, str] = {}

    def label_of(a: str) -> str:
        return alias.get(a.strip(), a.strip())

    for raw in src.splitlines():
        line = raw.strip()
        if not line or line.startswith("%%") or line in ("sequenceDiagram", "autonumber"):
            continue
        if m := RE_PARTICIPANT.match(line):
            a, lab = m.group(1), m.group(2).strip().strip('"')
            alias[a] = lab
            if lab not in page.actors:
                page.actors.append(lab)
            continue
        if line.startswith(("activate ", "deactivate ")):
            continue  # bản .drawio cũ không vẽ vùng hoạt động
        if m := RE_NOTE.match(line):
            page.events.append(Note(label_of(m.group(1).split(",")[0]), m.group(2).strip()))
            continue
        if line == "end":
            page.events.append(End())
            continue
        if line.startswith("else"):
            page.events.append(Else(line[4:].strip()))
            continue
        kind = line.split(" ", 1)[0]
        if kind in FRAME_KINDS:
            page.events.append(FrameOpen(kind, line[len(kind) :].strip()))
            continue
        if m := RE_MSG.match(line):
            page.events.append(
                Msg(
                    label_of(m.group(1)),
                    label_of(m.group(3)),
                    m.group(4).strip(),
                    "--" in m.group(2),
                )
            )
            continue
        raise SystemExit(f"{pid} ({name}): không hiểu dòng mermaid: {line!r}")

    missing = {
        a for e in page.events if isinstance(e, Msg) for a in (e.src, e.dst) if a not in page.actors
    } | {e.who for e in page.events if isinstance(e, Note) and e.who not in page.actors}
    if missing:
        raise SystemExit(f"{pid} ({name}): lifeline chưa khai báo: {sorted(missing)}")
    return page


# ---------------------------------------------------------------- dựng hình
def build_page(page: Page) -> str:
    labels = [e.label for e in page.events if isinstance(e, Msg)]
    maxlab = max((len(x) for x in labels), default=0)
    step = max(MIN_STEP, math.ceil(maxlab * CHAR_W + STEP_PAD))
    n = len(page.actors)
    cx = {a: X0 + step * i + HALF for i, a in enumerate(page.actors)}
    span_l, span_r = X0 + HALF - FRAME_PAD, X0 + step * (n - 1) + HALF + FRAME_PAD

    # --- đi qua các sự kiện: `y` luôn là chỗ sẽ đặt dòng kế tiếp
    y = ROW0
    msgs: list[tuple[Msg, int]] = []
    notes: list[tuple[Note, int]] = []
    frames: list[dict] = []  # đã đóng, theo đúng thứ tự `end`
    stack: list[dict] = []

    for ev in page.events:
        if isinstance(ev, Msg):
            msgs.append((ev, y))
            y += ROW_H
        elif isinstance(ev, Note):
            notes.append((ev, y))
            y += ROW_H
        elif isinstance(ev, FrameOpen):
            depth = len(stack)
            stack.append(
                {
                    "kind": ev.kind,
                    "label": ev.label,
                    "top": y - ROW_H + FRAME_TOP_GAP,
                    "x": span_l + FRAME_INSET * depth,
                    "w": (span_r - span_l) - 2 * FRAME_INSET * depth,
                    "dividers": [],
                }
            )
            y += FRAME_OPEN_SKIP - ROW_H
        elif isinstance(ev, Else):
            if not stack:
                raise SystemExit(f"{page.pid}: `else` không có khung mở")
            stack[-1]["dividers"].append((y - ROW_H + FRAME_TOP_GAP, ev.label))
            y += FRAME_OPEN_SKIP - ROW_H
        elif isinstance(ev, End):
            if not stack:
                raise SystemExit(f"{page.pid}: `end` thừa")
            fr = stack.pop()
            fr["bottom"] = y - ROW_H + FRAME_BOT_GAP
            frames.append(fr)
            y = fr["bottom"] + FRAME_AFTER_GAP
    if stack:
        raise SystemExit(f"{page.pid}: thiếu {len(stack)} `end`")

    last = max([ROW0] + [r for _, r in msgs] + [r for _, r in notes])
    bottom = max([last + ROW_END_GAP] + [f["bottom"] + LIFE_END_GAP for f in frames])
    life_h = bottom - LIFE_Y
    cells: list[str] = []
    nid = 1000

    def new_id() -> str:
        nonlocal nid
        nid += 1
        return f"n{nid}"

    for i, a in enumerate(page.actors):
        cells.append(vertex(new_id(), a, S_LIFE, X0 + step * i, LIFE_Y, LIFE_W, life_h))
    for fr in frames:  # khung trước, thông điệp sau — giống file cũ
        fx, fw, fy = fr["x"], fr["w"], fr["top"]
        cells.append(vertex(new_id(), None, S_FRAME_BOX, fx, fy, fw, fr["bottom"] - fy))
        cells.append(vertex(new_id(), fr["kind"], S_FRAME_TAB, fx, fy, 48, 22))
        cells.append(vertex(new_id(), fr["label"], S_COND, fx + 54, fy, fw - 60, 22))
        for dy, lab in fr["dividers"]:
            cells.append(edge(new_id(), None, S_DIVIDER, fx, dy, fx + fw, dy))
            cells.append(vertex(new_id(), lab, S_COND, fx + 8, dy + 2, fw - 16, 20))
    for m, y in msgs:
        x1, x2 = cx[m.src], cx[m.dst]
        style = S_MSG + ("dashed=1;" if m.dashed else "")
        if x1 == x2:  # thông điệp tự gọi: móc sang phải rồi quay lại
            cells.append(
                edge(
                    new_id(),
                    m.label,
                    style + "align=left;",
                    x1,
                    y - SELF_UP,
                    x1,
                    y + SELF_DOWN,
                    waypoints=[(x1 + SELF_OUT, y - SELF_UP), (x1 + SELF_OUT, y + SELF_DOWN)],
                )
            )
        else:
            cells.append(edge(new_id(), m.label, style, x1, y, x2, y))
    for note, y in notes:
        cells.append(vertex(new_id(), note.text, S_NOTE, cx[note.who] + 10, y, 420, 24))

    head = (
        f'<mxGraphModel dx="1200" dy="800" grid="1" gridSize="10" page="1" pageScale="1" '
        f'pageWidth="{step * n + LIFE_W}" pageHeight="{life_h + PAGE_H_PAD}" math="0" shadow="0">'
    )
    body = "".join(cells)
    return (
        f'<diagram id="{page.pid}" name="{esc(page.name)}">{head}'
        f'<root><mxCell id="0" /><mxCell id="1" parent="0" />{body}</root>'
        f"</mxGraphModel></diagram>"
    )


# ---------------------------------------------------------------- phát sinh XML
def esc(s: str) -> str:
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")


def fmt(v: float) -> str:
    # Toạ độ ngang và bề rộng là số thực ("65.0"), toạ độ dọc và chiều cao là số nguyên ("380"),
    # đúng như file .drawio cũ ghi — nhờ vậy bản sinh ra khớp từng byte với các trang chưa sửa tay.
    return str(v)


def vertex(cid: str, value: str | None, style: str, x: float, y: float, w: float, h: float) -> str:
    val = "" if value is None else f' value="{esc(value)}"'
    return (
        f'<mxCell id="{cid}"{val} style="{style}" vertex="1" parent="1">'
        f'<mxGeometry x="{fmt(x)}" y="{fmt(y)}" width="{fmt(w)}" height="{fmt(h)}" as="geometry" />'
        f"</mxCell>"
    )


def edge(
    cid: str,
    value: str | None,
    style: str,
    x1: float,
    y1: float,
    x2: float,
    y2: float,
    waypoints: list[tuple[float, float]] | None = None,
) -> str:
    val = "" if value is None else f' value="{esc(value)}"'
    pts = ""
    if waypoints:
        inner = "".join(f'<mxPoint x="{fmt(x)}" y="{fmt(y)}" />' for x, y in waypoints)
        pts = f'<Array as="points">{inner}</Array>'
    return (
        f'<mxCell id="{cid}"{val} style="{style}" edge="1" parent="1">'
        f'<mxGeometry relative="1" as="geometry">'
        f'<mxPoint x="{fmt(x1)}" y="{fmt(y1)}" as="sourcePoint" />'
        f'<mxPoint x="{fmt(x2)}" y="{fmt(y2)}" as="targetPoint" />{pts}</mxGeometry></mxCell>'
    )


def render(pages: list[Page]) -> str:
    inner = "\n".join(build_page(p) for p in pages)
    return f'<mxfile host="app.diagrams.net" agent="gen_sequence_drawio.py">\n{inner}\n</mxfile>\n'


def main(argv: list[str]) -> int:
    pages = parse_md(MD.read_text(encoding="utf-8"))
    if not pages:
        raise SystemExit(f"Không tìm thấy khối mermaid nào trong {MD}")
    xml = render(pages)
    if "--check" in argv:
        current = OUT.read_text(encoding="utf-8") if OUT.exists() else ""
        if current != xml:
            print(f"LỆCH: {OUT.name} không khớp mermaid trong {MD.name}. Chạy lại script để sinh.")
            return 1
        print(f"Khớp: {len(pages)} trang.")
        return 0
    OUT.write_text(xml, encoding="utf-8")
    print(f"Đã sinh {OUT.name}: {len(pages)} trang.")
    for p in pages:
        print(f"  {p.pid:7} {len(p.actors)} lifeline  {p.name[:62]}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
