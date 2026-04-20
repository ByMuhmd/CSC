import DOMPurify from 'dompurify';

export function sanitizeHtml(html: string): string {
    if (!html) return '';
    return DOMPurify.sanitize(html, {
        ALLOWED_TAGS: [
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'p', 'a', 'ul', 'ol',
            'nl', 'li', 'b', 'i', 'strong', 'em', 'strike', 'code', 'hr', 'br', 'div',
            'table', 'thead', 'caption', 'tbody', 'tr', 'th', 'td', 'pre', 'iframe',
            'img', 'span'
        ],
        ALLOWED_ATTR: [
            'href', 'name', 'target', 'src', 'alt', 'title', 'class', 'style',
            'id', 'width', 'height', 'frameborder', 'allowfullscreen', 'dir', 'encoding'
        ],
        ADD_TAGS: ['iframe'],
        ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling']
    });
}

export function sanitizeText(text: string): string {
    if (!text) return '';
    return text.replace(/<[^>]*>?/gm, '').trim();
}
