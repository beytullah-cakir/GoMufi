import React, { useState, useEffect, useRef } from 'react';
import { Layers, AlignLeft, AlignCenter, AlignRight, AlignStartVertical, AlignEndVertical, ChevronRight, ArrowUp, ArrowDown, ArrowUpToLine, ArrowDownToLine, Trash2, Copy, ExternalLink, MessageCircle } from 'lucide-react';

interface RightClickMenuProps {
    x: number;
    y: number;
    onClose: () => void;
    onAction: (action: string, value?: any) => void;
    elementId?: string; // If clicked on an element
}

const RightClickMenu: React.FC<RightClickMenuProps> = ({ x, y, onClose, onAction, elementId }) => {
    const menuRef = useRef<HTMLDivElement>(null);
    const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
    const hoverTimeout = useRef<any>(null);

    const handleMouseEnter = (submenu: string) => {
        if (hoverTimeout.current) {
            clearTimeout(hoverTimeout.current);
            hoverTimeout.current = null;
        }
        setActiveSubmenu(submenu);
    };

    const handleMouseLeave = () => {
        hoverTimeout.current = setTimeout(() => {
            setActiveSubmenu(null);
        }, 150); // 150ms delay to bridge the gap
    };

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
        };
    }, [onClose]);

    // Prevent overflow off screen
    const style: React.CSSProperties = {
        top: y,
        left: x,
    };

    // Safety check for screen edges (simple version)
    // Real implementation allows measuring ref, but we use fixed positioning for now.
    // We can assume user clicks are mostly central.

    if (!elementId) {
        // Menu for Background (Canvas)
        return (
            <div
                ref={menuRef}
                className="fixed z-[9999] bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl py-1 w-56 text-sm font-medium text-gray-700 dark:text-gray-200 select-none"
                style={style}
                onContextMenu={(e) => e.preventDefault()}
                onMouseDown={(e) => e.stopPropagation()}
            >
                <div className="px-3 py-2 text-xs text-gray-400 uppercase tracking-wider font-bold">Canvas Menu</div>
                <button onClick={() => onAction('paste')} className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2">
                    <span>Paste</span>
                    <span className="ml-auto text-xs text-gray-400">Ctrl+V</span>
                </button>
            </div>
        );
    }

    return (
        <div
            ref={menuRef}
            className="fixed z-[9999] bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl py-1 w-64 text-sm font-medium text-gray-700 dark:text-gray-200 select-none flex flex-col"
            style={style}
            onContextMenu={(e) => e.preventDefault()}
            onMouseDown={(e) => e.stopPropagation()}
        >
            {/* KATMAN (LAYER) */}
            <div
                className="relative group"
                onMouseEnter={() => handleMouseEnter('layer')}
                onMouseLeave={handleMouseLeave}
            >
                <button className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4" />
                        <span>Katman</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                </button>

                {/* Submenu */}
                {activeSubmenu === 'layer' && (
                    <div className="absolute left-full top-0 ml-1 bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl py-1 w-56"
                        onMouseEnter={() => handleMouseEnter('layer')} // Keep open when entering submenu
                        onMouseLeave={handleMouseLeave}
                    >
                        <button onClick={() => onAction('bringForward')} className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <ArrowUp className="w-4 h-4" />
                                <span>İleri getir</span>
                            </div>
                            <span className="text-[10px] text-gray-400">Ctrl+]</span>
                        </button>
                        <button onClick={() => onAction('bringToFront')} className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <ArrowUpToLine className="w-4 h-4" />
                                <span>Öne getir</span>
                            </div>
                            <span className="text-[10px] text-gray-400">Ctrl+Alt+]</span>
                        </button>
                        <button onClick={() => onAction('sendBackward')} className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <ArrowDown className="w-4 h-4" />
                                <span>Arkaya gönder</span>
                            </div>
                            <span className="text-[10px] text-gray-400">Ctrl+[</span>
                        </button>
                        <button onClick={() => onAction('sendToBack')} className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <ArrowDownToLine className="w-4 h-4" />
                                <span>En arkaya gönder</span>
                            </div>
                            <span className="text-[10px] text-gray-400">Ctrl+Alt+[</span>
                        </button>

                        <div className="my-1 border-t border-gray-200 dark:border-gray-700" />

                        <button onClick={() => onAction('toggleLayers')} className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Layers className="w-4 h-4" />
                                <span>Katmanları göster</span>
                            </div>
                            <span className="text-[10px] text-gray-400">Alt+1</span>
                        </button>
                    </div>
                )}
            </div>

            {/* SAYFAYA HIZALA (ALIGN) */}
            <div
                className="relative group"
                onMouseEnter={() => handleMouseEnter('align')}
                onMouseLeave={handleMouseLeave}
            >
                <button className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <AlignLeft className="w-4 h-4" />
                        <span>Sayfaya hizala</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                </button>

                {/* Submenu */}
                {activeSubmenu === 'align' && (
                    <div className="absolute left-full top-0 ml-1 bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl py-1 w-40"
                        onMouseEnter={() => handleMouseEnter('align')} // Keep open when entering submenu
                        onMouseLeave={handleMouseLeave}
                    >
                        <button onClick={() => onAction('align', 'left')} className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2">
                            <AlignLeft className="w-4 h-4" />
                            <span>Sol</span>
                        </button>
                        <button onClick={() => onAction('align', 'center-h')} className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2">
                            <AlignCenter className="w-4 h-4" />
                            <span>Orta</span>
                        </button>
                        <button onClick={() => onAction('align', 'right')} className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2">
                            <AlignRight className="w-4 h-4" />
                            <span>Sağ</span>
                        </button>

                        <div className="my-1 border-t border-gray-200 dark:border-gray-700" />

                        <button onClick={() => onAction('align', 'top')} className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2">
                            <AlignStartVertical className="w-4 h-4" />
                            <span>Üst</span>
                        </button>
                        <button onClick={() => onAction('align', 'center-v')} className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2">
                            <AlignEndVertical className="w-4 h-4 rotate-90" /> {/* Just using an icon that looks centered vertical */}
                            <span>Orta</span>
                        </button>
                        <button onClick={() => onAction('align', 'bottom')} className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2">
                            <AlignEndVertical className="w-4 h-4" />
                            <span>Alt</span>
                        </button>
                    </div>
                )}
            </div>

            <div className="my-1 border-t border-gray-200 dark:border-gray-700" />

            {/* Placeholders / Other Actions */}
            <button onClick={() => onAction('connect')} className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <ExternalLink className="w-4 h-4" />
                    <span>Bağlantı</span>
                </div>
                <span className="text-[10px] text-gray-400">Ctrl+K</span>
            </button>

            <button onClick={() => onAction('comment')} className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <MessageCircle className="w-4 h-4" />
                    <span>Yorum Yap</span>
                </div>
                <span className="text-[10px] text-gray-400">Ctrl+Alt+N</span>
            </button>

            <div className="my-1 border-t border-gray-200 dark:border-gray-700" />

            <button onClick={() => onAction('copy')} className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Copy className="w-4 h-4" />
                    <span>Kopyala</span>
                </div>
                <span className="text-[10px] text-gray-400">Ctrl+C</span>
            </button>

            <button onClick={() => onAction('delete')} className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-between text-red-500 hover:text-red-600">
                <div className="flex items-center gap-2">
                    <Trash2 className="w-4 h-4" />
                    <span>Sil</span>
                </div>
                <span className="text-[10px] text-red-400">Del</span>
            </button>

        </div>
    );
};

export default RightClickMenu;
