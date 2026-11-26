import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownContentProps {
  content: string;
}

function isSafeHref(href?: string): boolean {
  if (!href) return false;
  try {
    const parsed = new URL(href, 'https://bspi.polytech.gov.bd');
    return (
      parsed.protocol === 'https:' ||
      parsed.protocol === 'http:' ||
      parsed.protocol === 'mailto:'
    );
  } catch {
    return false;
  }
}

export function MarkdownContent({ content }: MarkdownContentProps) {
  return (
    <div className="text-[15px] leading-[1.8] text-slate-800 break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-base font-bold text-slate-900 mt-4 mb-2 first:mt-0 tracking-tight">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-[15.5px] font-bold text-slate-900 mt-4 mb-2 first:mt-0 tracking-tight">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-[15px] font-semibold text-slate-900 mt-3.5 mb-1.5 first:mt-0">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-sm font-semibold text-slate-900 mt-3 mb-1 first:mt-0">
              {children}
            </h4>
          ),
          p: ({ children }) => (
            <p className="text-[15px] leading-[1.8] text-slate-800 mb-3.5 last:mb-0">
              {children}
            </p>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-slate-950">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic text-slate-700">{children}</em>
          ),
          ul: ({ children }) => (
            <ul className="my-3 pl-5 space-y-2 list-disc marker:text-blue-600 text-[15px] leading-[1.75] text-slate-800 last:mb-0">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="my-3 pl-5 space-y-2 list-decimal marker:text-blue-700 marker:font-semibold text-[15px] leading-[1.75] text-slate-800 last:mb-0">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="pl-1 [&>p]:mb-1.5 [&>p:last-child]:mb-0 [&>ul]:mt-1.5 [&>ol]:mt-1.5">
              {children}
            </li>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-3.5 pl-4 pr-3 py-2 border-l-3 border-blue-600/70 bg-blue-50/50 rounded-r-xl text-slate-700 text-[14.5px] leading-[1.75] [&>p:last-child]:mb-0">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-4 border-slate-200/90" />,
          a: ({ href, children }) =>
            isSafeHref(href) ? (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-blue-700 underline decoration-blue-300 underline-offset-2 hover:text-blue-800 hover:decoration-blue-600 transition-colors"
              >
                {children}
              </a>
            ) : (
              <span>{children}</span>
            ),
          pre: ({ children }) => (
            <pre className="my-3.5 p-3.5 rounded-xl bg-slate-900 text-slate-100 overflow-x-auto text-[13px] font-mono leading-relaxed">
              {children}
            </pre>
          ),
          code: ({ className, children, ...props }) => {
            const isBlock = Boolean(className?.startsWith('language-'));
            if (isBlock) {
              return (
                <code className={className} {...props}>
                  {children}
                </code>
              );
            }
            return (
              <code
                className="px-1.5 py-0.5 mx-0.5 rounded-md bg-slate-100 border border-slate-200/80 font-mono text-[13px] text-blue-900"
                {...props}
              >
                {children}
              </code>
            );
          },
          table: ({ children }) => (
            <div className="my-3.5 overflow-x-auto rounded-xl border border-slate-200/90 bg-white">
              <table className="w-full text-left border-collapse text-sm">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-slate-50/90 border-b border-slate-200/90">
              {children}
            </thead>
          ),
          th: ({ children }) => (
            <th className="px-3.5 py-2.5 text-xs font-semibold text-slate-700 whitespace-nowrap">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3.5 py-2.5 text-sm text-slate-700 border-t border-slate-200/70 align-top">
              {children}
            </td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
