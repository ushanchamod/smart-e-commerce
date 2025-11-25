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
  return (
    <ReactMarkdown
      // className="prose prose-sm max-w-none text-gray-800 leading-relaxed"
      remarkPlugins={[remarkGfm]}
      components={{
        code: CodeBlock,
        h1: (props) => (
          <h1
            className="text-2xl font-bold mt-5 mb-3 pb-2 border-b-2 border-blue-500"
            {...props}
          />
        ),
        h2: (props) => (
          <h2
            className="text-xl font-bold mt-5 mb-3 pb-2 border-b-2 border-gray-300"
            {...props}
          />
        ),
        h3: (props) => (
          <h3
            className="text-lg font-bold mt-4 mb-2 pb-1 border-b border-gray-200"
            {...props}
          />
        ),
        ul: (props) => <ul className="list-disc pl-5 space-y-1" {...props} />,
        ol: (props) => (
          <ol className="list-decimal pl-5 space-y-1" {...props} />
        ),
        a: (props) => (
          <a
            className="text-blue-600 hover:text-blue-800 underline"
            target="_blank"
            rel="noopener noreferrer"
            {...props}
          />
        ),
        blockquote: (props) => (
          <blockquote
            className="border-l-4 border-blue-400 bg-blue-50 pl-4 py-3 my-3 italic text-gray-700"
            {...props}
          />
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
});

MarkdownRenderer.displayName = "MarkdownRenderer";
export default MarkdownRenderer;
