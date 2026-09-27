import React, { useState, useEffect } from 'react';
import { FileText, FileBarChart, Image as ImageIcon, Film, File } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

// Use same worker as pdfHelper
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

const ICONS = {
  photo:       ImageIcon,
  video:       Film,
  report:      FileText,
  publication: FileText,
  dataset:     FileBarChart,
};

const ContentThumbnail = ({ item }) => {
  const [thumbnailUrl, setThumbnailUrl] = useState(item.thumbnail || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    // If we already have a thumbnail (e.g. photo/video from backend), use it
    if (item.thumbnail) {
      setThumbnailUrl(item.thumbnail);
      setLoading(false);
      return;
    }

    const isPdf = item.content_type === 'report' || item.content_type === 'publication' || 
                  (item.download_url && item.download_url.toLowerCase().endsWith('.pdf'));

    if (isPdf && item.download_url) {
      let isMounted = true;
      setLoading(true);
      setError(false);

      const fetchPdfThumbnail = async () => {
        try {
          const loadingTask = pdfjsLib.getDocument({
            url: item.download_url,
            // Optimization for partial downloads
            disableAutoFetch: true,
            disableStream: true
          });
          const pdf = await loadingTask.promise;
          const page = await pdf.getPage(1);
          const viewport = page.getViewport({ scale: 0.8 }); // Moderate scale for card preview
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext("2d");
          await page.render({ canvasContext: ctx, viewport }).promise;
          
          if (isMounted) {
            setThumbnailUrl(canvas.toDataURL("image/jpeg", 0.9));
            setLoading(false);
          }
        } catch (err) {
          console.error("Failed to render PDF thumbnail:", err);
          if (isMounted) {
            setError(true);
            setLoading(false);
          }
        }
      };

      fetchPdfThumbnail();

      return () => {
        isMounted = false;
      };
    } else {
      // For datasets without thumbnails, or other unhandled types
      setLoading(false);
    }
  }, [item, item.thumbnail, item.download_url, item.content_type]);

  const IconComponent = ICONS[item.content_type] || File;

  if (loading) {
    return (
      <div className="absolute inset-0 bg-ncpor-panel animate-pulse flex items-center justify-center">
        <div className="w-full h-full bg-gradient-to-r from-ncpor-panel via-ncpor-divider/20 to-ncpor-panel shimmer" />
      </div>
    );
  }

  if (thumbnailUrl && !error) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-[#111111] transition-transform duration-300 ease-out group-hover:scale-[1.02]">
        <img 
          src={thumbnailUrl} 
          alt={`${item.title} preview`}
          className="max-w-full max-h-[190px] object-contain shadow-[0_4px_15px_rgba(0,0,0,0.5)] border border-ncpor-divider/30 bg-white"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent opacity-50 pointer-events-none" />
        
        {/* Subtle metadata overlay */}
        <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm border border-ncpor-divider/50 rounded px-2 py-0.5 pointer-events-none">
          <span className="text-[9px] font-bold tracking-widest text-ncpor-accent uppercase">{item.content_type}</span>
        </div>
      </div>
    );
  }

  // Fallback state (Error or No Visual Asset)
  return (
    <div className="absolute inset-0 bg-ncpor-panel flex flex-col items-center justify-center overflow-hidden border-b border-ncpor-divider/10 transition-transform duration-300 ease-out group-hover:scale-[1.02]">
      <IconComponent className="w-10 h-10 text-ncpor-muted/50 mb-3 transition-colors duration-300 group-hover:text-ncpor-accent/80" strokeWidth={1} />
      <span className="text-[9px] font-medium text-ncpor-muted/60 uppercase tracking-widest text-center px-4">
        {error ? "Preview Unavailable" : item.content_type}
      </span>
      <div className="absolute inset-0 bg-gradient-to-t from-ncpor-sidebar via-transparent to-transparent opacity-80 pointer-events-none" />
    </div>
  );
};

export default ContentThumbnail;
