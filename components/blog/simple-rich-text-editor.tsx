'use client';

import React, { useEffect, useRef } from 'react';
import { Bold, Italic, List, ListOrdered, Quote, Heading2, Heading3, Link2, Pilcrow } from 'lucide-react';

interface SimpleRichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  resetKey?: string | number;
  placeholder?: string;
}

// A minimal, dependency-free WordPress-classic-style editor: one continuous
// contentEditable box plus a small formatting toolbar built on the browser's
// native execCommand. No block picker, no separate boxes per paragraph --
// the writer just types, and selects text to format it.
export function SimpleRichTextEditor({ value, onChange, resetKey, placeholder }: SimpleRichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const lastResetKey = useRef<string | number | undefined>(undefined);

  // Only overwrite the DOM content when we switch documents (resetKey changes),
  // never on every keystroke -- otherwise the caret jumps to the start on each render.
  useEffect(() => {
    if (editorRef.current && resetKey !== lastResetKey.current) {
      editorRef.current.innerHTML = value || '';
      lastResetKey.current = resetKey;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  const exec = (command: string, arg?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, arg);
    onChange(editorRef.current?.innerHTML || '');
  };

  const handleLink = () => {
    const url = window.prompt('Link URL');
    if (url) exec('createLink', url);
  };

  const isEmpty = !value || value === '<br>' || value === '<p></p>';

  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      <div className="flex flex-wrap items-center gap-0.5 p-1.5 border-b border-border bg-surface-2/40 sticky top-0 z-10">
        <ToolbarButton icon={Pilcrow} label="Paragraph" onClick={() => exec('formatBlock', '<p>')} />
        <ToolbarButton icon={Heading2} label="Heading 2" onClick={() => exec('formatBlock', '<h2>')} />
        <ToolbarButton icon={Heading3} label="Heading 3" onClick={() => exec('formatBlock', '<h3>')} />
        <div className="w-px h-4 bg-border mx-1" />
        <ToolbarButton icon={Bold} label="Bold" onClick={() => exec('bold')} />
        <ToolbarButton icon={Italic} label="Italic" onClick={() => exec('italic')} />
        <div className="w-px h-4 bg-border mx-1" />
        <ToolbarButton icon={List} label="Bullet list" onClick={() => exec('insertUnorderedList')} />
        <ToolbarButton icon={ListOrdered} label="Numbered list" onClick={() => exec('insertOrderedList')} />
        <ToolbarButton icon={Quote} label="Quote" onClick={() => exec('formatBlock', '<blockquote>')} />
        <ToolbarButton icon={Link2} label="Link" onClick={handleLink} />
      </div>
      <div className="relative">
        {isEmpty && placeholder && (
          <div className="pointer-events-none absolute top-4 left-4 text-xs text-text-tertiary">
            {placeholder}
          </div>
        )}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={() => onChange(editorRef.current?.innerHTML || '')}
          onBlur={() => onChange(editorRef.current?.innerHTML || '')}
          className="prose-editor min-h-[320px] max-h-[55vh] overflow-y-auto p-4 text-sm text-text-primary leading-relaxed focus:outline-none [&_h2]:text-lg [&_h2]:font-bold [&_h2]:font-display [&_h2]:mt-4 [&_h2]:mb-2 [&_h3]:text-base [&_h3]:font-bold [&_h3]:font-display [&_h3]:mt-3 [&_h3]:mb-1.5 [&_p]:mb-3 [&_blockquote]:border-l-4 [&_blockquote]:border-brand [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-text-secondary [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:text-brand [&_a]:underline"
        />
      </div>
    </div>
  );
}

function ToolbarButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      // Prevent the editor from losing selection/focus before the command runs
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="p-1.5 rounded hover:bg-surface-2 text-text-secondary hover:text-text-primary transition-colors"
    >
      <Icon className="w-3.5 h-3.5" />
    </button>
  );
}
