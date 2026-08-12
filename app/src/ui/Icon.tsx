import type { SVGProps } from 'react';

export type IconName =
  | 'add'
  | 'arrow-left'
  | 'arrow-right'
  | 'check'
  | 'chevron-down'
  | 'compress'
  | 'download'
  | 'edit'
  | 'file'
  | 'grid'
  | 'image'
  | 'lock'
  | 'merge'
  | 'more'
  | 'preview'
  | 'search'
  | 'split'
  | 'text'
  | 'trash'
  | 'upload';

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number;
}

export function Icon({ name, size = 20, ...props }: IconProps) {
  const paths: Record<IconName, React.ReactNode> = {
    add: <><path d="M12 5v14M5 12h14" /></>,
    'arrow-left': <><path d="m15 18-6-6 6-6" /></>,
    'arrow-right': <><path d="m9 18 6-6-6-6" /></>,
    check: <><path d="m5 12 4 4L19 6" /></>,
    'chevron-down': <><path d="m6 9 6 6 6-6" /></>,
    compress: <><path d="m8 3 3 3-3 3M16 3l-3 3 3 3M8 21l3-3-3-3M16 21l-3-3 3-3" /></>,
    download: <><path d="M12 3v12m0 0 4-4m-4 4-4-4" /><path d="M5 21h14" /></>,
    edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" /></>,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6" /></>,
    grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    image: <><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></>,
    lock: <><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
    merge: <><path d="M7 3v4a5 5 0 0 0 5 5h5" /><path d="M7 21v-4a5 5 0 0 1 5-5" /><path d="m15 9 3 3-3 3" /></>,
    more: <><circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" /></>,
    preview: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    split: <><path d="M8 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3M16 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3M12 2v20" /></>,
    text: <><path d="M4 7V4h16v3M9 20h6M12 4v16" /></>,
    trash: <><path d="M3 6h18M8 6V4h8v2M19 6l-1 15H6L5 6M10 11v6M14 11v6" /></>,
    upload: <><path d="M12 21V9m0 0-4 4m4-4 4 4" /><path d="M5 3h14" /></>
  };

  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
