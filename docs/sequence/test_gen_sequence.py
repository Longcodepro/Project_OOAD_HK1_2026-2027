#!/usr/bin/env python3
"""Kiểm tra `gen_sequence_drawio.py`: file .drawio đã commit phải khớp mermaid trong .md.

Chạy bằng pytest:      python -m pytest docs/sequence/test_gen_sequence.py -q
Hoặc chạy trực tiếp:   python docs/sequence/test_gen_sequence.py

Lệch nghĩa là có người sửa .drawio bằng tay (hoặc sửa mermaid mà quên sinh lại) —
đúng nguyên nhân đã làm 6/20 sơ đồ trôi khỏi tài liệu trước đây.
"""

from __future__ import annotations

import importlib.util
import pathlib
import re
import sys

HERE = pathlib.Path(__file__).resolve().parent
_spec = importlib.util.spec_from_file_location("gen_seq", HERE / "gen_sequence_drawio.py")
assert _spec and _spec.loader
gen = importlib.util.module_from_spec(_spec)
sys.modules["gen_seq"] = gen  # dataclass cần module có mặt trong sys.modules
_spec.loader.exec_module(gen)


def _pages():
    return gen.parse_md(gen.MD.read_text(encoding="utf-8"))


def test_drawio_khop_voi_mermaid():
    """Sinh lại từ .md phải ra đúng nội dung .drawio đang commit."""
    pages = _pages()
    assert pages, "không đọc được khối mermaid nào"
    moi = gen.render(pages)
    cu = gen.OUT.read_text(encoding="utf-8")
    if moi != cu:
        co_san = re.findall(r'<diagram id="\w+".*?</diagram>', cu, re.DOTALL)
        lech = [p.pid for p in pages if gen.build_page(p) not in co_san]
        raise AssertionError(
            f"{gen.OUT.name} không khớp {gen.MD.name} (trang lệch: {lech or 'khác ở phần vỏ'}). "
            f"Chạy: python docs/sequence/gen_sequence_drawio.py"
        )


def test_moi_lifeline_deu_duoc_khai_bao():
    """Không có thông điệp nào gửi tới lifeline chưa khai báo (parse_mermaid đã chặn)."""
    for p in _pages():
        for ev in p.events:
            if isinstance(ev, gen.Msg):
                assert ev.src in p.actors and ev.dst in p.actors, f"{p.pid}: {ev}"


def test_khung_opt_alt_dong_mo_can_nhau():
    for p in _pages():
        depth = 0
        for ev in p.events:
            depth += isinstance(ev, gen.FrameOpen) - isinstance(ev, gen.End)
            assert depth >= 0, f"{p.pid}: `end` thừa"
        assert depth == 0, f"{p.pid}: còn {depth} khung chưa `end`"


def test_hinh_hoc_dung_cong_thuc_cua_ban_cu():
    """Chốt lại các hằng số layout rút ra từ bản .drawio gốc.

    Một trang 5 lifeline, nhãn dài nhất 47 ký tự, có `alt ... else ... end`:
    bước lifeline = ceil(47*6.4+70) = 371; thông điệp đầu ở y=122, cách nhau 40.
    """
    page = gen.parse_mermaid(
        "t",
        "thu",
        "sequenceDiagram\n"
        "  participant A as :A\n  participant B as :B\n"
        "  participant C as :C\n  participant D as :D\n  participant E as :E\n"
        "  A ->> B: 4: layDanhSachChuyenXe(diemDi, diemDen, ngayDi)\n"
        "  alt dieu kien 1\n    B ->> C: 2: x()\n  else dieu kien 2\n    C -->> D: 3: y()\n  end\n"
        "  D ->> E: 5: z()\n",
    )
    xml = gen.build_page(page)
    assert 'x="70" y="30" width="170"' in xml  # lifeline đầu
    assert 'x="441" y="30"' in xml  # 70 + 371
    assert 'x="155.0" y="122" as="sourcePoint"' in xml  # thông điệp đầu
    assert 'x="65.0" y="140"' in xml  # mép trên khung alt = 122 + 18
    assert "dashed=1;" in xml  # mũi tên hồi đáp `-->>`
    assert xml.count("shape=umlFrame") == 1


if __name__ == "__main__":
    fails = 0
    for name, fn in sorted(globals().items()):
        if name.startswith("test_") and callable(fn):
            try:
                fn()
                print(f"  ok   {name}")
            except AssertionError as e:
                fails += 1
                print(f"  LỖI  {name}: {e}")
    print("Tất cả đều đạt." if not fails else f"{fails} phép kiểm thất bại.")
    sys.exit(1 if fails else 0)
