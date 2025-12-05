/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Copy, Check } from "lucide-react";

interface CodeBlockProps {
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
}

const CodeBlock: React.FC<CodeBlockProps> = ({
  inline,
  className,
  children,
}) => {
  const [isCopied, setIsCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || "");
  const lang = match ? match[1] : "text";
  const code = String(children).replace(/\n$/, "");

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  if (inline) {
    return (
      <code className="bg-gray-100 text-indigo-600 font-mono text-xs px-1.5 py-0.5 rounded border border-gray-200">
        {children}
      </code>
    );
  }

  return (
    <div className="relative my-3 bg-neutral-900 rounded-lg overflow-hidden border border-neutral-800 shadow-sm">
      <div className="flex items-center justify-between bg-black/30 px-3 py-1.5 text-xs border-b border-neutral-800">
        <span className="font-mono text-neutral-400">{lang}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-white/10 transition-colors text-neutral-400 hover:text-white"
        >
          {isCopied ? <Check size={12} /> : <Copy size={12} />}
          {isCopied ? "Copied" : "Copy"}
        </button>
      </div>

      <SyntaxHighlighter
        style={atomDark}
        language={lang}
        PreTag="pre"
        className="p-3! text-xs! font-mono! leading-relaxed! overflow-x-auto! bg-transparent!"
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
};

const MarkdownRenderer: React.FC<{ content: string }> = memo(({ content }) => {
  if (!content) return null;

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code: CodeBlock,
        img: ({ node, ...props }) => (
          <img
            className="max-w-full h-auto max-h-[250px] rounded-lg border border-gray-200 my-2 object-contain bg-white shadow-sm"
            loading="lazy"
            {...props}
          />
        ),
        a: ({ node, ...props }) => (
          <a
            className="text-indigo-600 hover:text-indigo-800 hover:underline font-medium break-all decoration-indigo-200 underline-offset-2"
            target="_blank"
            rel="noopener noreferrer"
            {...props}
          />
        ),
        h1: ({ node, ...props }) => (
          <h1
            className="text-lg font-bold mt-4 mb-2 text-gray-900 border-b border-gray-100 pb-2"
            {...props}
          />
        ),
        h2: ({ node, ...props }) => (
          <h2
            className="text-base font-bold mt-3 mb-2 text-gray-800"
            {...props}
          />
        ),
        h3: ({ node, ...props }) => (
          <h3
            className="text-sm font-semibold mt-2 mb-1 text-gray-700"
            {...props}
          />
        ),
        ul: ({ node, ...props }) => (
          <ul
            className="list-disc pl-4 mb-2 space-y-1 text-gray-700 marker:text-gray-400"
            {...props}
          />
        ),
        ol: ({ node, ...props }) => (
          <ol
            className="list-decimal pl-4 mb-2 space-y-1 text-gray-700 marker:text-gray-500"
            {...props}
          />
        ),
        li: ({ node, ...props }) => <li className="pl-1" {...props} />,
        table: ({ node, ...props }) => (
          <div className="overflow-x-auto my-3 border border-gray-200 rounded-lg shadow-sm">
            <table
              className="min-w-full divide-y divide-gray-200 text-xs"
              {...props}
            />
          </div>
        ),
        thead: ({ node, ...props }) => (
          <thead className="bg-gray-50" {...props} />
        ),
        tbody: ({ node, ...props }) => (
          <tbody className="bg-white divide-y divide-gray-100" {...props} />
        ),
        tr: ({ node, ...props }) => (
          <tr className="hover:bg-gray-50/50 transition-colors" {...props} />
        ),
        th: ({ node, ...props }) => (
          <th
            className="px-3 py-2 text-left font-semibold text-gray-500"
            {...props}
          />
        ),
        td: ({ node, ...props }) => (
          <td
            className="px-3 py-2 whitespace-nowrap text-gray-600"
            {...props}
          />
        ),
        blockquote: ({ node, ...props }) => (
          <blockquote
            className="border-l-2 border-indigo-300 bg-indigo-50/50 pl-3 py-1 my-2 text-gray-600 italic text-xs rounded-r"
            {...props}
          />
        ),
        hr: ({ node, ...props }) => (
          <hr className="my-4 border-gray-100" {...props} />
        ),
        p: ({ node, ...props }) => (
          <p
            className="mb-2 last:mb-0 leading-relaxed text-gray-700"
            {...props}
          />
        ),
        strong: ({ node, ...props }) => (
          <strong className="font-semibold text-gray-900" {...props} />
        ),
      }}
    >
      {String(content)}
    </ReactMarkdown>
  );
});

MarkdownRenderer.displayName = "MarkdownRenderer";
export default MarkdownRenderer;
