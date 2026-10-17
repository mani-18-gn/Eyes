import io
from typing import Tuple, Dict, Any
from PIL import Image, ImageFilter, ImageStat, ImageOps

class VisionPreprocessor:
    """
    Real image preprocessing pipeline:
    - Orientation correction (EXIF)
    - Perceptual blur detection using edge variance
    - Dynamic resizing and thumbnail generation
    - Luminance & contrast quality assessment
    """

    def __init__(self, blur_threshold: float = 35.0, max_dimension: int = 1600):
        self.blur_threshold = blur_threshold
        self.max_dimension = max_dimension

    def compute_blur_score(self, image: Image.Image) -> float:
        """
        Computes edge variance using high-pass Laplacian-like edge detection.
        Blurry images have low edge variance (smooth transitions).
        Sharp images have high edge variance.
        """
        # Convert to grayscale
        gray = image.convert("L")
        
        # Apply edge-detection kernel (Laplacian approximation)
        edges = gray.filter(ImageFilter.FIND_EDGES)
        
        # Crop 2-pixel margin to remove convolution border padding artifacts
        w, h = edges.size
        if w > 4 and h > 4:
            edges = edges.crop((2, 2, w - 2, h - 2))
        
        # Calculate statistical variance of edge pixel intensities
        stat = ImageStat.Stat(edges)
        variance = stat.var[0] if stat.var else 0.0
        return float(variance)

    def process(self, image_bytes: bytes) -> Dict[str, Any]:
        """
        Executes full preprocessing and returns optimized bytes, thumbnail, and metrics.
        """
        original_image = Image.open(io.BytesIO(image_bytes))
        
        # 1. Correct EXIF orientation
        image = ImageOps.exif_transpose(original_image)
        if image is None:
            image = original_image
            
        orig_width, orig_height = image.size
        
        # 2. Perceptual Blur Detection
        blur_score = self.compute_blur_score(image)
        is_blurry = blur_score < self.blur_threshold
        
        # 3. Luminance assessment
        gray = image.convert("L")
        stat = ImageStat.Stat(gray)
        mean_luminance = stat.mean[0] if stat.mean else 128.0
        is_too_dark = mean_luminance < 25.0
        is_too_bright = mean_luminance > 240.0
        
        # 4. Resize if larger than max_dimension while preserving aspect ratio
        if max(orig_width, orig_height) > self.max_dimension:
            image.thumbnail((self.max_dimension, self.max_dimension), Image.Resampling.LANCZOS)
            
        final_width, final_height = image.size
        
        # Export processed image
        optimized_buffer = io.BytesIO()
        rgb_image = image.convert("RGB")
        rgb_image.save(optimized_buffer, format="JPEG", quality=88, optimize=True)
        optimized_bytes = optimized_buffer.getvalue()
        
        # 5. Generate Thumbnail (max 320x240)
        thumb_image = image.copy()
        thumb_image.thumbnail((320, 240), Image.Resampling.LANCZOS)
        thumb_buffer = io.BytesIO()
        thumb_image.convert("RGB").save(thumb_buffer, format="JPEG", quality=80)
        thumbnail_bytes = thumb_buffer.getvalue()
        
        warnings = []
        if is_blurry:
            warnings.append(f"Image is blurry (sharpness score {blur_score:.1f} < {self.blur_threshold}). Details may be uncertain.")
        if is_too_dark:
            warnings.append("Scene is severely underexposed. Text or fine objects might not be resolved.")
        if is_too_bright:
            warnings.append("Scene has severe glare or overexposure.")
            
        return {
            "optimized_bytes": optimized_bytes,
            "thumbnail_bytes": thumbnail_bytes,
            "width": final_width,
            "height": final_height,
            "original_width": orig_width,
            "original_height": orig_height,
            "blur_score": round(blur_score, 2),
            "is_blurry": is_blurry,
            "mean_luminance": round(mean_luminance, 2),
            "warnings": warnings
        }

preprocessor = VisionPreprocessor()
