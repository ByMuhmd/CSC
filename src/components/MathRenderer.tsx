import React from 'react';
import DOMPurify from 'dompurify';
import 'katex/dist/katex.min.css';
import katex from 'katex';

const KATEX_PURIFY_CONFIG = {
    ALLOWED_TAGS: ['span', 'annotation', 'semantics', 'mrow', 'mi', 'mo', 'mn', 'msup', 'msub', 'mfrac', 'mtext', 'math'],
    ALLOWED_ATTR: ['class', 'style', 'encoding']
};

export function MathRenderer({ text, className = "" }: { text: string; className?: string }) {
    if (!text) return null;

    const parts = text.split(/```/);

    return (
        <div className={`space-y-3 text-sm md:text-base leading-relaxed ${className}`}>
            {parts.map((part, idx) => {
                if (idx % 2 === 0) {
                    return part.split('\n').map((line, lineIdx) => {
                        if (!line.trim()) return <div key={`${idx}-${lineIdx}`} className="h-2" />;

                        if (line.startsWith('### ')) {
                            return <h3 key={`${idx}-${lineIdx}`} className="text-lg font-bold text-purple-400 mt-4 mb-2">{formatInlineStyles(line.replace('### ', ''))}</h3>;
                        }

                        if (line.startsWith('## ')) {
                            return <h2 key={`${idx}-${lineIdx}`} className="text-xl font-bold text-purple-300 mt-5 mb-3 border-b border-white/10 pb-1">{formatInlineStyles(line.replace('## ', ''))}</h2>;
                        }

                        if (line.trim().match(/^[-*] /)) {
                            return (
                                <div key={`${idx}-${lineIdx}`} className="flex gap-2 ml-2 mb-1">
                                    <span className="text-purple-500 font-bold">•</span>
                                    <span>{formatInlineStyles(line.replace(/^[-*] /, ''))}</span>
                                </div>
                            );
                        }

                        if (line.trim().match(/^\d+\. /)) {
                            return (
                                <div key={`${idx}-${lineIdx}`} className="flex gap-2 ml-2 mb-1">
                                    <span className="text-purple-500 font-bold">{line.match(/^\d+\./)?.[0]}</span>
                                    <span>{formatInlineStyles(line.replace(/^\d+\. /, ''))}</span>
                                </div>
                            );
                        }

                        return (
                            <p key={`${idx}-${lineIdx}`} className="mb-1">
                                {formatInlineStyles(line)}
                            </p>
                        );
                    });
                } else {
                    let code = part.trim();
                    const firstLineMatch = code.match(/^([a-zA-Z0-9]+)\n/);
                    if (firstLineMatch) {
                        code = code.substring(firstLineMatch[0].length);
                    }

                    return (
                        <div key={idx} dir="ltr" className="text-left bg-black/80 rounded-xl p-4 border border-white/10 overflow-x-auto my-4 shadow-lg relative group">
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Code</div>
                            </div>
                            <pre className="font-mono text-sm text-purple-300 whitespace-pre-wrap leading-relaxed">
                                {code.trim()}
                            </pre>
                        </div>
                    );
                }
            })}
        </div>
    );
}

function formatInlineStyles(text: string) {
    const parts = text.split(/(\$\$[^$]+\$\$|\$[^$]+\$|`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g);

    return parts.map((part, idx) => {
        if (part.startsWith('$$') && part.endsWith('$$')) {
            const latex = part.slice(2, -2);
            try {
                const html = katex.renderToString(latex, {
                    displayMode: true,
                    throwOnError: false
                });
                const sanitizedHtml = DOMPurify.sanitize(html, KATEX_PURIFY_CONFIG);
                return <span key={idx} dangerouslySetInnerHTML={{ __html: sanitizedHtml }} dir="ltr" style={{ unicodeBidi: 'isolate', display: 'inline-block', width: '100%', textAlign: 'center', margin: '1rem 0' }} />;
            } catch (e) {
                return <span key={idx} className="text-red-500">{part}</span>;
            }
        }
        if (part.startsWith('$') && part.endsWith('$')) {
            const latex = part.slice(1, -1);
            try {
                const html = katex.renderToString(latex, {
                    displayMode: false,
                    throwOnError: false
                });
                const sanitizedHtml = DOMPurify.sanitize(html, KATEX_PURIFY_CONFIG);
                return <span key={idx} dangerouslySetInnerHTML={{ __html: sanitizedHtml }} dir="ltr" style={{ unicodeBidi: 'isolate', display: 'inline-block' }} />;
            } catch (e) {
                return <span key={idx} className="text-red-500">{part}</span>;
            }
        }
        if (part.startsWith('`') && part.endsWith('`')) {
            return <code key={idx} className="bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded text-xs font-mono border border-purple-500/20">{part.slice(1, -1)}</code>;
        }
        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={idx} className="font-bold text-purple-400">{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('*') && part.endsWith('*')) {
            return <em key={idx} className="italic text-gray-300">{part.slice(1, -1)}</em>;
        }
        return part;
    });
}
