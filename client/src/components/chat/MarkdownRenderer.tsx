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
      <code className="bg-gray-100 text-red-600 px-1.5 py-0.5 rounded-md">
        {children}
      </code>
    );
  }

  return (
    <div className="relative my-3 bg-gray-900 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between bg-gray-800 text-gray-300 px-4 py-2 text-xs">
        <span className="font-mono">{lang}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs hover:bg-gray-700"
        >
          {isCopied ? <Check size={14} /> : <Copy size={14} />}
          {isCopied ? "Copied!" : "Copy"}
        </button>
      </div>

      <SyntaxHighlighter
        style={atomDark}
        language={lang}
        PreTag="pre"
        className="p-4! text-sm! font-mono! leading-relaxed! overflow-x-auto!"
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
        a: ({ node, ...props }) => (
          <a
            className="text-indigo-600 hover:text-indigo-800 underline break-all cursor-pointer"
            target="_blank"
            rel="noopener noreferrer"
            {...props}
          />
        ),
        h1: ({ node, ...props }) => (
          <h1
            className="text-xl font-bold mt-4 mb-2 pb-1 border-b border-gray-200"
            {...props}
          />
        ),
        h2: ({ node, ...props }) => (
          <h2
            className="text-lg font-bold mt-3 mb-2 text-gray-800"
            {...props}
          />
        ),
        h3: ({ node, ...props }) => (
          <h3
            className="text-md font-semibold mt-2 mb-1 text-gray-700"
            {...props}
          />
        ),
        ul: ({ node, ...props }) => (
          <ul
            className="list-disc pl-5 mb-2 space-y-1 marker:text-gray-400"
            {...props}
          />
        ),
        ol: ({ node, ...props }) => (
          <ol
            className="list-decimal pl-5 mb-2 space-y-1 marker:text-gray-400"
            {...props}
          />
        ),
        li: ({ node, ...props }) => <li className="pl-1" {...props} />,
        table: ({ node, ...props }) => (
          <div className="overflow-x-auto my-3 rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200" {...props} />
          </div>
        ),
        thead: ({ node, ...props }) => (
          <thead className="bg-gray-50" {...props} />
        ),
        tbody: ({ node, ...props }) => (
          <tbody className="bg-white divide-y divide-gray-200" {...props} />
        ),
        tr: ({ node, ...props }) => (
          <tr className="hover:bg-gray-50 transition-colors" {...props} />
        ),
        th: ({ node, ...props }) => (
          <th
            className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            {...props}
          />
        ),
        td: ({ node, ...props }) => (
          <td
            className="px-3 py-2 whitespace-nowrap text-sm text-gray-600"
            {...props}
          />
        ),
        blockquote: ({ node, ...props }) => (
          <blockquote
            className="border-l-4 border-indigo-300 bg-indigo-50 pl-3 py-2 my-2 rounded-r-md text-gray-600 italic text-xs"
            {...props}
          />
        ),
        hr: ({ node, ...props }) => (
          <hr className="my-4 border-gray-200" {...props} />
        ),
        p: ({ node, ...props }) => (
          <p
            className="mb-2 last:mb-0 leading-relaxed text-gray-800"
            {...props}
          />
        ),
      }}
    >
      {String(content)}
    </ReactMarkdown>
  );
});

MarkdownRenderer.displayName = "MarkdownRenderer";
export default MarkdownRenderer;
