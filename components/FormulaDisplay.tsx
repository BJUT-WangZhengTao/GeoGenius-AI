import React, { useEffect, useRef } from 'react';
import katex from 'katex';

interface FormulaDisplayProps {
  latex: string;
  block?: boolean;
  className?: string;
}

const FormulaDisplay: React.FC<FormulaDisplayProps> = ({ latex, block = false, className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      try {
        katex.render(latex, containerRef.current, {
          throwOnError: false,
          displayMode: block,
        });
      } catch (error) {
        console.error("KaTeX render error:", error);
        containerRef.current.innerText = latex;
      }
    }
  }, [latex, block]);

  return <div ref={containerRef} className={`${className} ${block ? 'my-2' : 'inline-block'}`} />;
};

export default React.memo(FormulaDisplay);