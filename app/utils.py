import os
import mimetypes
try:
    import magic
except ImportError:
    magic = None

import pdfplumber
import pandas as pd
from PIL import Image

def validate_file_type(file_content: bytes, allowed_mimes: list[str]) -> bool:
    if magic:
        try:
            mime_type = magic.from_buffer(file_content, mime=True)
            return mime_type in allowed_mimes
        except Exception:
            pass
    return True

def extract_pdf_text_safe(file_path: str) -> tuple[str, int]:
    try:
        with pdfplumber.open(file_path) as pdf:
            text = ""
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
            return text.strip(), len(pdf.pages)
    except Exception as e:
        print(f"PDF extraction warning: {e}")
        return "", 0

def generate_dataset_preview_safe(file_path: str, file_format: str):
    from app.schemas import DatasetPreview
    try:
        if file_format == "csv":
            encodings = ['utf-8', 'utf-8-sig', 'latin-1', 'cp1252']
            df = None
            for enc in encodings:
                try:
                    df = pd.read_csv(file_path, encoding=enc, nrows=20, on_bad_lines='skip')
                    full_df = pd.read_csv(file_path, encoding=enc, on_bad_lines='skip')
                    break
                except Exception:
                    continue
            if df is None:
                raise ValueError("Could not parse CSV with any standard encoding")
        elif file_format == "excel":
            df = pd.read_excel(file_path, nrows=20)
            full_df = pd.read_excel(file_path)
        else:
            return DatasetPreview(columns=[], rows=[], total_rows=0, preview_error="Unsupported format")
        
        # Calculate stats for numeric columns
        stats = {}
        numeric_cols = full_df.select_dtypes(include=['number']).columns
        for col in numeric_cols:
            stats[col] = {
                "min": float(full_df[col].min()) if not pd.isna(full_df[col].min()) else None,
                "max": float(full_df[col].max()) if not pd.isna(full_df[col].max()) else None,
                "mean": float(full_df[col].mean()) if not pd.isna(full_df[col].mean()) else None
            }
            
        return DatasetPreview(
            columns=df.columns.tolist(),
            rows=df.fillna("").values.tolist(),
            total_rows=len(full_df),
            stats=stats
        )
    except Exception as e:
        print(f"Preview generation error: {e}")
        return DatasetPreview(columns=[], rows=[], total_rows=0, preview_error=str(e))

def generate_thumbnail_safe(image_path: str, thumbnail_path: str) -> bool:
    try:
        with Image.open(image_path) as img:
            # Convert to RGB if necessary (e.g. RGBA or P)
            if img.mode in ("RGBA", "P"):
                img = img.convert("RGB")
            
            width = 300
            aspect_ratio = width / img.width
            height = int(img.height * aspect_ratio)
            
            img_resized = img.resize((width, height), Image.Resampling.LANCZOS)
            img_resized.save(thumbnail_path, "JPEG", quality=85)
        return True
    except Exception as e:
        print(f"Thumbnail generation error: {e}")
        return False
