#!/usr/bin/env python3
"""
シンプルなPPTXパーサー
スライド数とメタデータを取得するための最小限の実装
"""

import argparse
import json
import os
import sys
from zipfile import ZipFile
import xml.etree.ElementTree as ET

def get_slide_count(pptx_path):
    """PPTXファイルからスライド数を取得する"""
    try:
        with ZipFile(pptx_path) as zip_file:
            # presentation.xmlからスライド数を取得
            if 'ppt/presentation.xml' in zip_file.namelist():
                with zip_file.open('ppt/presentation.xml') as f:
                    xml_content = f.read()
                    root = ET.fromstring(xml_content)
                    # スライド数を数える
                    slide_count = len([1 for _ in root.findall('.//{http://schemas.openxmlformats.org/presentationml/2006/main}sldId')])
                    return slide_count
            
            # 別の方法: スライドファイルを数える
            slide_count = len([f for f in zip_file.namelist() if f.startswith('ppt/slides/slide') and f.endswith('.xml')])
            return slide_count
    except Exception as e:
        print(f"エラー: {str(e)}", file=sys.stderr)
        return 0

def get_metadata(pptx_path):
    """PPTXファイルからメタデータを取得する"""
    metadata = {
        "title": os.path.basename(pptx_path),
        "author": "Unknown",
        "created": "",
        "modified": "",
        "lastModifiedBy": "",
        "revision": 1,
        "presentationFormat": "Unknown"
    }
    
    try:
        with ZipFile(pptx_path) as zip_file:
            # core.xmlからメタデータを取得
            if 'docProps/core.xml' in zip_file.namelist():
                with zip_file.open('docProps/core.xml') as f:
                    xml_content = f.read()
                    root = ET.fromstring(xml_content)
                    
                    # 名前空間
                    ns = {
                        'dc': 'http://purl.org/dc/elements/1.1/',
                        'cp': 'http://schemas.openxmlformats.org/package/2006/metadata/core-properties',
                        'dcterms': 'http://purl.org/dc/terms/'
                    }
                    
                    # タイトル
                    title_elem = root.find('.//dc:title', ns)
                    if title_elem is not None and title_elem.text:
                        metadata["title"] = title_elem.text
                    
                    # 作成者
                    creator_elem = root.find('.//dc:creator', ns)
                    if creator_elem is not None and creator_elem.text:
                        metadata["author"] = creator_elem.text
                    
                    # 作成日時
                    created_elem = root.find('.//dcterms:created', ns)
                    if created_elem is not None and created_elem.text:
                        metadata["created"] = created_elem.text
                    
                    # 更新日時
                    modified_elem = root.find('.//dcterms:modified', ns)
                    if modified_elem is not None and modified_elem.text:
                        metadata["modified"] = modified_elem.text
                    
                    # 最終更新者
                    last_modified_by_elem = root.find('.//cp:lastModifiedBy', ns)
                    if last_modified_by_elem is not None and last_modified_by_elem.text:
                        metadata["lastModifiedBy"] = last_modified_by_elem.text
                    
                    # リビジョン
                    revision_elem = root.find('.//cp:revision', ns)
                    if revision_elem is not None and revision_elem.text:
                        try:
                            metadata["revision"] = int(revision_elem.text)
                        except ValueError:
                            pass
    except Exception as e:
        print(f"メタデータ取得エラー: {str(e)}", file=sys.stderr)
    
    return metadata

def main():
    parser = argparse.ArgumentParser(description='シンプルなPPTXパーサー')
    parser.add_argument('--input', required=True, help='入力PPTXファイルのパス')
    parser.add_argument('--count-only', nargs='?', const=True, default=False, help='スライド数のみを取得')
    parser.add_argument('--metadata-only', nargs='?', const=True, default=False, help='メタデータのみを取得')
    
    args = parser.parse_args()
    
    if not os.path.exists(args.input):
        print(f"エラー: ファイル '{args.input}' が見つかりません", file=sys.stderr)
        sys.exit(1)
    
    result = {}
    
    if args.count_only:
        slide_count = get_slide_count(args.input)
        result = {"slideCount": slide_count}
    elif args.metadata_only:
        metadata = get_metadata(args.input)
        result = {"metadata": metadata}
    else:
        # デフォルトは両方取得
        slide_count = get_slide_count(args.input)
        metadata = get_metadata(args.input)
        result = {
            "slideCount": slide_count,
            "metadata": metadata
        }
    
    # JSON形式で結果を出力
    print(json.dumps(result))

if __name__ == "__main__":
    main()
