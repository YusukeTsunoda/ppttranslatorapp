import os
import pytest
from pptx import Presentation
from pptx.enum.text import MSO_AUTO_SIZE
from pptx.util import Pt, Inches
from PIL import ImageFont, ImageDraw, Image
from lib.pptx.textbox_adjuster import TextboxAdjuster

class TestTextboxProperties:
    @pytest.fixture
    def test_pptx_path(self):
        """テスト用PPTXファイルのパスを返す"""
        return os.path.join(os.path.dirname(__file__), 'test_cases', 'textbox_properties_test.pptx')

    @pytest.fixture
    def create_test_presentation(self):
        """テスト用のプレゼンテーションを作成する"""
        prs = Presentation()
        # 16:9のスライドを作成
        prs.slide_width = Inches(16)
        prs.slide_height = Inches(9)
        return prs

    def test_basic_textbox_properties(self, create_test_presentation, test_pptx_path):
        """基本的なテキストボックスのプロパティをテストする"""
        prs = create_test_presentation
        slide = prs.slides.add_slide(prs.slide_layouts[6])  # 白紙のスライド

        # 基本的なテキストボックスを作成
        left = Inches(2)
        top = Inches(2)
        width = Inches(4)
        height = Inches(1)
        textbox = slide.shapes.add_textbox(left, top, width, height)
        text_frame = textbox.text_frame

        # プロパティを設定
        text_frame.word_wrap = True
        text_frame.auto_size = MSO_AUTO_SIZE.NONE
        text_frame.margin_left = Inches(0.1)
        text_frame.margin_right = Inches(0.1)
        text_frame.margin_top = Inches(0.05)
        text_frame.margin_bottom = Inches(0.05)

        # テキストとフォント設定を追加
        p = text_frame.paragraphs[0]
        p.text = "Basic Test テキスト"
        font = p.font
        font.name = 'メイリオ'
        font.size = Pt(14)
        font.bold = True
        font.italic = True

        # TextboxAdjusterを適用
        adjuster = TextboxAdjuster(textbox)
        adjuster.adjust_size()

        # 保存して検証
        prs.save(test_pptx_path)
        
        # 保存したファイルを読み込んで検証
        loaded_prs = Presentation(test_pptx_path)
        loaded_slide = loaded_prs.slides[0]
        loaded_shape = loaded_slide.shapes[0]
        loaded_text_frame = loaded_shape.text_frame
        
        # 各プロパティを検証
        assert loaded_text_frame.word_wrap == True
        assert loaded_text_frame.auto_size == MSO_AUTO_SIZE.NONE
        assert abs(loaded_text_frame.margin_left - Inches(0.1)) < Inches(0.01)
        assert abs(loaded_text_frame.margin_right - Inches(0.1)) < Inches(0.01)
        assert abs(loaded_text_frame.margin_top - Inches(0.05)) < Inches(0.01)
        assert abs(loaded_text_frame.margin_bottom - Inches(0.05)) < Inches(0.01)
        
        loaded_p = loaded_text_frame.paragraphs[0]
        assert loaded_p.text == "Basic Test テキスト"
        loaded_font = loaded_p.font
        assert loaded_font.name == 'メイリオ'
        assert abs(loaded_font.size.pt - 14) < 0.1
        assert loaded_font.bold == True
        assert loaded_font.italic == True

    def test_autosize_none(self, create_test_presentation, test_pptx_path):
        """MSO_AUTO_SIZE.NONEの動作をテストする"""
        prs = create_test_presentation
        slide = prs.slides.add_slide(prs.slide_layouts[6])
        
        # 固定サイズのテキストボックスを作成
        textbox = slide.shapes.add_textbox(Inches(2), Inches(2), Inches(2), Inches(1))
        text_frame = textbox.text_frame
        text_frame.auto_size = MSO_AUTO_SIZE.NONE
        
        # 長いテキストを追加
        p = text_frame.paragraphs[0]
        p.text = "This is a very long text that should not change the size of the textbox. " * 3
        
        # TextboxAdjusterを適用
        adjuster = TextboxAdjuster(textbox)
        adjuster.adjust_size()
        
        # 保存して検証
        prs.save(test_pptx_path)
        
        # 読み込んで検証
        loaded_prs = Presentation(test_pptx_path)
        loaded_shape = loaded_prs.slides[0].shapes[0]
        
        # サイズが変わっていないことを確認
        assert abs(loaded_shape.width - Inches(2)) < Inches(0.01)
        assert abs(loaded_shape.height - Inches(1)) < Inches(0.01)

    def test_autosize_shape_to_fit_text(self, create_test_presentation, test_pptx_path):
        """MSO_AUTO_SIZE.SHAPE_TO_FIT_TEXTの動作をテストする"""
        prs = create_test_presentation
        slide = prs.slides.add_slide(prs.slide_layouts[6])
        
        # テキストに合わせてサイズが変わるテキストボックスを作成
        textbox = slide.shapes.add_textbox(Inches(2), Inches(2), Inches(2), Inches(1))
        text_frame = textbox.text_frame
        text_frame.auto_size = MSO_AUTO_SIZE.SHAPE_TO_FIT_TEXT
        
        # 長いテキストを追加
        p = text_frame.paragraphs[0]
        p.text = "This is a text that should make the textbox larger to fit. " * 3
        
        # TextboxAdjusterを適用
        adjuster = TextboxAdjuster(textbox)
        adjuster.adjust_size()
        
        # 保存して検証
        prs.save(test_pptx_path)
        
        # 読み込んで検証
        loaded_prs = Presentation(test_pptx_path)
        loaded_shape = loaded_prs.slides[0].shapes[0]
        
        # 高さが増加していることを確認（正確な値は環境依存のため、おおよその検証）
        assert loaded_shape.height > Inches(1)
        # 幅は変わっていないことを確認
        assert abs(loaded_shape.width - Inches(2)) < Inches(0.01)

    def test_text_to_shape_simulation(self, create_test_presentation, test_pptx_path):
        """MSO_AUTO_SIZE.TEXT_TO_FIT_SHAPEの動作をテストする"""
        prs = create_test_presentation
        slide = prs.slides.add_slide(prs.slide_layouts[6])
        
        # 固定サイズのテキストボックスを作成
        textbox = slide.shapes.add_textbox(Inches(2), Inches(2), Inches(2), Inches(1))
        text_frame = textbox.text_frame
        text_frame.auto_size = MSO_AUTO_SIZE.TEXT_TO_FIT_SHAPE
        
        # 長いテキストを追加
        p = text_frame.paragraphs[0]
        p.text = "This is a sample text that needs to fit in the box. " * 2
        
        # TextboxAdjusterを適用
        adjuster = TextboxAdjuster(textbox)
        adjuster.adjust_size()
        
        # 保存して検証
        prs.save(test_pptx_path)
        
        # 読み込んで検証
        loaded_prs = Presentation(test_pptx_path)
        loaded_shape = loaded_prs.slides[0].shapes[0]
        loaded_text_frame = loaded_shape.text_frame
        
        # サイズが変わっていないことを確認
        assert abs(loaded_shape.width - Inches(2)) < Inches(0.01)
        assert abs(loaded_shape.height - Inches(1)) < Inches(0.01)
        
        # フォントサイズが小さくなっていることを確認
        loaded_p = loaded_text_frame.paragraphs[0]
        assert loaded_p.font.size < Pt(12)  # デフォルトの12ptより小さくなっているはず

    def test_japanese_text_properties(self, create_test_presentation, test_pptx_path):
        """日本語テキストの特性をテストする"""
        prs = create_test_presentation
        slide = prs.slides.add_slide(prs.slide_layouts[6])
        
        # 日本語テキスト用のテキストボックスを作成
        textbox = slide.shapes.add_textbox(Inches(2), Inches(2), Inches(4), Inches(2))
        text_frame = textbox.text_frame
        text_frame.word_wrap = True
        text_frame.auto_size = MSO_AUTO_SIZE.SHAPE_TO_FIT_TEXT
        
        # 日本語テキストを追加
        p = text_frame.paragraphs[0]
        p.text = "これは日本語のテキストです。改行や禁則処理のテストを行います。"
        font = p.font
        font.name = 'メイリオ'
        font.size = Pt(14)
        
        # 2つ目の段落を追加（縦書きテストのため）
        p2 = text_frame.add_paragraph()
        p2.text = "縦書きテスト"
        # 注: python-pptxは直接的な縦書き設定をサポートしていない
        
        # TextboxAdjusterを適用
        adjuster = TextboxAdjuster(textbox)
        adjuster.adjust_size()
        
        # 保存して検証
        prs.save(test_pptx_path)
        
        # 読み込んで検証
        loaded_prs = Presentation(test_pptx_path)
        loaded_shape = loaded_prs.slides[0].shapes[0]
        loaded_text_frame = loaded_shape.text_frame
        
        # テキストとフォント設定を検証
        assert loaded_text_frame.paragraphs[0].text == "これは日本語のテキストです。改行や禁則処理のテストを行います。"
        assert loaded_text_frame.paragraphs[0].font.name == 'メイリオ'
        assert abs(loaded_text_frame.paragraphs[0].font.size.pt - 14) < 0.1
        
        # 2つ目の段落も検証
        assert loaded_text_frame.paragraphs[1].text == "縦書きテスト" 