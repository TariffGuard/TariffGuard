'use client';

import React from 'react';

interface InlineMatch {
  index: number;
  length: number;
  node: React.ReactNode;
}

/**
 * Lightweight markdown renderer for AI explanation text.
 * Handles: ## headings, ** bold, - bullet lists, numbered lists,
 * newlines, and inline `code`. No external dependency needed.
 */
export function MarkdownText({ text, className = '' }: { text: string; className?: string }) {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let listBuffer: React.ReactNode[] = [];
  let listType: 'ul' | 'ol' | null = null;

  const flushList = () => {
    if (listBuffer.length > 0 && listType) {
      const Tag = listType;
      elements.push(
        <Tag key={`list-${elements.length}`} className="space-y-1 my-2 ml-4 list-disc list-outside text-[var(--color-text-secondary)]">
          {listBuffer}
        </Tag>
      );
      listBuffer = [];
      listType = null;
    }
  };

  const renderInline = (line: string, key: string): React.ReactNode => {
    const parts: React.ReactNode[] = [];
    let remaining = line;
    let idx = 0;

    while (remaining.length > 0) {
      const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
      const codeMatch = remaining.match(/`(.+?)`/);

      let best: InlineMatch | null = null;

      if (boldMatch) {
        const bIdx = boldMatch.index ?? 0;
        best = {
          index: bIdx,
          length: boldMatch[0].length,
          node: <strong key={`b-${idx}`} className="font-semibold text-[var(--color-text-primary)]">{boldMatch[1]}</strong>,
        };
      }

      if (codeMatch) {
        const cIdx = codeMatch.index ?? 0;
        if (!best || cIdx < best.index) {
          best = {
            index: cIdx,
            length: codeMatch[0].length,
            node: <code key={`c-${idx}`} className="px-1.5 py-0.5 bg-[rgba(128,102,179,0.1)] rounded text-xs font-mono">{codeMatch[1]}</code>,
          };
        }
      }

      if (best) {
        if (best.index > 0) {
          parts.push(<span key={`t-${idx}`}>{remaining.slice(0, best.index)}</span>);
        }
        parts.push(best.node);
        remaining = remaining.slice(best.index + best.length);
        idx++;
      } else {
        parts.push(<span key={`t-${idx}`}>{remaining}</span>);
        break;
      }
    }

    return <span key={key}>{parts}</span>;
  };

  lines.forEach((rawLine, i) => {
    const line = rawLine.trimEnd();

    if (!line.trim()) {
      flushList();
      return;
    }

    const headingMatch = line.match(/^(#{1,3})\s+(.+)/);
    if (headingMatch) {
      flushList();
      const level = headingMatch[1].length;
      const hText = headingMatch[2];
      if (level === 1) {
        elements.push(<h2 key={`h-${i}`} className="text-base font-bold text-[var(--color-text-primary)] mt-3 mb-1">{renderInline(hText, `hi-${i}`)}</h2>);
      } else if (level === 2) {
        elements.push(<h3 key={`h-${i}`} className="text-sm font-semibold text-[var(--color-text-primary)] mt-3 mb-1">{renderInline(hText, `hi-${i}`)}</h3>);
      } else {
        elements.push(<h4 key={`h-${i}`} className="text-sm font-medium text-[var(--color-text-primary)] mt-2 mb-1">{renderInline(hText, `hi-${i}`)}</h4>);
      }
      return;
    }

    const ulMatch = line.match(/^\s*[-*]\s+(.+)/);
    if (ulMatch) {
      if (listType !== 'ul') flushList();
      listType = 'ul';
      listBuffer.push(<li key={`li-${i}`} className="text-sm">{renderInline(ulMatch[1], `li-${i}`)}</li>);
      return;
    }

    const olMatch = line.match(/^\s*\d+\.\s+(.+)/);
    if (olMatch) {
      if (listType !== 'ol') flushList();
      listType = 'ol';
      listBuffer.push(<li key={`li-${i}`} className="text-sm">{renderInline(olMatch[1], `li-${i}`)}</li>);
      return;
    }

    flushList();
    elements.push(<p key={`p-${i}`} className="text-sm leading-relaxed my-1">{renderInline(line, `pi-${i}`)}</p>);
  });

  flushList();

  return <div className={className}>{elements}</div>;
}
