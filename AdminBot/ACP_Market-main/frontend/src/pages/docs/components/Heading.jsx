import { Link as LinkIcon } from 'lucide-react';

export default function Heading({ level = 2, id, children }) {
  const Tag = `h${level}`;
  const sizes = {
    1: 'text-2xl font-bold',
    2: 'text-xl font-semibold mt-10 mb-4',
    3: 'text-base font-semibold mt-8 mb-3',
    4: 'text-sm font-semibold mt-6 mb-2',
  };

  return (
    <Tag id={id} className={`${sizes[level] || sizes[2]} text-text-primary group scroll-mt-20`}>
      {children}
      {id && (
        <a href={`#${id}`} className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity inline-block align-middle">
          <LinkIcon className="w-4 h-4 text-text-tertiary hover:text-primary" />
        </a>
      )}
    </Tag>
  );
}
