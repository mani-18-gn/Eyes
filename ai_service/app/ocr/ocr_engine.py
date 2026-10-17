import re
from typing import Dict, Any, List, Optional
from datetime import datetime

class OCREngine:
    """
    Structured document and visual text parsing engine.
    Extracts dates, currency amounts, deadlines, and circular metadata.
    """

    def extract_structured_entities(self, text: str) -> Dict[str, Any]:
        if not text:
            return {
                "dates": [],
                "amounts": [],
                "deadlines": [],
                "urls": [],
                "emails": []
            }

        # 1. Date extraction (DD/MM/YYYY, YYYY-MM-DD, Month DD, YYYY)
        date_patterns = [
            r'\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b',
            r'\b\d{4}[/-]\d{1,2}[/-]\d{1,2}\b',
            r'\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? \d{4}\b'
        ]
        dates = []
        for pattern in date_patterns:
            matches = re.findall(pattern, text, flags=re.IGNORECASE)
            dates.extend(matches)
        dates = list(dict.fromkeys(dates))

        # 2. Currency extraction (₹, Rs., INR, $, €)
        currency_patterns = [
            r'(?:₹|Rs\.?|INR)\s*(\d+(?:,\d+)*(?:\.\d{1,2})?)',
            r'\$\s*(\d+(?:,\d+)*(?:\.\d{1,2})?)',
            r'TOTAL\s*:?\s*(?:₹|Rs\.?)?\s*(\d+(?:\.\d{1,2})?)'
        ]
        amounts = []
        for pattern in currency_patterns:
            matches = re.findall(pattern, text, flags=re.IGNORECASE)
            for m in matches:
                try:
                    cleaned = float(m.replace(",", ""))
                    amounts.append(cleaned)
                except ValueError:
                    continue
        amounts = sorted(list(set(amounts)), reverse=True)

        # 3. Deadlines & action items
        deadline_patterns = [
            r'(?:deadline|submission date|last date|due date|scheduled for)\s*:?\s*([^\n\.,]+)',
            r'(?:exam date|viva date|test date)\s*:?\s*([^\n\.,]+)'
        ]
        deadlines = []
        for pattern in deadline_patterns:
            matches = re.findall(pattern, text, flags=re.IGNORECASE)
            deadlines.extend([m.strip() for m in matches])

        # 4. URLs & Emails
        urls = re.findall(r'https?://[^\s]+', text)
        emails = re.findall(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+', text)

        return {
            "dates": dates,
            "amounts": amounts,
            "deadlines": deadlines,
            "urls": urls,
            "emails": emails,
            "detected_lines_count": len(text.strip().splitlines())
        }

ocr_engine = OCREngine()
